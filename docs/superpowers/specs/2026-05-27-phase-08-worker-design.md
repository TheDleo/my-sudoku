# Phase 8: Web Worker for Generation — Design

**Status:** Approved 2026-05-27. Ready for implementation plan.

**Goal:** Move `generate()` off the main thread and serve puzzles from a per-tier pre-generation cache so picking a difficulty in the UI feels instant.

## Background

Phase 7 shipped `generate(difficulty): Puzzle` in `src/generator/generate.ts`. On dev hardware it runs in ~300–700ms per puzzle. Calling it on the main thread freezes the UI for that duration. Phase 8 wraps it in a Web Worker plus a small main-thread client that maintains a 1-deep pre-generation cache per tier.

## Architecture

Two new files inside `src/generator/`:

- **`worker.ts`** — runs inside a `DedicatedWorkerGlobalScope`. Listens for `{ type: 'generate', difficulty }` messages, calls `generate(difficulty)`, and posts back either `{ type: 'puzzle', difficulty, puzzle }` or `{ type: 'error', difficulty, message }`. Processes requests in FIFO order on the worker's single thread.

- **`workerClient.ts`** — main-thread API. Exports a factory `createWorkerClient(workerLike?: WorkerLike)` returning a `WorkerClient` with shape `{ getPuzzle(difficulty): Promise<Puzzle>; terminate(): void }`. Accepts a `WorkerLike` (a `{ postMessage, onmessage, terminate }` shape) so unit tests can inject a fake; in production the entry point passes `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.

No changes to `src/generator/generate.ts` or any other Phase 1–7 file. `src/types.ts` already has `Puzzle` and `Difficulty`.

## Cache shape (inside workerClient)

Three small parallel maps keyed by `Difficulty`:

1. **`cache`** — one ready puzzle per tier (`Record<Difficulty, Puzzle | undefined>`). Depth fixed at 1.
2. **`pending`** — list of `{ resolve, reject }` for in-flight `getPuzzle()` calls that arrived while the cache was empty (`Record<Difficulty, Array<{ resolve, reject }>>`).
3. **`inflight`** — boolean flag per tier indicating an outstanding `generate` request to the worker. Prevents duplicate requests.

## Boot sequence

On `createWorkerClient()`:

1. Wire `workerLike.onmessage` to the dispatch function.
2. Post four `{ type: 'generate', difficulty }` messages — one per tier, in the order `easy`, `medium`, `hard`, `expert`.
3. Mark all four `inflight` flags true.

The worker processes them sequentially; each response populates `cache[tier]` and clears `inflight[tier]`. By the time the user picks a difficulty, every tier is usually warm.

## `getPuzzle(tier)` flow

```
function getPuzzle(tier):
  if cache[tier] is set:
    puzzle = cache[tier]; cache[tier] = undefined
    if not inflight[tier]:
      post { type: 'generate', difficulty: tier }
      inflight[tier] = true
    return Promise.resolve(puzzle)

  // cache miss
  if not inflight[tier]:
    post { type: 'generate', difficulty: tier }
    inflight[tier] = true
  return new Promise((resolve, reject) =>
    pending[tier].push({ resolve, reject }))
```

When the worker responds with `{ type: 'puzzle', difficulty, puzzle }`:

```
inflight[tier] = false
if pending[tier] is non-empty:
  // Hand the puzzle to all waiting callers (v1 design: they all get the same puzzle).
  for each waiter: waiter.resolve(puzzle)
  pending[tier] = []
  // Kick off the next generation to keep the slot warm
  post { type: 'generate', difficulty: tier }
  inflight[tier] = true
else:
  cache[tier] = puzzle
```

This ensures the cache is always populated when no one is waiting, and waiters never block on stale state.

## Message protocol

```ts
type ClientMessage = { type: 'generate'; difficulty: Difficulty };

type WorkerMessage =
  | { type: 'puzzle'; difficulty: Difficulty; puzzle: Puzzle }
  | { type: 'error'; difficulty: Difficulty; message: string };
