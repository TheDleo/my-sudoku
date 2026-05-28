# Phase 9: Game Store and Reducers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Zustand game store with pure reducers, snapshot-based undo/redo, and localStorage auto-save. No UI consumer yet — Phase 21 will wire the store into App.

**Architecture:** Four new files under `src/game/`. `types.ts` defines `GameState`, `GameSnapshot`, `GameStore`. `reducers.ts` exports a pure function per action plus the `withSnapshot` helper that pushes the pre-action snapshot onto `history.past`. `store.ts` is a thin Zustand wrapper that calls reducers (mutating actions go through `withSnapshot`) and subscribes itself to `persistence.save`. `persistence.ts` handles `Set<Digit> ↔ number[]` serialization and localStorage I/O. No changes to any Phase 1–8 file.

**Tech Stack:** Zustand 4.5.5 (already a dependency), TypeScript strict mode (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`), Vitest.

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design spec:** `docs/superpowers/specs/2026-05-27-phase-09-game-store-design.md` (commit `b857f00`).

**Design notes — locked in before tasks:**

- Snapshot-based undo (full pre-action `{cells, pencilMode}` copy). Selection is NOT in snapshots.
- `loadPuzzle` is the only action that clears history. Mutating actions go through `withSnapshot`. Selection actions don't.
- Reducers that no-op return the same `state` reference; `withSnapshot` uses this to skip pushing snapshots.
- Phase 9 reducers do NOT auto-remove peer pencil marks (Phase 13 owns) and do NOT increment `mistakes` (Phase 19 owns). The state fields exist as forward-compat slots.
- Persistence: synchronous save on every `cells`/`pencilMode`/`mistakes`/`elapsedMs`/`puzzle` change via a Zustand subscriber. Selection-only changes skip save. History is not persisted.
- `initialEmptyState` is a concrete sentinel `GameState` (not null) so the store always has a valid `GameState` even before `loadPuzzle` runs. Reducers no-op against it.

---

## Task 1: Types and shared helpers

**Files:**

- Create: `src/game/types.ts`
- Create: `src/game/helpers.ts`
- Create: `src/game/helpers.test.ts`

This task defines the type surface for the whole module plus two small helpers (`empty9x9`, `cloneCells`) that several later tasks will use. The helpers get a TDD pass; the types file is pure declarations.

- [ ] **Step 1: Create `src/game/types.ts`.**

```ts
import type { Cell, CellCoord, Digit, Puzzle } from '../types';

export type GameSnapshot = {
  cells: Cell[][];
  pencilMode: boolean;
};

export type GameState = {
  puzzle: Puzzle;
  cells: Cell[][];
  given: boolean[][];
  selection: { cell: CellCoord | null; number: Digit | null };
  pencilMode: boolean;
  mistakes: number;
  elapsedMs: number;
  history: { past: GameSnapshot[]; future: GameSnapshot[] };
};

export type GameStore = GameState & {
  loadPuzzle: (puzzle: Puzzle) => void;
  selectCell: (coord: CellCoord | null) => void;
  setSelectedNumber: (n: Digit | null) => void;
  placeDigit: (d: Digit) => void;
  eraseCell: () => void;
  togglePencilMark: (d: Digit) => void;
  togglePencilMode: () => void;
  undo: () => void;
  redo: () => void;
};
```

- [ ] **Step 2: Write the failing test.**

Create `src/game/helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Cell, Digit } from '../types';
import { cloneCells, empty9x9 } from './helpers';

describe('empty9x9', () => {
  it('returns a 9x9 grid of the value when given a non-function', () => {
    const grid = empty9x9<boolean>(false);
    expect(grid.length).toBe(9);
    for (const row of grid) {
      expect(row.length).toBe(9);
      for (const v of row) expect(v).toBe(false);
    }
  });

  it('calls the factory once per cell when given a function', () => {
    let i = 0;
    const grid = empty9x9(() => ++i);
    expect(grid[0]![0]).toBe(1);
    expect(grid[8]![8]).toBe(81);
  });
});

