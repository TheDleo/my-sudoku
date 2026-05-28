# Phase 8: Web Worker for Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap Phase 7's `generate()` in a Web Worker and expose a main-thread `WorkerClient` with a 1-deep per-tier pre-generation cache so picking a difficulty in the UI feels instant.

**Architecture:** Two new files in `src/generator/`. `worker.ts` runs inside a `DedicatedWorkerGlobalScope`, calls `generate(difficulty)`, posts results back. `workerClient.ts` is the main-thread API: takes a `WorkerLike` (so unit tests inject a fake), keeps a 1-slot cache + pending-promise list + in-flight flag per tier, posts 4 boot-time generate requests, and serves `getPuzzle()` either from cache or by awaiting the worker. One tsconfig change adds the `WebWorker` lib. One Playwright smoke test exercises a real Worker round-trip.

**Tech Stack:** Vite module workers, TypeScript strict mode (`noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), Vitest for unit tests, Playwright for e2e.

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design spec:** `docs/superpowers/specs/2026-05-27-phase-08-worker-design.md` (commit `8d8b39c`).

**Design notes — locked in before tasks:**

- Cache depth = 1 per tier. Hardcoded; not configurable in v1.
- Eager prefill: boot posts 4 generate messages (easy → medium → hard → expert) at `createWorkerClient()` construction.
- `WorkerLike` interface (`{ postMessage, onmessage, terminate }`) is injected so unit tests use a fake; production passes a real `Worker`.
- No request IDs; responses are tier-tagged. With cache depth 1 there is at most one in-flight generate per tier.
- On `'puzzle'` response: if waiters pending, resolve them all with the same puzzle AND post another generate to keep the slot warm; otherwise fill the cache slot.
- On `'error'` response: if waiters pending, reject them all with `new Error(message)` and DO NOT auto-retry; otherwise drop silently.
- `terminate()` rejects all pending promises with `new Error('worker client terminated')` and calls `workerLike.terminate()`. Post-terminate `getPuzzle` behavior is undefined (the caller shouldn't).
- No changes to `src/generator/generate.ts` or anything in Phase 1–7.

---

## Task 1: Worker file and tsconfig lib

**Files:**

- Modify: `tsconfig.app.json` (add `"WebWorker"` to `lib`)
- Create: `src/generator/worker.ts`

This task adds the worker script and the TS lib entry it needs. No unit test — the worker is too thin (it's just a `try`/`catch` wrapping `generate`). It is exercised by the Playwright smoke test in Task 5.

- [ ] **Step 1: Add the `WebWorker` lib to `tsconfig.app.json`.**

Change line 5 from:

```json
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
```

to:

```json
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
```

- [ ] **Step 2: Create `src/generator/worker.ts`.**

```ts
import type { Difficulty } from '../types';
import { generate } from './generate';

type ClientMessage = { type: 'generate'; difficulty: Difficulty };

self.onmessage = (event: MessageEvent<ClientMessage>) => {
  const { difficulty } = event.data;
  try {
    const puzzle = generate(difficulty);
    self.postMessage({ type: 'puzzle', difficulty, puzzle });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', difficulty, message });
  }
};
```

- [ ] **Step 3: Run typecheck to verify the worker compiles.**

Run: `npm run typecheck`
Expected: clean, no errors. The `self.onmessage` / `self.postMessage` overloads now resolve from the `WebWorker` lib entry.

- [ ] **Step 4: Run the full test suite to verify no regressions.**

Run: `npm test -- --run`
Expected: 202 tests pass (unchanged from Phase 7).

- [ ] **Step 5: Commit.**

```bash
git add tsconfig.app.json src/generator/worker.ts
git commit -m "feat(generator): add worker script and enable WebWorker lib"
```

---

## Task 2: workerClient — types, FakeWorker test helper, boot

**Files:**

- Create: `src/generator/workerClient.ts`
- Create: `src/generator/workerClient.test.ts`

This task introduces the shared message types, the `WorkerLike` interface, the `FakeWorker` test helper, and the boot sequence (posts 4 generate messages at construction). It does NOT implement `getPuzzle` or any response dispatch yet — that's Task 3.

- [ ] **Step 1: Write the failing test.**

Create `src/generator/workerClient.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Difficulty, Digit, Puzzle } from '../types';
import {
  createWorkerClient,
  type ClientMessage,
  type WorkerLike,
  type WorkerMessage,
} from './workerClient';