```

No request IDs. Responses are tier-tagged; with cache depth 1, there is at most one outstanding request per tier at any time, so the tier tag is sufficient routing.

## Error handling

- If `generate()` inside the worker throws (e.g., `maxAttempts` exhaustion), the worker catches it and posts `{ type: 'error', difficulty, message: String(err) }`. The worker stays alive.
- On the client, an `'error'` response:
  - Clears `inflight[tier]`.
  - If `pending[tier]` is non-empty: reject every waiter with `new Error(message)` and clear the list. Do NOT auto-retry (the caller decides whether to retry).
  - If `pending[tier]` is empty: drop silently. The next `getPuzzle(tier)` call will trigger a fresh generate.
- Unhandled exceptions in the worker (parse failure, etc.) let the browser kill the worker. No auto-restart in v1; user can refresh.
- `client.terminate()` rejects all pending promises with `new Error('worker client terminated')` and calls `workerLike.terminate()`.

## Concurrency: simultaneous `getPuzzle(tier)` callers

If multiple `getPuzzle(tier)` calls arrive while the cache is empty and a generate is in flight, **all of them receive the same puzzle** when it lands. The very next request triggers a fresh generate. This is v1's simplification: realistic UI usage (a user clicks "new puzzle") will not produce concurrent calls for the same tier; the simultaneous case is a defensive contract, not a feature. Documented in workerClient.ts JSDoc.

## Testing

### Unit tests (`workerClient.test.ts`, vitest)

A `FakeWorker` test helper conforms to the `WorkerLike` interface and exposes test-driver methods:

```ts
class FakeWorker implements WorkerLike {
  postMessage(msg: ClientMessage): void; // records the request
  onmessage: ((ev: { data: WorkerMessage }) => void) | null = null;
  terminate(): void;
  // test-driver helpers:
  receivedMessages(): ClientMessage[];
  resolveNext(tier: Difficulty, puzzle: Puzzle): void; // simulates a 'puzzle' response
  rejectNext(tier: Difficulty, message: string): void; // simulates an 'error' response
}
```

Cases:

1. Construction posts exactly four `generate` messages (one per tier).
2. After `resolveNext('easy', somePuzzle)`, `getPuzzle('easy')` resolves immediately with that puzzle and a new `generate` for `easy` is posted.
3. `getPuzzle('easy')` called before any response returns a pending promise; calling `resolveNext('easy', p)` resolves it.
4. Two concurrent `getPuzzle('easy')` calls before any response both resolve with the same puzzle when `resolveNext('easy', p)` is called.
5. `rejectNext('easy', 'maxAttempts')` rejects pending `getPuzzle('easy')` with an `Error('maxAttempts')`; subsequent `getPuzzle('easy')` posts a fresh `generate`.
6. A `rejectNext` with no pending callers is a no-op; cache stays empty.
7. `terminate()` rejects any pending promises with `'worker client terminated'` and calls the worker's `terminate()`.

Real `generate()` is **not** invoked in unit tests. The fake fabricates `Puzzle`-shaped objects (`{ id, difficulty, initialBoard, solution }` with minimal valid data) using a small `makeFakePuzzle(tier)` helper.

### E2E test (`tests/e2e/worker.spec.ts`, Playwright)

One smoke test exercising a real Worker round-trip in a real browser:

- Loads the built app.
- Exposes the worker client factory on `window.__sudoku__` from `src/main.tsx`: `(window as Window & { __sudoku__?: { createWorkerClient: typeof createWorkerClient } }).__sudoku__ = { createWorkerClient }`. This is a harmless debug/test hook for a fully client-side app; no security gate needed. Document the field in `main.tsx` so a future maintainer knows it exists for tooling and is safe to remove if `__sudoku__` ever grows unbounded.
- Awaits `window.__sudoku__.createWorkerClient().getPuzzle('easy')` (with a 5s Playwright `waitForFunction` timeout), asserts the result is shaped `{ id: string, difficulty: 'easy', initialBoard: 9x9, solution: 9x9 }`.

This is the only test that exercises the real Worker. `worker.ts` itself is too thin to need unit tests beyond what the e2e covers.

## TypeScript & build considerations

- `worker.ts` references `self.onmessage` and `self.postMessage`, which require the `WebWorker` lib. The project's current `tsconfig.app.json` includes `["DOM", "DOM.Iterable", "ESNext"]`; add `"WebWorker"` to the lib array (one-line tsconfig change verified during the first implementation task).
- Vite handles worker bundling automatically via `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`. No new plugin or build-config change required.

## Public API surface (for Phase 9)

`workerClient.ts` exports:

```ts
export type WorkerLike = {
  postMessage(msg: ClientMessage): void;
  onmessage: ((ev: { data: WorkerMessage }) => void) | null;
  terminate(): void;
};

export type WorkerClient = {
  getPuzzle(difficulty: Difficulty): Promise<Puzzle>;
  terminate(): void;
};

export type ClientMessage = { type: 'generate'; difficulty: Difficulty };
export type WorkerMessage =
  | { type: 'puzzle'; difficulty: Difficulty; puzzle: Puzzle }
  | { type: 'error'; difficulty: Difficulty; message: string };

export function createWorkerClient(workerLike?: WorkerLike): WorkerClient;
```

When called with no argument, `createWorkerClient()` constructs a real Worker. Phase 9 calls it once during app bootstrap and stores the result in the Zustand store (or a module-level singleton — Phase 9 decides).

## Out of scope (deferred)

- Worker restart after fatal crash. Manual page refresh in v1.
- Worker pool / parallel generation. Single worker is enough at current latencies.
- Cache persistence to `localStorage`. Would defeat the "fresh random puzzle" purpose.
- Configurable cache depth. Hardcoded to 1.
- Difficulty-downgrade-on-timeout policy mentioned in PLAN.md §8 open items. Defer to a follow-up phase.

## Acceptance criteria

- `npm test -- --run` — all tests pass, including the new `workerClient.test.ts` (~7 tests).
- `npm run typecheck` — clean, including the added `WebWorker` lib entry.
- `npm run test:e2e` — Playwright smoke test passes; `getPuzzle('easy')` returns a valid `Puzzle` via a real Worker.
- No changes to `src/generator/generate.ts` or any other Phase 1–7 source file.
- No regressions in any earlier-phase test (202 prior tests still green).