describe('cloneCells', () => {
  it('deep-copies cells including pencilMarks Set', () => {
    const original: Cell[][] = [
      [{ value: 5 as Digit, pencilMarks: new Set<Digit>() }],
      [{ value: null, pencilMarks: new Set<Digit>([1, 2, 3] as Digit[]) }],
    ];
    const copy = cloneCells(original);
    expect(copy).not.toBe(original);
    expect(copy[0]![0]).not.toBe(original[0]![0]);
    expect(copy[1]![0]!.pencilMarks).not.toBe(original[1]![0]!.pencilMarks);
    expect([...copy[1]![0]!.pencilMarks].sort()).toEqual([1, 2, 3]);

    // Mutating the copy must not affect the original.
    copy[1]![0]!.pencilMarks.add(9 as Digit);
    expect(original[1]![0]!.pencilMarks.has(9 as Digit)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails.**

Run: `npm test -- --run src/game/helpers.test.ts`
Expected: FAIL — module `./helpers` not found.

- [ ] **Step 4: Create `src/game/helpers.ts`.**

```ts
import type { Cell } from '../types';

const SIZE = 9;

/**
 * Returns a 9x9 grid. If `valueOrFactory` is a function, it's called once per
 * cell. Otherwise the value is used for every cell.
 */
export function empty9x9<T>(valueOrFactory: T | (() => T)): T[][] {
  const isFactory = typeof valueOrFactory === 'function';
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () =>
      isFactory ? (valueOrFactory as () => T)() : (valueOrFactory as T),
    ),
  );
}

/**
 * Deep-copies a 9x9 cells grid, including the pencilMarks Set on each cell.
 */
export function cloneCells(cells: Cell[][]): Cell[][] {
  return cells.map((row) =>
    row.map((c) => ({ value: c.value, pencilMarks: new Set(c.pencilMarks) })),
  );
}
```

- [ ] **Step 5: Run tests + typecheck to verify GREEN.**

Run: `npm test -- --run src/game/helpers.test.ts && npm run typecheck`
Expected: 3 tests pass, typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/game/types.ts src/game/helpers.ts src/game/helpers.test.ts
git commit -m "feat(game): add types and 9x9 grid helpers"
```

---

## Task 2: initialEmptyState and `loadPuzzle` reducer

**Files:**

- Create: `src/game/reducers.ts`
- Create: `src/game/reducers.test.ts`

`loadPuzzle` is the most foundational reducer (everything else assumes a valid `GameState`), so it goes first. Also introduces the `initialEmptyState` sentinel.

- [ ] **Step 1: Write the failing test.**

Create `src/game/reducers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Digit, Puzzle } from '../types';
import { initialEmptyState, loadPuzzle } from './reducers';

function makePuzzle(): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  initialBoard[0]![0] = 5;
  initialBoard[4]![4] = 7;
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
  );
  return { id: 'test', difficulty: 'easy', initialBoard, solution };
}

describe('initialEmptyState', () => {
  it('is a concrete GameState sentinel', () => {
    expect(initialEmptyState.cells.length).toBe(9);
    expect(initialEmptyState.given.length).toBe(9);
    expect(initialEmptyState.selection).toEqual({ cell: null, number: null });
    expect(initialEmptyState.pencilMode).toBe(false);
    expect(initialEmptyState.mistakes).toBe(0);
    expect(initialEmptyState.elapsedMs).toBe(0);
    expect(initialEmptyState.history).toEqual({ past: [], future: [] });
  });
});

describe('loadPuzzle', () => {
  it('rebuilds cells and given from puzzle.initialBoard', () => {
    const puzzle = makePuzzle();
    const next = loadPuzzle(initialEmptyState, puzzle);
    expect(next.cells[0]![0]!.value).toBe(5);
    expect(next.cells[4]![4]!.value).toBe(7);
    expect(next.cells[1]![1]!.value).toBe(null);
    expect(next.given[0]![0]).toBe(true);
    expect(next.given[4]![4]).toBe(true);
    expect(next.given[1]![1]).toBe(false);
    expect(next.puzzle).toBe(puzzle);
  });

  it('clears selection, resets pencilMode/mistakes/elapsedMs, and clears history', () => {
    const puzzle = makePuzzle();
    const dirty = {
      ...initialEmptyState,
      selection: { cell: { row: 3, col: 3 }, number: 5 as Digit },
      pencilMode: true,
      mistakes: 4,
      elapsedMs: 12345,
      history: {
        past: [{ cells: initialEmptyState.cells, pencilMode: true }],
        future: [{ cells: initialEmptyState.cells, pencilMode: false }],
      },
    };
    const next = loadPuzzle(dirty, puzzle);
    expect(next.selection).toEqual({ cell: null, number: null });
    expect(next.pencilMode).toBe(false);
    expect(next.mistakes).toBe(0);
    expect(next.elapsedMs).toBe(0);
    expect(next.history).toEqual({ past: [], future: [] });
  });

  it('initializes each cell with an empty pencilMarks Set', () => {
    const next = loadPuzzle(initialEmptyState, makePuzzle());
    for (const row of next.cells) {
      for (const c of row) {
        expect(c.pencilMarks).toBeInstanceOf(Set);
        expect(c.pencilMarks.size).toBe(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/reducers.test.ts`
Expected: FAIL — module `./reducers` not found.

- [ ] **Step 3: Create `src/game/reducers.ts`.**

```ts
import type { Cell, Digit, Puzzle } from '../types';
import { cloneCells, empty9x9 } from './helpers';
import type { GameSnapshot, GameState } from './types';

const SENTINEL_PUZZLE: Puzzle = {
  id: '',
  difficulty: 'easy',
  initialBoard: empty9x9<Digit | null>(null),
  solution: empty9x9<Digit>(1 as Digit),
};

export const initialEmptyState: GameState = {
  puzzle: SENTINEL_PUZZLE,
  cells: empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() })),
  given: empty9x9<boolean>(false),
  selection: { cell: null, number: null },
  pencilMode: false,
  mistakes: 0,
  elapsedMs: 0,
  history: { past: [], future: [] },
};

export function loadPuzzle(_state: GameState, puzzle: Puzzle): GameState {
  const cells: Cell[][] = puzzle.initialBoard.map((row) =>
    row.map((v) => ({ value: v, pencilMarks: new Set<Digit>() })),
  );
  const given: boolean[][] = puzzle.initialBoard.map((row) => row.map((v) => v !== null));
  return {
    puzzle,
    cells,
    given,
    selection: { cell: null, number: null },
    pencilMode: false,
    mistakes: 0,
    elapsedMs: 0,
    history: { past: [], future: [] },
  };
}

// Re-export shared types for convenience from this module.
export type { GameSnapshot, GameState };
// (cloneCells stays internal but is used by withSnapshot and undo in later tasks.)
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/reducers.test.ts && npm run typecheck`
Expected: 4 tests pass (1 in initialEmptyState describe + 3 in loadPuzzle describe), typecheck clean.

- [ ] **Step 5: Commit.**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add initialEmptyState and loadPuzzle reducer"
```

---

## Task 3: Selection reducers (`selectCell`, `setSelectedNumber`)

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

Selection actions don't push snapshots. Tests assert that `history.past` is preserved across them.

- [ ] **Step 1: Append the new tests to `src/game/reducers.test.ts`** (after the existing describes, at the bottom of the file):

```ts
import { selectCell, setSelectedNumber } from './reducers';

describe('selectCell', () => {
  it('sets selection.cell and preserves selection.number', () => {
    const start = { ...initialEmptyState, selection: { cell: null, number: 5 as Digit } };
    const next = selectCell(start, { row: 2, col: 3 });
    expect(next.selection).toEqual({ cell: { row: 2, col: 3 }, number: 5 });
  });

  it('clears selection.cell when given null', () => {
    const start = {
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: 7 as Digit },
    };
    const next = selectCell(start, null);
    expect(next.selection).toEqual({ cell: null, number: 7 });
  });

  it('does not modify history', () => {
    const next = selectCell(initialEmptyState, { row: 0, col: 0 });
    expect(next.history).toBe(initialEmptyState.history);
  });
});

describe('setSelectedNumber', () => {
  it('sets selection.number and preserves selection.cell', () => {
    const start = {
      ...initialEmptyState,
      selection: { cell: { row: 4, col: 4 }, number: null },
    };
    const next = setSelectedNumber(start, 9 as Digit);
    expect(next.selection).toEqual({ cell: { row: 4, col: 4 }, number: 9 });
  });

  it('clears selection.number when given null', () => {
    const start = {
      ...initialEmptyState,
      selection: { cell: null, number: 3 as Digit },
    };
    const next = setSelectedNumber(start, null);
    expect(next.selection).toEqual({ cell: null, number: null });
  });

  it('does not modify history', () => {
    const next = setSelectedNumber(initialEmptyState, 5 as Digit);
    expect(next.history).toBe(initialEmptyState.history);
  });
});
```

The `import { selectCell, setSelectedNumber } from './reducers';` belongs at the top of the file with the other imports — but it's shown inline here for clarity. Append it to the existing import line: `import { initialEmptyState, loadPuzzle, selectCell, setSelectedNumber } from './reducers';`.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/reducers.test.ts`
Expected: 6 new tests FAIL (functions not exported). Existing 4 tests still pass.

- [ ] **Step 3: Add the reducers to `src/game/reducers.ts`** (after `loadPuzzle`):

```ts
import type { CellCoord } from '../types';

export function selectCell(state: GameState, coord: CellCoord | null): GameState {
  return { ...state, selection: { ...state.selection, cell: coord } };
}

export function setSelectedNumber(state: GameState, n: Digit | null): GameState {
  return { ...state, selection: { ...state.selection, number: n } };
}
```

Add `CellCoord` to the existing import: `import type { Cell, CellCoord, Digit, Puzzle } from '../types';`.

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/reducers.test.ts && npm run typecheck`
Expected: 10 tests pass, typecheck clean.

- [ ] **Step 5: Commit.**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add selectCell and setSelectedNumber reducers"
```

---

## Task 4: `placeDigit` reducer

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

Pure reducer: sets the digit; doesn't touch history (that's `withSnapshot`'s job in Task 7).

- [ ] **Step 1: Append the new tests** to `src/game/reducers.test.ts`:

```ts
import { placeDigit } from './reducers';

describe('placeDigit', () => {
  it('sets the digit when a non-given cell is selected', () => {
    const puzzle = makePuzzle();
    const loaded = loadPuzzle(initialEmptyState, puzzle);
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.cells[1]![1]!.value).toBe(3);
  });

  it('returns the same reference (no-op) when no cell is selected', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(placeDigit(loaded, 3 as Digit)).toBe(loaded);
  });

  it('returns the same reference (no-op) when the selected cell is given', () => {
    const puzzle = makePuzzle();
    const loaded = loadPuzzle(initialEmptyState, puzzle);
    const selected = selectCell(loaded, { row: 0, col: 0 }); // (0,0) is given
    expect(placeDigit(selected, 3 as Digit)).toBe(selected);
  });

  it('overwrites a previously placed digit in a non-given cell', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const first = placeDigit(selected, 3 as Digit);
    const second = placeDigit(first, 7 as Digit);
    expect(second.cells[1]![1]!.value).toBe(7);
  });

  it('does not modify history (history snapshot is withSnapshot job)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.history).toBe(selected.history);
  });
});
```

Append `placeDigit` to the named-import list at the top.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/reducers.test.ts`
Expected: 5 new tests FAIL.

- [ ] **Step 3: Add the reducer** to `src/game/reducers.ts`:

```ts
export function placeDigit(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const nextCells = cloneCells(state.cells);
  nextCells[sel.row]![sel.col]!.value = digit;
  return { ...state, cells: nextCells };
}
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/reducers.test.ts && npm run typecheck`
Expected: 15 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add placeDigit reducer"
```

---

## Task 5: `eraseCell` reducer

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

Clears value first; if no value, clears pencil marks; if neither, no-op.

- [ ] **Step 1: Append the new tests** to `src/game/reducers.test.ts`:

```ts
import { eraseCell } from './reducers';

describe('eraseCell', () => {
  it('clears the value of the selected non-given cell', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withDigit = placeDigit(selected, 3 as Digit);
    const next = eraseCell(withDigit);
    expect(next.cells[1]![1]!.value).toBe(null);
  });

  it('clears pencil marks when the cell has no value but has marks', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[1]![1]!.pencilMarks = new Set<Digit>([1, 2, 3] as Digit[]);
    const seeded = { ...loaded, cells };
    const selected = selectCell(seeded, { row: 1, col: 1 });
    const next = eraseCell(selected);
    expect(next.cells[1]![1]!.value).toBe(null);
    expect(next.cells[1]![1]!.pencilMarks.size).toBe(0);
  });

  it('returns the same reference when the cell is empty (no value, no marks)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    expect(eraseCell(selected)).toBe(selected);
  });

  it('returns the same reference when the cell is given', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 0, col: 0 }); // given cell
    expect(eraseCell(selected)).toBe(selected);
  });

  it('returns the same reference when no cell is selected', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(eraseCell(loaded)).toBe(loaded);
  });
});
```

At the top of the test file, after the other imports, add a local helper for seeding pencil marks in tests:

```ts
import { cloneCells as cloneCellsForTest } from './helpers';
```

Append `eraseCell` to the reducers import line.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/reducers.test.ts`
Expected: 5 new tests FAIL.

- [ ] **Step 3: Add the reducer** to `src/game/reducers.ts`:

```ts
export function eraseCell(state: GameState): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const cell = state.cells[sel.row]![sel.col]!;
  if (cell.value !== null) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.value = null;
    return { ...state, cells: nextCells };
  }
  if (cell.pencilMarks.size > 0) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.pencilMarks = new Set<Digit>();
    return { ...state, cells: nextCells };
  }
  return state;
}
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/reducers.test.ts && npm run typecheck`
Expected: 20 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add eraseCell reducer"
```

---

## Task 6: `togglePencilMark` and `togglePencilMode` reducers

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

Pencil-related actions grouped together. Note: `togglePencilMode` is a tiny boolean flip — it goes through `withSnapshot` in Task 7 just like other mutating actions.

- [ ] **Step 1: Append the new tests** to `src/game/reducers.test.ts`:

```ts
import { togglePencilMark, togglePencilMode } from './reducers';

describe('togglePencilMark', () => {
  it('adds the digit when absent', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = togglePencilMark(selected, 5 as Digit);
    expect(next.cells[1]![1]!.pencilMarks.has(5 as Digit)).toBe(true);
  });

  it('removes the digit when present', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const added = togglePencilMark(selected, 5 as Digit);
    const removed = togglePencilMark(added, 5 as Digit);
    expect(removed.cells[1]![1]!.pencilMarks.has(5 as Digit)).toBe(false);
  });

  it('returns same reference when cell is given', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 0, col: 0 }); // given
    expect(togglePencilMark(selected, 3 as Digit)).toBe(selected);
  });

  it('returns same reference when cell has a value', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withDigit = placeDigit(selected, 7 as Digit);
    expect(togglePencilMark(withDigit, 3 as Digit)).toBe(withDigit);
  });

  it('returns same reference when no cell is selected', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(togglePencilMark(loaded, 3 as Digit)).toBe(loaded);
  });
});

describe('togglePencilMode', () => {
  it('flips the pencilMode boolean', () => {
    expect(togglePencilMode(initialEmptyState).pencilMode).toBe(true);
    const on = togglePencilMode(initialEmptyState);
    expect(togglePencilMode(on).pencilMode).toBe(false);
  });
});
```

Append the import line.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/reducers.test.ts`
Expected: 6 new tests FAIL.

- [ ] **Step 3: Add the reducers** to `src/game/reducers.ts`:

```ts
export function togglePencilMark(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  if (state.cells[sel.row]![sel.col]!.value !== null) return state;
  const nextCells = cloneCells(state.cells);
  const marks = nextCells[sel.row]![sel.col]!.pencilMarks;
  if (marks.has(digit)) marks.delete(digit);
  else marks.add(digit);
  return { ...state, cells: nextCells };
}

export function togglePencilMode(state: GameState): GameState {
  return { ...state, pencilMode: !state.pencilMode };
}
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/reducers.test.ts && npm run typecheck`
Expected: 26 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add togglePencilMark and togglePencilMode reducers"
```

---

## Task 7: `withSnapshot` helper + `undo` and `redo` reducers

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

Adds the history machinery. `withSnapshot` is tested via undo/redo round-trips on every mutating reducer plus its no-op guard.

- [ ] **Step 1: Append the new tests** to `src/game/reducers.test.ts`:

```ts
import { undo, redo, withSnapshot } from './reducers';

describe('withSnapshot', () => {
  it('pushes the pre-action snapshot onto past when the reducer changes state', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    expect(next.history.past.length).toBe(1);
    expect(next.history.past[0]!.cells[1]![1]!.value).toBe(null); // pre-action snapshot
    expect(next.history.future).toEqual([]); // future cleared on new action
  });

  it('does not push a snapshot when the reducer returns the same reference (no-op)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 0, col: 0 }); // given cell
    const next = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    expect(next).toBe(selected);
    expect(next.history.past).toEqual([]);
  });

  it('clears the future array on any new mutating action', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const seeded = {
      ...selected,
      history: {
        past: [],
        future: [{ cells: selected.cells, pencilMode: false }],
      },
    };
    const next = withSnapshot(seeded, (s) => placeDigit(s, 5 as Digit));
    expect(next.history.future).toEqual([]);
  });
});

describe('undo', () => {
  it('returns same reference when past is empty', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(undo(loaded)).toBe(loaded);
  });

  it('reverts the most recent mutating action', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    const reverted = undo(placed);
    expect(reverted.cells[1]![1]!.value).toBe(null);
    expect(reverted.history.past).toEqual([]);
    expect(reverted.history.future.length).toBe(1);
  });

  it('preserves selection across undo', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    const moved = selectCell(placed, { row: 4, col: 4 });
    const reverted = undo(moved);
    expect(reverted.selection.cell).toEqual({ row: 4, col: 4 });
  });
});

describe('redo', () => {
  it('returns same reference when future is empty', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(redo(loaded)).toBe(loaded);
  });

  it('redoes a previously undone action', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    const undone = undo(placed);
    const redone = redo(undone);
    expect(redone.cells[1]![1]!.value).toBe(3);
    expect(redone.history.past.length).toBe(1);
    expect(redone.history.future).toEqual([]);
  });

  it('round-trip: placeDigit -> undo -> redo restores the digit', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    expect(redo(undo(placed)).cells[1]![1]!.value).toBe(3);
  });

  it('round-trip: eraseCell pencil marks -> undo restores them', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withMarks = withSnapshot(selected, (s) => togglePencilMark(s, 3 as Digit));
    const withMore = withSnapshot(withMarks, (s) => togglePencilMark(s, 5 as Digit));
    const erased = withSnapshot(withMore, eraseCell);
    expect(erased.cells[1]![1]!.pencilMarks.size).toBe(0);
    const reverted = undo(erased);
    expect(reverted.cells[1]![1]!.pencilMarks.has(3 as Digit)).toBe(true);
    expect(reverted.cells[1]![1]!.pencilMarks.has(5 as Digit)).toBe(true);
  });
});
```

Append the import line.

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/reducers.test.ts`
Expected: 9 new tests FAIL.

- [ ] **Step 3: Add `withSnapshot`, `undo`, `redo`** to `src/game/reducers.ts`:

```ts
export function withSnapshot(state: GameState, mutate: (s: GameState) => GameState): GameState {
  const snapshot: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
  const next = mutate(state);
  if (next === state) return state;
  return {
    ...next,
    history: { past: [...state.history.past, snapshot], future: [] },
  };
}

export function undo(state: GameState): GameState {
  if (state.history.past.length === 0) return state;
  const snapshot = state.history.past[state.history.past.length - 1]!;
  const current: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
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

export function redo(state: GameState): GameState {
  if (state.history.future.length === 0) return state;
  const snapshot = state.history.future[state.history.future.length - 1]!;
  const current: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
  return {
    ...state,
    cells: snapshot.cells,
    pencilMode: snapshot.pencilMode,
    history: {
      past: [...state.history.past, current],
      future: state.history.future.slice(0, -1),
    },
  };
}
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/reducers.test.ts && npm run typecheck`
Expected: 35 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add withSnapshot helper and undo/redo reducers"
```

---

## Task 8: `persistence.ts` — serialize, deserialize, load, save

**Files:**

- Create: `src/game/persistence.ts`
- Create: `src/game/persistence.test.ts`

Single task because the four functions are tightly coupled. Tests use a stubbed `localStorage` (vitest's `vi.stubGlobal` or a manual mock).

- [ ] **Step 1: Write the failing tests.**

Create `src/game/persistence.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit, Puzzle } from '../types';
import { initialEmptyState, loadPuzzle, togglePencilMark, selectCell } from './reducers';
import { deserialize, load, save, serialize, STORAGE_KEY } from './persistence';

function makePuzzle(): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  initialBoard[0]![0] = 5;
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
  );
  return { id: 'p', difficulty: 'medium', initialBoard, solution };
}

describe('serialize / deserialize round-trip', () => {
  it('preserves cells (including pencilMarks as Sets), given, puzzle, pencilMode, mistakes, elapsedMs', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withMark = togglePencilMark(selected, 3 as Digit);
    const dirty = { ...withMark, pencilMode: true, mistakes: 2, elapsedMs: 5000 };

    const json = serialize(dirty);
    const restored = deserialize(json);

    expect(restored).not.toBeNull();
    expect(restored!.puzzle).toEqual(dirty.puzzle);
    expect(restored!.given).toEqual(dirty.given);
    expect(restored!.cells[1]![1]!.pencilMarks).toBeInstanceOf(Set);
    expect([...restored!.cells[1]![1]!.pencilMarks]).toEqual([3]);
    expect(restored!.pencilMode).toBe(true);
    expect(restored!.mistakes).toBe(2);
    expect(restored!.elapsedMs).toBe(5000);
  });

  it('does NOT serialize selection or history (restored state has defaults)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const dirty = {
      ...selected,
      history: {
        past: [{ cells: selected.cells, pencilMode: false }],
        future: [],
      },
    };
    const restored = deserialize(serialize(dirty));
    expect(restored).not.toBeNull();
    expect(restored!.selection).toEqual({ cell: null, number: null });
    expect(restored!.history).toEqual({ past: [], future: [] });
  });

  it('writes sorted pencil-mark arrays (diff-stable)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    let s = togglePencilMark(selected, 7 as Digit);
    s = togglePencilMark(s, 2 as Digit);
    s = togglePencilMark(s, 5 as Digit);
    const json = serialize(s);
    const parsed = JSON.parse(json) as { cells: { value: null; pencilMarks: number[] }[][] };
    expect(parsed.cells[1]![1]!.pencilMarks).toEqual([2, 5, 7]);
  });
});

describe('deserialize error handling', () => {
  it('returns null on malformed JSON', () => {
    expect(deserialize('not json')).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    expect(deserialize('{}')).toBeNull();
    expect(deserialize('{"puzzle": {}}')).toBeNull();
  });
});

describe('load / save', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: () => null,
      length: 0,
    });
  });

  it('save writes serialized state to STORAGE_KEY', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    save(loaded);
    expect(storage[STORAGE_KEY]).toBeDefined();
    const parsed = deserialize(storage[STORAGE_KEY]!);
    expect(parsed!.puzzle.id).toBe('p');
  });

  it('load returns the deserialized state when present', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    save(loaded);
    const restored = load();
    expect(restored).not.toBeNull();
    expect(restored!.puzzle.id).toBe('p');
  });

  it('load returns null when STORAGE_KEY is absent', () => {
    expect(load()).toBeNull();
  });

  it('save swallows quota-exceeded errors without throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    });
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(() => save(loaded)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/persistence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/game/persistence.ts`.**

```ts
import type { Cell, Digit, Puzzle } from '../types';
import type { GameState } from './types';

export const STORAGE_KEY = 'my-sudoku.game';

type SerializedCell = { value: Digit | null; pencilMarks: number[] };
type SerializedState = {
  puzzle: Puzzle;
  cells: SerializedCell[][];
  given: boolean[][];
  pencilMode: boolean;
  mistakes: number;
  elapsedMs: number;
};

export function serialize(state: GameState): string {
  const cells: SerializedCell[][] = state.cells.map((row) =>
    row.map((c) => ({
      value: c.value,
      pencilMarks: [...c.pencilMarks].sort((a, b) => a - b),
    })),
  );
  const payload: SerializedState = {
    puzzle: state.puzzle,
    cells,
    given: state.given,
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    elapsedMs: state.elapsedMs,
  };
  return JSON.stringify(payload);
}

function isSerializedState(x: unknown): x is SerializedState {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.pencilMode !== 'boolean') return false;
  if (typeof o.mistakes !== 'number') return false;
  if (typeof o.elapsedMs !== 'number') return false;
  if (!Array.isArray(o.cells) || o.cells.length !== 9) return false;
  if (!Array.isArray(o.given) || o.given.length !== 9) return false;
  if (typeof o.puzzle !== 'object' || o.puzzle === null) return false;
  return true;
}

export function deserialize(json: string): GameState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isSerializedState(parsed)) return null;
  const cells: Cell[][] = parsed.cells.map((row) =>
    row.map((c) => ({ value: c.value, pencilMarks: new Set<Digit>(c.pencilMarks as Digit[]) })),
  );
  return {
    puzzle: parsed.puzzle,
    cells,
    given: parsed.given,
    selection: { cell: null, number: null },
    pencilMode: parsed.pencilMode,
    mistakes: parsed.mistakes,
    elapsedMs: parsed.elapsedMs,
    history: { past: [], future: [] },
  };
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return deserialize(raw);
  } catch (err) {
    console.warn('persistence.load failed:', err);
    return null;
  }
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch (err) {
    console.warn('persistence.save failed:', err);
  }
}
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/persistence.test.ts && npm run typecheck`
Expected: 8 tests pass, typecheck clean.

- [ ] **Step 5: Commit.**

```bash
git add src/game/persistence.ts src/game/persistence.test.ts
git commit -m "feat(game): add localStorage persistence"
```

---

## Task 9: Zustand store wiring + auto-save subscriber

**Files:**

- Create: `src/game/store.ts`
- Create: `src/game/store.test.ts`

Final task: wire the reducers into a Zustand store and add the persistence subscriber.

- [ ] **Step 1: Write the failing tests.**

Create `src/game/store.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit, Puzzle } from '../types';
import * as persistence from './persistence';

function makePuzzle(): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  initialBoard[0]![0] = 5;
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
  );
  return { id: 'p', difficulty: 'easy', initialBoard, solution };
}

describe('useGameStore', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    saveSpy = vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    // Re-import the store fresh each test to reset internal state.
    vi.resetModules();
  });

  it('selectCell does NOT trigger save', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    saveSpy.mockClear();
    useGameStore.getState().selectCell({ row: 4, col: 4 });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit DOES trigger save when it modifies cells', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('placeDigit on a given cell does NOT trigger save', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 0, col: 0 }); // given
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit pushes a snapshot onto history.past', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    expect(useGameStore.getState().history.past.length).toBe(1);
  });

  it('loadPuzzle triggers save', async () => {
    const { useGameStore } = await import('./store');
    saveSpy.mockClear();
    useGameStore.getState().loadPuzzle(makePuzzle());
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('undo through the store reverts placeDigit', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    useGameStore.getState().undo();
    expect(useGameStore.getState().cells[1]![1]!.value).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/game/store.test.ts`
Expected: FAIL — module `./store` not found.

- [ ] **Step 3: Create `src/game/store.ts`.**

```ts
import { create } from 'zustand';
import * as persistence from './persistence';
import * as reducers from './reducers';
import { initialEmptyState, withSnapshot } from './reducers';
import type { GameState, GameStore } from './types';

export const useGameStore = create<GameStore>()((set) => ({
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

// Auto-save subscriber. Only fires when persisted fields changed.
useGameStore.subscribe((state: GameStore, prev: GameStore) => {
  if (
    state.cells === prev.cells &&
    state.pencilMode === prev.pencilMode &&
    state.mistakes === prev.mistakes &&
    state.elapsedMs === prev.elapsedMs &&
    state.puzzle === prev.puzzle
  ) {
    return;
  }
  // Save only the GameState portion (drops the action methods, but JSON.stringify
  // would skip them anyway — explicit narrowing for clarity).
  const snapshot: GameState = {
    puzzle: state.puzzle,
    cells: state.cells,
    given: state.given,
    selection: state.selection,
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    elapsedMs: state.elapsedMs,
    history: state.history,
  };
  persistence.save(snapshot);
});
```

- [ ] **Step 4: Run tests + typecheck.**

Run: `npm test -- --run src/game/store.test.ts && npm run typecheck`
Expected: 6 tests pass, typecheck clean.

If a test fails because the store retains state across tests (Zustand store is module-level state): the `vi.resetModules() + dynamic import('./store')` pattern in `beforeEach` is meant to reset it. Confirm `vi.resetModules()` is called BEFORE the `await import('./store')` in each `it(...)`.

- [ ] **Step 5: Run the full test suite + typecheck.**

Run: `npm test -- --run && npm run typecheck`
Expected: ~244 tests pass (was 209 after Phase 8; +35 across the four new test files). Typecheck clean.

- [ ] **Step 6: Commit.**

```bash
git add src/game/store.ts src/game/store.test.ts
git commit -m "feat(game): wire Zustand store with auto-save subscriber"
```

---

## Acceptance criteria (final)

- [ ] `npm test -- --run` — all tests pass (~244 total; was 209 after Phase 8; +35 in `src/game/`).
- [ ] `npm run typecheck` — clean under `noUncheckedIndexedAccess: true` and `exactOptionalPropertyTypes: true`.
- [ ] All four production files exist under `src/game/`: `types.ts`, `helpers.ts`, `reducers.ts`, `store.ts`, `persistence.ts`. (Note: `helpers.ts` is a small implementation detail added during Task 1; it's not in the design spec's public file list but supports the implementation.)
- [ ] Every reducer in the design's action set is implemented and tested for: success path, no-op path (where applicable), and undo/redo round-trip (where applicable).
- [ ] `serialize`/`deserialize` is lossless for the persisted fields; `selection` and `history` are explicitly excluded.
- [ ] `save` swallows localStorage errors without throwing.
- [ ] No changes to any Phase 1–8 source file.
- [ ] No regressions in any earlier-phase test (209 prior tests still green).