const TIERS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function makeFakePuzzle(difficulty: Difficulty): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  const solution: Digit[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => 1 as Digit),
  );
  return { id: `fake-${difficulty}`, difficulty, initialBoard, solution };
}

class FakeWorker implements WorkerLike {
  private readonly messages: ClientMessage[] = [];
  public terminated = false;
  public onmessage: ((ev: { data: WorkerMessage }) => void) | null = null;

  postMessage(msg: ClientMessage): void {
    this.messages.push(msg);
  }

  terminate(): void {
    this.terminated = true;
  }

  receivedMessages(): ReadonlyArray<ClientMessage> {
    return this.messages;
  }

  resolveNext(tier: Difficulty, puzzle: Puzzle): void {
    this.onmessage?.({ data: { type: 'puzzle', difficulty: tier, puzzle } });
  }

  rejectNext(tier: Difficulty, message: string): void {
    this.onmessage?.({ data: { type: 'error', difficulty: tier, message } });
  }
}

describe('createWorkerClient', () => {
  it('posts one generate message per tier on construction', () => {
    const fake = new FakeWorker();
    createWorkerClient(fake);
    expect(fake.receivedMessages()).toEqual(
      TIERS.map((tier) => ({ type: 'generate', difficulty: tier })),
    );
  });
});
```

`FakeWorker`, `makeFakePuzzle`, and `TIERS` are file-scope; Tasks 3 and 4 will append more `it(...)` blocks inside the same `describe` and reuse them directly.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/generator/workerClient.test.ts`
Expected: FAIL — `createWorkerClient`, `ClientMessage`, `WorkerMessage`, `WorkerLike` not exported (module not found / missing exports).

- [ ] **Step 3: Create `src/generator/workerClient.ts`.**

```ts
import type { Difficulty, Puzzle } from '../types';

export type ClientMessage = { type: 'generate'; difficulty: Difficulty };

export type WorkerMessage =
  | { type: 'puzzle'; difficulty: Difficulty; puzzle: Puzzle }
  | { type: 'error'; difficulty: Difficulty; message: string };

export type WorkerLike = {
  postMessage(msg: ClientMessage): void;
  onmessage: ((ev: { data: WorkerMessage }) => void) | null;
  terminate(): void;
};

export type WorkerClient = {
  getPuzzle(difficulty: Difficulty): Promise<Puzzle>;
  terminate(): void;
};

const TIERS: ReadonlyArray<Difficulty> = ['easy', 'medium', 'hard', 'expert'];

/**
 * Creates a main-thread client that delegates puzzle generation to a Web
 * Worker and maintains a 1-deep pre-generation cache per difficulty tier.
 *
 * At construction the client posts one `generate` request per tier so that
 * by the time the user picks a difficulty, every tier is likely warm.
 *
 * When several `getPuzzle(tier)` calls arrive while the cache is empty and
 * a generate is in flight, all of them resolve with the same puzzle when
 * it lands; the next call triggers a fresh generate. This is a defensive
 * contract — realistic UI usage never produces concurrent same-tier calls.
 *
 * Pass `workerLike` for tests; in production omit it and the factory will
 * construct a real Worker.
 */
export function createWorkerClient(workerLike?: WorkerLike): WorkerClient {
  const worker: WorkerLike =
    workerLike ??
    (new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as WorkerLike);

  function postGenerate(tier: Difficulty): void {
    worker.postMessage({ type: 'generate', difficulty: tier });
  }

  // Boot: kick off one generation per tier.
  for (const tier of TIERS) {
    postGenerate(tier);
  }

  return {
    getPuzzle(): Promise<Puzzle> {
      throw new Error('not implemented'); // Implemented in Task 3.
    },
    terminate(): void {
      worker.terminate(); // Full implementation in Task 4.
    },
  };
}
```

- [ ] **Step 4: Run the test to verify GREEN.**

Run: `npm test -- --run src/generator/workerClient.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Run the full test suite + typecheck.**

Run: `npm test -- --run && npm run typecheck`
Expected: 203 tests pass total (was 202 in Phase 7; +1 from this task). Typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/generator/workerClient.ts src/generator/workerClient.test.ts
git commit -m "feat(generator): add workerClient skeleton with boot-time prefill"
```

---

## Task 3: workerClient — cache, pending, dispatch

**Files:**

- Modify: `src/generator/workerClient.ts`
- Modify: `src/generator/workerClient.test.ts` (append tests)

This task implements `getPuzzle` (both cached and pending paths), the `onmessage` dispatch for `'puzzle'` responses, and the in-flight flag. Three tests are added:

