# Phase 9: Game Store and Reducers — Design

**Status:** Approved 2026-05-27. Ready for implementation plan.

**Goal:** Stand up the Zustand game store with pure reducers, snapshot-based undo/redo, and localStorage auto-save. Phase 9 is the skeleton; Phases 11, 13, 17, and 19 will extend it.

## Background

PLAN.md §1.13 sketches the game state. PLAN.md §9 names the deliverables. Many design decisions were locked in during §1 of PLAN.md (Zustand chosen, single-slot localStorage, unbounded undo, conflict detection is rule-violation-only, settings store separate from game store). This document fills in the remaining decisions.

## Module structure

Four new files under `src/game/`:

- **`types.ts`** — `GameState`, `GameSnapshot`, and action argument types.
- **`reducers.ts`** — pure functions, one per action: `(state, args?) => GameState`. No Zustand, no side effects. Also exports a `withSnapshot` helper that wraps mutating reducers to push the pre-action snapshot onto `history.past`.
- **`store.ts`** — Zustand store factory. Each store action is a thin wrapper around a pure reducer; mutating actions go through `withSnapshot`. A self-subscription drives `save()` on persisted-field changes.
- **`persistence.ts`** — `serialize(state)`, `deserialize(json)`, `load()`, `save(state)`. Handles `Set<Digit> ↔ number[]`. No Zustand coupling.

Companion tests: `reducers.test.ts`, `persistence.test.ts`, `store.test.ts`.

No changes to existing files. `App.tsx` does not consume the store yet — Phase 21's landing screen will be the first consumer.

## State shape

```ts
type GameState = {
  puzzle: Puzzle; // immutable per game
  cells: Cell[][]; // 9x9 mutable
  given: boolean[][]; // 9x9 immutable per game
  selection: { cell: CellCoord | null; number: Digit | null }; // NOT in snapshot, NOT persisted
  pencilMode: boolean; // in snapshot
  mistakes: number; // forward-compat slot; no Phase 9 reducer modifies it
  elapsedMs: number; // forward-compat slot; no Phase 9 reducer modifies it
  history: { past: GameSnapshot[]; future: GameSnapshot[] };
};

type GameSnapshot = {
  cells: Cell[][];
  pencilMode: boolean;
};
```

Phases 11/19 will modify `mistakes` and `elapsedMs`. Keeping the slots in Phase 9 avoids a breaking-change migration later.

## Action set

All reducers are pure: `(state, args?) => GameState`. Reducers that don't change anything return the same reference (no-op).