1. After a `'puzzle'` response, `getPuzzle(tier)` resolves immediately with the cached puzzle AND a fresh generate is posted.
2. `getPuzzle(tier)` called before any response returns a pending promise; the promise resolves when the worker responds.
3. Two concurrent `getPuzzle(tier)` calls before any response both resolve with the same puzzle.

- [ ] **Step 1: Append the new tests to `src/generator/workerClient.test.ts`** (inside the existing `describe('createWorkerClient', ...)` block, after the existing test):

```ts
it('getPuzzle returns the cached puzzle immediately and posts a refill', async () => {
  const fake = new FakeWorker();
  const client = createWorkerClient(fake);
  const easyPuzzle = makeFakePuzzle('easy');
  fake.resolveNext('easy', easyPuzzle);

  await expect(client.getPuzzle('easy')).resolves.toBe(easyPuzzle);

  // Boot posted 4; the cached-hit refill posts a 5th targeting 'easy'.
  expect(fake.receivedMessages()).toEqual([
    { type: 'generate', difficulty: 'easy' },
    { type: 'generate', difficulty: 'medium' },
    { type: 'generate', difficulty: 'hard' },
    { type: 'generate', difficulty: 'expert' },
    { type: 'generate', difficulty: 'easy' },
  ]);
});

it('getPuzzle on a cold tier returns a pending promise resolved by the next response', async () => {
  const fake = new FakeWorker();
  const client = createWorkerClient(fake);
  const promise = client.getPuzzle('medium');
  const mediumPuzzle = makeFakePuzzle('medium');
  fake.resolveNext('medium', mediumPuzzle);
  await expect(promise).resolves.toBe(mediumPuzzle);
});

it('two concurrent getPuzzle calls for the same tier resolve with the same puzzle', async () => {
  const fake = new FakeWorker();
  const client = createWorkerClient(fake);
  const a = client.getPuzzle('hard');
  const b = client.getPuzzle('hard');
  const hardPuzzle = makeFakePuzzle('hard');
  fake.resolveNext('hard', hardPuzzle);
  const [pa, pb] = await Promise.all([a, b]);
  expect(pa).toBe(hardPuzzle);
  expect(pb).toBe(hardPuzzle);
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm test -- --run src/generator/workerClient.test.ts`
Expected: 3 new tests FAIL (`getPuzzle` throws `'not implemented'`). 1 existing test PASS.

- [ ] **Step 3: Rewrite `src/generator/workerClient.ts`** to implement the cache + dispatch logic. Replace the entire `createWorkerClient` function with this implementation (keep the types and the doc comment block exactly as they are):

```ts
export function createWorkerClient(workerLike?: WorkerLike): WorkerClient {
  const worker: WorkerLike =
    workerLike ??
    (new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as WorkerLike);

  type Waiter = { resolve: (p: Puzzle) => void; reject: (e: Error) => void };
  const cache: Record<Difficulty, Puzzle | undefined> = {
    easy: undefined,
    medium: undefined,
    hard: undefined,
    expert: undefined,
  };
  const pending: Record<Difficulty, Waiter[]> = {
    easy: [],
    medium: [],
    hard: [],
    expert: [],
  };
  const inflight: Record<Difficulty, boolean> = {
    easy: false,
    medium: false,
    hard: false,
    expert: false,
  };

  function postGenerate(tier: Difficulty): void {
    worker.postMessage({ type: 'generate', difficulty: tier });
    inflight[tier] = true;
  }

  function dispatch(msg: WorkerMessage): void {
    const tier = msg.difficulty;
    inflight[tier] = false;
    if (msg.type === 'puzzle') {
      const waiters = pending[tier];
      if (waiters.length > 0) {
        for (const w of waiters) w.resolve(msg.puzzle);
        pending[tier] = [];
        postGenerate(tier); // keep the slot warm for next time
      } else {
        cache[tier] = msg.puzzle;
      }
    } else {
      // 'error' — Task 4 fills this branch in
    }
  }

  worker.onmessage = (ev) => dispatch(ev.data);

  for (const tier of TIERS) {
    postGenerate(tier);
  }

  return {
    getPuzzle(tier: Difficulty): Promise<Puzzle> {
      const cached = cache[tier];
      if (cached !== undefined) {
        cache[tier] = undefined;
        if (!inflight[tier]) postGenerate(tier);
        return Promise.resolve(cached);
      }
      if (!inflight[tier]) postGenerate(tier);
      return new Promise<Puzzle>((resolve, reject) => {
        pending[tier].push({ resolve, reject });
      });
    },
    terminate(): void {
      worker.terminate(); // Full implementation in Task 4.
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify GREEN.**

Run: `npm test -- --run src/generator/workerClient.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full test suite + typecheck.**

Run: `npm test -- --run && npm run typecheck`
Expected: 206 tests pass (203 + 3). Typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/generator/workerClient.ts src/generator/workerClient.test.ts
git commit -m "feat(generator): add workerClient cache and pending-promise dispatch"
```

---

## Task 4: workerClient — error handling and terminate

**Files:**

- Modify: `src/generator/workerClient.ts`
- Modify: `src/generator/workerClient.test.ts` (append tests)

Fills in the `'error'` branch of dispatch and implements `terminate()` fully. Three tests added:

1. An error response rejects every pending caller of that tier with `new Error(message)`; a subsequent `getPuzzle(tier)` posts a fresh generate.
2. An error response with no pending callers is a silent no-op (cache stays empty, no exception thrown).
3. `terminate()` rejects every pending promise with `Error('worker client terminated')` AND calls `worker.terminate()`.

- [ ] **Step 1: Append the new tests to `src/generator/workerClient.test.ts`** (inside the existing `describe('createWorkerClient', ...)` block):

```ts
it('rejects pending callers on an error response and retries on the next getPuzzle', async () => {
  const fake = new FakeWorker();
  const client = createWorkerClient(fake);
  const promise = client.getPuzzle('expert');
  fake.rejectNext('expert', 'maxAttempts');
  await expect(promise).rejects.toThrow('maxAttempts');

  // Next getPuzzle should post a fresh generate (boot did 4, this is the 5th).
  const retry = client.getPuzzle('expert');
  expect(fake.receivedMessages()).toEqual([
    { type: 'generate', difficulty: 'easy' },
    { type: 'generate', difficulty: 'medium' },
    { type: 'generate', difficulty: 'hard' },
    { type: 'generate', difficulty: 'expert' },
    { type: 'generate', difficulty: 'expert' },
  ]);

  // Make the retry resolve so we don't leak a hanging promise.
  const puzzle = makeFakePuzzle('expert');
  fake.resolveNext('expert', puzzle);
  await expect(retry).resolves.toBe(puzzle);
});

it('drops an error response silently when there are no pending callers', () => {
  const fake = new FakeWorker();
  createWorkerClient(fake);
  expect(() => fake.rejectNext('easy', 'transient')).not.toThrow();
  // No state to assert beyond "did not throw" — silent drop is the spec.
});