| Action                            | Snapshot?  | Notes                                                                                                                                                                                                                  |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadPuzzle(state, puzzle)`       | **clears** | Rebuilds cells/given from `puzzle.initialBoard`; clears selection; resets pencilMode/mistakes/elapsedMs to defaults; clears `past` and `future`.                                                                       |
| `selectCell(state, coord)`        | no         | Sets/clears `selection.cell`. Preserves `selection.number`.                                                                                                                                                            |
| `setSelectedNumber(state, digit)` | no         | Sets/clears `selection.number`.                                                                                                                                                                                        |
| `placeDigit(state, digit)`        | yes        | No-op if no cell selected or cell is given. Sets `cells[r][c].value = digit`. Phase 9 does NOT auto-remove peer pencil marks (Phase 13 owns). Phase 9 does NOT increment `mistakes` on rule violation (Phase 19 owns). |
| `eraseCell(state)`                | yes        | No-op if no cell selected or cell is given. If `cells[r][c].value !== null` → clear value. Else if `pencilMarks.size > 0` → clear all pencil marks. Else: no-op.                                                       |
| `togglePencilMark(state, digit)`  | yes        | No-op if no cell selected, cell is given, or cell has a value. Toggles digit in `pencilMarks`.                                                                                                                         |
| `togglePencilMode(state)`         | yes        | Flips `pencilMode`. PLAN.md §1.6 treats every user action as an undo step.                                                                                                                                             |
| `undo(state)`                     | special    | If `past.length === 0` → no-op. Pop `past`, push current snapshot onto `future`, restore the popped snapshot. Selection preserved.                                                                                     |
| `redo(state)`                     | special    | Symmetric. If `future.length === 0` → no-op.                                                                                                                                                                           |

**Selection actions do not push snapshots.** Undoing your last placement (not your last cursor move) is the consistent expectation.

**Givens are immutable.** `placeDigit`, `eraseCell`, `togglePencilMark` all enforce this at the reducer level. The UI layer doesn't have to police it.

## Undo/redo model

Snapshot-based. Each mutating action pushes the pre-action snapshot onto `history.past`; redo is cleared on any new mutating action.

`withSnapshot` (lives in `reducers.ts` next to the pure reducers):

```ts
function withSnapshot(state: GameState, mutate: (s: GameState) => GameState): GameState {
  const snapshot: GameSnapshot = { cells: cloneCells(state.cells), pencilMode: state.pencilMode };
  const next = mutate(state);
  if (next === state) return state; // no-op guard — don't pollute history
  return {
    ...next,
    history: { past: [...state.history.past, snapshot], future: [] },
  };
}
```

`undo`:

```ts
export function undo(state: GameState): GameState {
  if (state.history.past.length === 0) return state;
  const snapshot = state.history.past[state.history.past.length - 1]!;
  const current: GameSnapshot = { cells: cloneCells(state.cells), pencilMode: state.pencilMode };
  return {
    ...state,
    cells: snapshot.cells,
    pencilMode: snapshot.pencilMode,
    history: {
      past: state.history.past.slice(0, -1),
      future: [...state.history.future, current],
    },
  };
}
```

`redo` is symmetric.

**Invariants:**

- `past` and `future` are immutable arrays; reducers always return new arrays on change.
- Reducers that no-op return the same `state` reference, so `withSnapshot`'s identity check prevents history pollution.
- `loadPuzzle` is the only action that clears both `past` and `future` (undo across puzzles is meaningless).

**Memory cost:** ~1KB per snapshot for a 9x9 board with `Cell[][]`. Unbounded depth is trivially cheap; no cap.

## Store wiring

```ts
import { create } from 'zustand';

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialEmptyState,

  loadPuzzle: (puzzle) => set((s) => reducers.loadPuzzle(s, puzzle)),
  selectCell: (coord) => set((s) => reducers.selectCell(s, coord)),
  setSelectedNumber: (n) => set((s) => reducers.setSelectedNumber(s, n)),

  placeDigit: (d) => set((s) => withSnapshot(s, (st) => reducers.placeDigit(st, d))),
  eraseCell: () => set((s) => withSnapshot(s, reducers.eraseCell)),
  togglePencilMark: (d) => set((s) => withSnapshot(s, (st) => reducers.togglePencilMark(st, d))),
  togglePencilMode: () => set((s) => withSnapshot(s, reducers.togglePencilMode)),

  undo: () => set(reducers.undo),
  redo: () => set(reducers.redo),
}));
```

`initialEmptyState` is a concrete sentinel `GameState` (not `null`/`undefined`) so the store's type is always `GameState`:

```ts
const initialEmptyState: GameState = {
  puzzle: {
    id: '',
    difficulty: 'easy',
    initialBoard: empty9x9(null),
    solution: empty9x9(1 as Digit),
  },
  cells: empty9x9(() => ({ value: null, pencilMarks: new Set<Digit>() })),
  given: empty9x9(false),
  selection: { cell: null, number: null },
  pencilMode: false,
  mistakes: 0,
  elapsedMs: 0,
  history: { past: [], future: [] },
};
```

(`empty9x9(value)` is a small local helper that returns a 9x9 array filled with the given value or the result of a factory.)

Mutating actions called against the sentinel state are well-defined no-ops: every cell is empty, every cell is not given, and `selection.cell` is `null` — so `placeDigit`, `eraseCell`, and `togglePencilMark` all hit their "no selection" guard and return the state reference unchanged. The store never enters an undefined-behavior regime. Phase 21's bootstrap will replace the sentinel with a real puzzle via `loadPuzzle` before mounting the board.

## Persistence

`persistence.ts` is the only file with `localStorage` access.

```ts
const STORAGE_KEY = 'my-sudoku.game';

type SerializedCell = { value: Digit | null; pencilMarks: number[] };
type SerializedState = {
  puzzle: Puzzle;
  cells: SerializedCell[][];
  given: boolean[][];
  pencilMode: boolean;
  mistakes: number;
  elapsedMs: number;
};