it('terminate rejects pending promises and calls the worker terminate', async () => {
  const fake = new FakeWorker();
  const client = createWorkerClient(fake);
  const pending = client.getPuzzle('medium');
  client.terminate();
  await expect(pending).rejects.toThrow('worker client terminated');
  expect(fake.terminated).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify the first two fail and the third partially fails.**

Run: `npm test -- --run src/generator/workerClient.test.ts`
Expected: the first new test FAILS (`getPuzzle` resolves instead of rejecting because the 'error' branch is empty). The "drops silently" test passes (it only asserts no throw). The terminate test FAILS (pending isn't rejected). Total: 5 pass, 2 fail.

- [ ] **Step 3: Update the dispatch function and the returned `terminate` in `src/generator/workerClient.ts`.**

In `dispatch`, replace the entire `else` branch (the one currently containing just the `// 'error' — Task 4 fills this branch in` comment) with the fully-implemented error branch below. The surrounding `if (msg.type === 'puzzle') { ... } else { ... }` shape stays; only the `else` block's contents change:

```ts
    } else {
      const waiters = pending[tier];
      if (waiters.length > 0) {
        const err = new Error(msg.message);
        for (const w of waiters) w.reject(err);
        pending[tier] = [];
      }
      // else: no waiters — drop silently. Next getPuzzle will retry.
    }
```

In the returned object, replace the `terminate` method with:

```ts
    terminate(): void {
      worker.terminate();
      const err = new Error('worker client terminated');
      for (const tier of TIERS) {
        for (const w of pending[tier]) w.reject(err);
        pending[tier] = [];
      }
    },
```

- [ ] **Step 4: Run the tests to verify GREEN.**

Run: `npm test -- --run src/generator/workerClient.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full test suite + typecheck.**

Run: `npm test -- --run && npm run typecheck`
Expected: 209 tests pass (206 + 3). Typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/generator/workerClient.ts src/generator/workerClient.test.ts
git commit -m "feat(generator): add workerClient error and terminate handling"
```

---

## Task 5: Main-thread hook and Playwright smoke test

**Files:**

- Modify: `src/main.tsx`
- Create: `tests/e2e/worker.spec.ts`

This task connects the real `Worker` to the page and exercises a round-trip through the smoke test.

- [ ] **Step 1: Add the `__sudoku__` debug hook to `src/main.tsx`.**

Replace the contents of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createWorkerClient } from './generator/workerClient';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Debug/test hook: exposes the worker client factory for Playwright tests and
// manual experimentation. Harmless in a fully client-side app; safe to remove
// if __sudoku__ ever grows beyond debug use.
declare global {
  interface Window {
    __sudoku__?: { createWorkerClient: typeof createWorkerClient };
  }
}
window.__sudoku__ = { createWorkerClient };

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 2: Run typecheck.**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Create `tests/e2e/worker.spec.ts`.**

```ts
import { test, expect } from '@playwright/test';

test('worker client returns a valid easy puzzle via a real Worker', async ({ page }) => {
  await page.goto('/');

  // Wait until the bootstrap hook has installed itself.
  await page.waitForFunction(() => typeof window.__sudoku__?.createWorkerClient === 'function');

  const result = await page.evaluate(async () => {
    const client = window.__sudoku__!.createWorkerClient();
    try {
      const puzzle = await client.getPuzzle('easy');
      return {
        id: puzzle.id,
        difficulty: puzzle.difficulty,
        boardRows: puzzle.initialBoard.length,
        boardCols: puzzle.initialBoard[0]?.length ?? 0,
        solutionRows: puzzle.solution.length,
        solutionCols: puzzle.solution[0]?.length ?? 0,
      };
    } finally {
      client.terminate();
    }
  });

  expect(typeof result.id).toBe('string');
  expect(result.difficulty).toBe('easy');
  expect(result.boardRows).toBe(9);
  expect(result.boardCols).toBe(9);
  expect(result.solutionRows).toBe(9);
  expect(result.solutionCols).toBe(9);
});

declare global {
  interface Window {
    __sudoku__?: {
      createWorkerClient: () => {
        getPuzzle: (d: 'easy' | 'medium' | 'hard' | 'expert') => Promise<{
          id: string;
          difficulty: 'easy' | 'medium' | 'hard' | 'expert';
          initialBoard: ReadonlyArray<ReadonlyArray<number | null>>;
          solution: ReadonlyArray<ReadonlyArray<number>>;
        }>;
        terminate: () => void;
      };
    };
  }
}
```

- [ ] **Step 4: Run Playwright e2e tests.**

Run: `npm run test:e2e`
Expected: both Playwright tests pass — the existing `renders Sudoku heading` smoke test and the new `worker client returns a valid easy puzzle via a real Worker`. The webServer in `playwright.config.ts` does `npm run build && npm run preview` which exercises the real bundled worker.

If the e2e test times out at the `waitForFunction` step: confirm the `__sudoku__` hook is installed BEFORE `createRoot(...)` renders. The current placement (line above the createRoot call) is intentional for this reason.

If the e2e test fails because `getPuzzle('easy')` exceeds the default Playwright assertion timeout (5s): bump the per-test timeout via `test.setTimeout(15_000)` at the top of the `test(...)` block. `generate('easy')` typically completes in well under 1s, so this should not be needed.

- [ ] **Step 5: Run the full unit-test suite + typecheck one more time to confirm nothing regressed.**

Run: `npm test -- --run && npm run typecheck`
Expected: 209 tests pass. Typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/main.tsx tests/e2e/worker.spec.ts
git commit -m "feat(app): wire workerClient into main and add e2e smoke test"
```

---

## Acceptance criteria (final)

- [ ] `npm test -- --run` — 209 tests pass (was 202 after Phase 7; +7 across workerClient.test.ts).
- [ ] `npm run typecheck` — clean.
- [ ] `npm run test:e2e` — 2 tests pass (the existing heading smoke test and the new worker round-trip).
- [ ] `createWorkerClient()` constructs without throwing in a real browser; `getPuzzle('easy')` returns a valid `Puzzle` via the real Worker.
- [ ] No changes to `src/generator/generate.ts`, `src/types.ts`, or any other Phase 1–7 source file.
- [ ] No regressions in any earlier-phase test.
- [ ] All new TS files compile under `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true`.