export function serialize(state: GameState): string;
export function deserialize(json: string): GameState | null; // null on parse failure or schema mismatch
export function load(): GameState | null;
export function save(state: GameState): void;
```

**What's persisted:** `puzzle`, `cells`, `given`, `pencilMode`, `mistakes`, `elapsedMs`.

**What's NOT persisted:**

- `selection` — reload lands with no selection. Selection is ephemeral UI state.
- `history` — undo stack is in-memory only. Reload starts fresh. Persisting hundreds of snapshots adds size and complexity for little user value.

**Encoding:** `pencilMarks: Set<Digit>` serializes as a sorted `number[]`. Sorted-on-write keeps the JSON diff-stable so localStorage writes don't churn.

**Subscriber wiring (in `store.ts`):**

```ts
useGameStore.subscribe((state, prev) => {
  if (
    state.cells === prev.cells &&
    state.pencilMode === prev.pencilMode &&
    state.mistakes === prev.mistakes &&
    state.elapsedMs === prev.elapsedMs &&
    state.puzzle === prev.puzzle
  )
    return;
  save(state);
});
```

Reference-equality checks work because reducers return new object references only when the value changes. Selection-only changes skip the save (the win from this gate).

**Error handling:**

- `localStorage.setItem` may throw (quota exceeded, private browsing). `save` catches and `console.warn`s; the game keeps running.
- `deserialize` returns `null` on parse failure or schema mismatch (missing required fields, wrong shapes). `load` propagates the null. Phase 21's bootstrap will fall through to "no saved game."

**Boot sequence:** Phase 9 exports `load()` and the store factory. Phase 21 will call `load()`, decide between "Resume" and "New game," and either `useGameStore.setState(loaded)` or call `loadPuzzle(freshPuzzle)`.

## Testing

### `reducers.test.ts`

The bulk of the coverage. A `makeTestState(overrides?)` helper builds a `GameState` from a small fixed puzzle (a handful of givens). Tests assert on returned state directly. No Zustand involvement.

Cases (~25):

- **`loadPuzzle`** — cells & given come from `puzzle.initialBoard`; selection cleared; history cleared; pencilMode/mistakes/elapsedMs reset.
- **`selectCell`** — sets/clears `selection.cell`; preserves `selection.number`; history unchanged.
- **`setSelectedNumber`** — symmetric.
- **`placeDigit`** — sets value when cell is empty, selected, and not given. No-op (returns same reference) when no selection, when cell is given, when no cell is selected.
- **`eraseCell`** — clears value when present; clears pencil marks when no value but marks present; no-op on empty cell or given cell.
- **`togglePencilMark`** — adds when absent, removes when present; no-op on given cell or cell with a value.
- **`togglePencilMode`** — flips boolean; pushes a snapshot.
- **`undo` / `redo`** — round-trip for each board-mutating action. Undo on empty past is no-op. Redo cleared after a new mutating action.
- **`withSnapshot` no-op guard** — `placeDigit` on a given cell does NOT push to past.

### `persistence.test.ts`

- `serialize` → `deserialize` round-trips: cells (with pencil marks as Sets), puzzle, given, mistakes, elapsedMs, pencilMode.
- `selection` and `history` are explicitly absent from serialized output.
- Malformed JSON returns `null`.
- Schema mismatch (e.g., missing required field) returns `null`.
- `save` swallows `localStorage` quota errors without throwing.

### `store.test.ts`

Thin integration tests. Uses `vi.spyOn` on `persistence.save` (or injects a fake) to verify save firing:

- A `selectCell` call does NOT trigger `save`.
- A `placeDigit` call DOES trigger `save`.
- A `placeDigit` that no-ops (on a given cell) does NOT trigger `save`.
- After `loadPuzzle`, the subscriber sees a `save`.

**No React component tests in Phase 9** — the store has no UI consumer yet.

**Expected test count:** ~30 new tests, bringing the total from 209 → ~239.

## Out of scope

Phase 9 deliberately defers:

- **Auto-removal of peer pencil marks on placement.** PLAN.md §13 owns. Phase 13 extends `placeDigit` to remove that digit from peer cells' pencilMarks; bundled into the same snapshot.
- **Mistakes counter increment.** Field exists; reducer doesn't modify it. Phase 19 (or Phase 11) wires it.
- **Timer ticks.** `elapsedMs` exists; no reducer touches it. Phase 19 owns the `useEffect` outside the store.
- **Auto-candidates mode** (Phase 14).
- **Hint state** (`currentHint`, `hintLevel`) — Phase 17.
- **Settings store** — separate Zustand store with own localStorage key, Phase 20.
- **Conflict detection / highlighting** — derived in Phase 15 selectors, not stored.
- **Puzzle loading from the worker** — `loadPuzzle(puzzle)` is exported; Phase 21's landing screen will call it after `createWorkerClient.getPuzzle(...)` resolves.

## Acceptance criteria

- `npm test -- --run` — all tests pass (~239 total; was 209 after Phase 8).
- `npm run typecheck` — clean.
- All four files exist under `src/game/`. No modifications to Phase 1–8 files.
- Reducers pass round-trip tests for every action, including undo/redo of each mutating action.
- localStorage save/load is lossless for the persisted fields.
- No regressions in any earlier-phase test.
