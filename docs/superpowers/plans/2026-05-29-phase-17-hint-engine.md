# Phase 17: Hint Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progressive 4-level hint system that runs the solver on the current board, returns the easiest applicable technique, and reveals it step-by-step without auto-applying anything.

**Architecture:** A pure `getHint(cells)` function in `src/hints/engine.ts` runs `ALL_TECHNIQUES` in order and returns the first `Step`. `currentHint: Step | null` and `hintLevel: 1|2|3|4` are added to `GameState`. `withSnapshot`, `undo`, and `redo` all clear the hint. A `HintPanel` component below `ActionBar` shows either a "Hint" button or progressive disclosure of the active hint. At level ≥ 3, `getHighlights` marks the step's cells with a new `'hint'` tier.

**Tech Stack:** React, Zustand (`useGameStore`), Vitest, React Testing Library

---

## File map

| File                           | Action | Responsibility                                                             |
| ------------------------------ | ------ | -------------------------------------------------------------------------- |
| `src/hints/engine.ts`          | Create | `getHint` + `TECHNIQUE_LABELS`                                             |
| `src/hints/engine.test.ts`     | Create | Unit tests for hint engine                                                 |
| `src/game/types.ts`            | Modify | Add `currentHint`/`hintLevel` to `GameState`; 3 actions to `GameStore`     |
| `src/game/reducers.ts`         | Modify | 3 new reducers; clear hint in `withSnapshot`, `undo`, `redo`, `loadPuzzle` |
| `src/game/reducers.test.ts`    | Modify | Tests for 3 reducers + auto-dismiss                                        |
| `src/game/store.ts`            | Modify | Wire 3 new actions                                                         |
| `src/game/highlights.ts`       | Modify | Add `'hint'` tier; accept `currentHint`/`hintLevel`                        |
| `src/game/highlights.test.ts`  | Modify | Tests for `'hint'` tier                                                    |
| `src/styles/tokens.css`        | Modify | Add `--cell-hint` token                                                    |
| `src/game/Cell.css`            | Modify | Add `.cell--hint` rule                                                     |
| `src/game/Board.tsx`           | Modify | Subscribe to and pass `currentHint`/`hintLevel` to `getHighlights`         |
| `src/hints/HintPanel.tsx`      | Create | Hint panel component                                                       |
| `src/hints/HintPanel.css`      | Create | Styles                                                                     |
| `src/hints/HintPanel.test.tsx` | Create | RTL tests                                                                  |
| `src/app.tsx`                  | Modify | Render `<HintPanel />` below `<ActionBar />`                               |

---

## Task 1: Hint engine

**Files:**

- Create: `src/hints/engine.ts`
- Create: `src/hints/engine.test.ts`

- [ ] **Step 1: Create `src/hints/engine.test.ts` with 3 failing tests**

```ts
import { describe, it, expect } from 'vitest';
import type { Cell, Digit } from '../types';
import { empty9x9 } from '../game/helpers';
import { TECHNIQUE_LABELS, getHint } from './engine';

describe('getHint', () => {
  it('returns null on a fully empty board', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    expect(getHint(cells)).toBeNull();
  });

  it('returns a nakedSingle step when exactly one candidate remains in a cell', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Place 1–8 in row 0 cols 0–7; cell (0,8) can only be 9
    for (let c = 0; c < 8; c++) {
      cells[0]![c]!.value = (c + 1) as Digit;
    }
    const step = getHint(cells);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedSingle');
  });
});

describe('TECHNIQUE_LABELS', () => {
  it('has a label for all 16 techniques', () => {
    const keys = Object.keys(TECHNIQUE_LABELS);
    expect(keys.length).toBe(16);
    for (const label of Object.values(TECHNIQUE_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/hints/engine.test.ts
```

Expected: error — `Cannot find module './engine'`.

- [ ] **Step 3: Create `src/hints/engine.ts`**

```ts
import type { Cell } from '../types';
import type { Step, TechniqueName } from '../solver/types';
import { computeCandidates } from '../solver/candidates';
import { ALL_TECHNIQUES } from '../solver/techniques';

export const TECHNIQUE_LABELS: Record<TechniqueName, string> = {
  nakedSingle: 'Naked Single',
  hiddenSingle: 'Hidden Single',
  nakedPair: 'Naked Pair',
  nakedTriple: 'Naked Triple',
  hiddenPair: 'Hidden Pair',
  hiddenTriple: 'Hidden Triple',
  pointingPair: 'Pointing Pair',
  nakedQuad: 'Naked Quad',
  hiddenQuad: 'Hidden Quad',
  xWing: 'X-Wing',
  boxLineReduction: 'Box-Line Reduction',
  swordfish: 'Swordfish',
  xyWing: 'XY-Wing',
  xyzWing: 'XYZ-Wing',
  coloring: 'Coloring',
  uniqueRectangle: 'Unique Rectangle',
};

export function getHint(cells: Cell[][]): Step | null {
  const values = cells.map((row) => row.map((c) => c.value));
  const candidates = computeCandidates(values);
  for (const detector of ALL_TECHNIQUES) {
    const step = detector({ values, candidates });
    if (step !== null) return step;
  }
  return null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/hints/engine.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hints/engine.ts src/hints/engine.test.ts
git commit -m "feat(hints): add getHint engine and TECHNIQUE_LABELS"
```

---

## Task 2: Store types, reducers, and store wiring

**Files:**

- Modify: `src/game/types.ts`
- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`
- Modify: `src/game/store.ts`

- [ ] **Step 1: Add failing tests to `reducers.test.ts`**

Add this import at the top of `src/game/reducers.test.ts` alongside the existing imports:

```ts
import type { Step } from '../solver/types';
import { advanceHint, dismissHint, requestHint } from './reducers';
```

Add `advanceHint`, `dismissHint`, `requestHint` to the existing destructured import from `'./reducers'`:

```ts
import {
  advanceHint,
  dismissHint,
  eraseCell,
  fillCandidates,
  initialEmptyState,
  loadPuzzle,
  placeDigit,
  redo,
  requestHint,
  selectCell,
  setSelectedNumber,
  togglePencilMark,
  togglePencilMode,
  undo,
  withSnapshot,
} from './reducers';
```

Append the following describe blocks to the end of `src/game/reducers.test.ts`:

```ts
const mockStep: Step = {
  technique: 'nakedSingle',
  highlights: [{ row: 0, col: 8 }],
  placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
  eliminations: [],
  explanation: 'Cell (0,8) can only contain 9.',
};

describe('requestHint', () => {
  it('sets currentHint and hintLevel to 1 when a technique applies', () => {
    const cells = cloneCellsForTest(initialEmptyState.cells);
    for (let c = 0; c < 8; c++) {
      cells[0]![c]!.value = (c + 1) as Digit;
    }
    const state = { ...initialEmptyState, cells };
    const next = requestHint(state);
    expect(next.currentHint).not.toBeNull();
    expect(next.currentHint?.technique).toBe('nakedSingle');
    expect(next.hintLevel).toBe(1);
  });

  it('sets currentHint to null when no technique applies', () => {
    const next = requestHint(initialEmptyState);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('advanceHint', () => {
  it('increments hintLevel from 1 to 2', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 1 as const };
    expect(advanceHint(state).hintLevel).toBe(2);
  });

  it('increments hintLevel from 3 to 4', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 3 as const };
    expect(advanceHint(state).hintLevel).toBe(4);
  });

  it('does not go past 4', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 4 as const };
    expect(advanceHint(state).hintLevel).toBe(4);
  });

  it('is a no-op when currentHint is null', () => {
    const next = advanceHint(initialEmptyState);
    expect(next).toBe(initialEmptyState);
  });
});

describe('dismissHint', () => {
  it('sets currentHint to null and hintLevel to 1', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 3 as const };
    const next = dismissHint(state);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('withSnapshot — hint auto-dismiss', () => {
  it('clears currentHint when a board mutation commits', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const stateWithHint = {
      ...loaded,
      currentHint: mockStep,
      hintLevel: 2 as const,
      selection: { cell: { row: 1, col: 1 }, number: null },
    };
    const next = withSnapshot(stateWithHint, (s) => placeDigit(s, 3 as Digit));
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('undo/redo — hint auto-dismiss', () => {
  it('undo clears currentHint', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 2 as const,
      history: { past: [{ cells: initialEmptyState.cells, pencilMode: false }], future: [] },
    };
    const next = undo(state);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });

  it('redo clears currentHint', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 2 as const,
      history: { past: [], future: [{ cells: initialEmptyState.cells, pencilMode: false }] },
    };
    const next = redo(state);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: failures — `requestHint is not a function` (or similar).

- [ ] **Step 3: Update `src/game/types.ts`**

Replace the entire file with:

```ts
import type { Cell, CellCoord, Digit, Puzzle } from '../types';
import type { Step } from '../solver/types';

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
  currentHint: Step | null;
  hintLevel: 1 | 2 | 3 | 4;
};

export type GameStore = GameState & {
  loadPuzzle: (puzzle: Puzzle) => void;
  selectCell: (coord: CellCoord | null) => void;
  setSelectedNumber: (n: Digit | null) => void;
  placeDigit: (d: Digit) => void;
  eraseCell: () => void;
  togglePencilMark: (d: Digit) => void;
  togglePencilMode: () => void;
  fillCandidates: () => void;
  requestHint: () => void;
  advanceHint: () => void;
  dismissHint: () => void;
  undo: () => void;
  redo: () => void;
};
```

- [ ] **Step 4: Update `src/game/reducers.ts`**

Replace the entire file with:

```ts
import type { Cell, CellCoord, Digit, Puzzle } from '../types';
import { cloneCells, computeCandidates, empty9x9 } from './helpers';
import { peersOf } from '../solver/units';
import { getHint } from '../hints/engine';
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
  currentHint: null,
  hintLevel: 1,
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
    currentHint: null,
    hintLevel: 1,
  };
}

export function selectCell(state: GameState, coord: CellCoord | null): GameState {
  return { ...state, selection: { ...state.selection, cell: coord } };
}

export function setSelectedNumber(state: GameState, n: Digit | null): GameState {
  return { ...state, selection: { ...state.selection, number: n } };
}

function isConflictingPlacement(cells: Cell[][], sel: CellCoord, digit: Digit): boolean {
  return peersOf(sel).some((peer) => cells[peer.row]![peer.col]!.value === digit);
}

export function placeDigit(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const nextCells = cloneCells(state.cells);
  nextCells[sel.row]![sel.col]!.value = digit;
  for (const peer of peersOf(sel)) {
    nextCells[peer.row]![peer.col]!.pencilMarks.delete(digit);
  }
  const conflicted = isConflictingPlacement(state.cells, sel, digit);
  return {
    ...state,
    cells: nextCells,
    mistakes: conflicted ? state.mistakes + 1 : state.mistakes,
  };
}

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

export function withSnapshot(state: GameState, mutate: (s: GameState) => GameState): GameState {
  const snapshot: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
  const next = mutate(state);
  if (next === state) return state;
  return {
    ...next,
    currentHint: null,
    hintLevel: 1,
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
    currentHint: null,
    hintLevel: 1,
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
    currentHint: null,
    hintLevel: 1,
    history: {
      past: [...state.history.past, current],
      future: state.history.future.slice(0, -1),
    },
  };
}

export function fillCandidates(state: GameState): GameState {
  return { ...state, cells: computeCandidates(state.cells) };
}

export function requestHint(state: GameState): GameState {
  const hint = getHint(state.cells);
  return { ...state, currentHint: hint, hintLevel: 1 };
}

export function advanceHint(state: GameState): GameState {
  if (state.currentHint === null) return state;
  if (state.hintLevel >= 4) return state;
  return { ...state, hintLevel: (state.hintLevel + 1) as 1 | 2 | 3 | 4 };
}

export function dismissHint(state: GameState): GameState {
  return { ...state, currentHint: null, hintLevel: 1 };
}

// Re-export shared types for convenience.
export type { GameSnapshot, GameState };
```

- [ ] **Step 5: Update `src/game/store.ts`**

Replace the entire file with:

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
  fillCandidates: () => set((s) => withSnapshot(s, reducers.fillCandidates)),

  requestHint: () => set((s) => reducers.requestHint(s)),
  advanceHint: () => set((s) => reducers.advanceHint(s)),
  dismissHint: () => set((s) => reducers.dismissHint(s)),

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
  const snapshot: GameState = {
    puzzle: state.puzzle,
    cells: state.cells,
    given: state.given,
    selection: state.selection,
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    elapsedMs: state.elapsedMs,
    history: state.history,
    currentHint: null,
    hintLevel: 1,
  };
  persistence.save(snapshot);
});
```

- [ ] **Step 6: Run all tests and typecheck**

```bash
npx vitest run && npm run typecheck
```

Expected: all tests pass, no type errors. The reducer tests added in Step 1 should now pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/types.ts src/game/reducers.ts src/game/reducers.test.ts src/game/store.ts
git commit -m "feat(game): add currentHint/hintLevel state and hint reducers"
```

---

## Task 3: Highlights — `'hint'` tier + CSS tokens

**Files:**

- Modify: `src/game/highlights.ts`
- Modify: `src/game/highlights.test.ts`
- Modify: `src/styles/tokens.css`
- Modify: `src/game/Cell.css`

- [ ] **Step 1: Add failing tests to `highlights.test.ts`**

Add `type { Step }` to the imports at the top of `src/game/highlights.test.ts`:

```ts
import type { Step } from '../solver/types';
```

Append this `describe` block to the end of `src/game/highlights.test.ts`:

```ts
describe('hint tier', () => {
  const mockStep: Step = {
    technique: 'nakedSingle',
    highlights: [{ row: 2, col: 3 }],
    placements: [],
    eliminations: [],
    explanation: 'test',
  };

  it('marks highlighted cells as "hint" when hintLevel is 3', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 3 as const,
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBe('hint');
  });

  it('marks highlighted cells as "hint" when hintLevel is 4', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 4 as const,
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBe('hint');
  });

  it('does NOT mark highlighted cells when hintLevel is less than 3', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 2 as const,
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBeNull();
  });

  it('"conflict" beats "hint": a hint cell that also conflicts shows "conflict"', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[2]![3]!.value = 5 as Digit;
    cells[2]![5]!.value = 5 as Digit; // conflict in row 2
    const state = {
      ...initialEmptyState,
      cells,
      currentHint: mockStep,
      hintLevel: 3 as const,
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBe('conflict');
  });

  it('"selected" beats "hint": the selected hint cell shows "selected"', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 3 as const,
      selection: { cell: { row: 2, col: 3 }, number: null },
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBe('selected');
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/game/highlights.test.ts
```

Expected: failures — `getHighlights` doesn't accept `currentHint`/`hintLevel` yet.

- [ ] **Step 3: Update `src/game/highlights.ts`**

Replace the entire file with:

```ts
import { computeCandidates } from '../solver/candidates';
import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
import type { GameState } from './types';

export type CellHighlight =
  | 'selected'
  | 'selected-pencil'
  | 'conflict'
  | 'hint'
  | 'peer'
  | 'possible'
  | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<
    GameState,
    'cells' | 'given' | 'selection' | 'pencilMode' | 'currentHint' | 'hintLevel'
  >,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  if (state.selection.number !== null) {
    const values = state.cells.map((row) => row.map((c) => c.value));
    const candidates = computeCandidates(values);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.cells[r]![c]!.value === null && candidates[r]![c]!.has(state.selection.number)) {
          map[r]![c] = 'possible';
        }
      }
    }
  }

  if (state.hintLevel >= 3 && state.currentHint !== null) {
    for (const coord of state.currentHint.highlights) {
      map[coord.row]![coord.col] = 'hint';
    }
  }

  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  for (const unit of [...rowsOf(), ...colsOf(), ...boxesOf()]) {
    const seen = new Map<Digit, CellCoord[]>();
    for (const coord of unit) {
      const v = state.cells[coord.row]![coord.col]!.value;
      if (v !== null) {
        const existing = seen.get(v) ?? [];
        existing.push(coord);
        seen.set(v, existing);
      }
    }
    for (const coords of seen.values()) {
      if (coords.length > 1) {
        for (const coord of coords) {
          map[coord.row]![coord.col] = 'conflict';
        }
      }
    }
  }

  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = state.pencilMode ? 'selected-pencil' : 'selected';
  }

  return map;
}
```

- [ ] **Step 4: Add `--cell-hint` to `src/styles/tokens.css`**

In the `:root` block, add after `--cell-conflict-fg`:

```css
--cell-hint: #e0f2fe;
```

In the `html[data-theme='dark']` block, add after `--cell-conflict-fg`:

```css
--cell-hint: #0c4a6e;
```

In the `@media (prefers-color-scheme: dark)` block, add after `--cell-conflict-fg`:

```css
--cell-hint: #0c4a6e;
```

- [ ] **Step 5: Add `.cell--hint` to `src/game/Cell.css`**

Append to the end of `src/game/Cell.css`:

```css
.cell--hint {
  background: var(--cell-hint);
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/highlights.ts src/game/highlights.test.ts src/styles/tokens.css src/game/Cell.css
git commit -m "feat(game): add hint highlight tier to getHighlights"
```

---

## Task 4: Board wiring

**Files:**

- Modify: `src/game/Board.tsx`

- [ ] **Step 1: Update `src/game/Board.tsx`**

Replace the entire file with:

```tsx
import './Board.css';
import { useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { getHighlights } from './highlights';
import { handleKey } from './keyboard';
import { Cell } from './Cell';

export function Board() {
  const cells = useGameStore((s) => s.cells);
  const given = useGameStore((s) => s.given);
  const selection = useGameStore((s) => s.selection);
  const pencilMode = useGameStore((s) => s.pencilMode);
  const currentHint = useGameStore((s) => s.currentHint);
  const hintLevel = useGameStore((s) => s.hintLevel);
  const boardRef = useRef<HTMLDivElement>(null);

  const highlights = getHighlights({ cells, given, selection, pencilMode, currentHint, hintLevel });

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) =>
      handleKey(e, useGameStore.getState(), useGameStore.getState());
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, []);

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]');
    const store = useGameStore.getState();
    if (!target) {
      store.selectCell(null);
      store.setSelectedNumber(null);
      return;
    }
    const row = parseInt(target.dataset.row!, 10);
    const col = parseInt(target.dataset.col!, 10);
    if (store.selection.cell?.row === row && store.selection.cell?.col === col) {
      store.selectCell(null);
      store.setSelectedNumber(null);
    } else {
      store.selectCell({ row, col });
      store.setSelectedNumber(store.cells[row]![col]!.value);
    }
  };

  return (
    <div
      className="board"
      role="grid"
      aria-label="Sudoku board"
      tabIndex={0}
      ref={boardRef}
      onClick={handleBoardClick}
    >
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (
          <Cell key={`${r}-${c}`} row={r} col={c} highlight={highlights[r]![c]!} />
        )),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests and typecheck**

```bash
npx vitest run && npm run typecheck
```

Expected: all tests pass, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/Board.tsx
git commit -m "feat(game): pass currentHint and hintLevel to getHighlights in Board"
```

---

## Task 5: HintPanel component + app integration

**Files:**

- Create: `src/hints/HintPanel.tsx`
- Create: `src/hints/HintPanel.css`
- Create: `src/hints/HintPanel.test.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Create `src/hints/HintPanel.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { initialEmptyState } from '../game/reducers';
import { useGameStore } from '../game/store';
import { HintPanel } from './HintPanel';
import type { Step } from '../solver/types';
import type { Digit } from '../types';

const mockStep: Step = {
  technique: 'nakedSingle',
  highlights: [{ row: 0, col: 8 }],
  placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
  eliminations: [],
  explanation: 'Cell (0,8) is the only cell in row 0 that can contain 9.',
};

describe('HintPanel', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('shows a Hint button when no hint is active', () => {
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /^hint$/i })).toBeTruthy();
  });

  it('shows level-1 text when hintLevel is 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByText } = render(<HintPanel />);
    expect(getByText(/there is a technique you can apply/i)).toBeTruthy();
  });

  it('shows technique name at level 2', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    const { getByText } = render(<HintPanel />);
    expect(getByText('Naked Single')).toBeTruthy();
  });

  it('shows Show more button at level 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /show more/i })).toBeTruthy();
  });

  it('hides Show more button at level 4', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 4 });
    const { queryByRole } = render(<HintPanel />);
    expect(queryByRole('button', { name: /show more/i })).toBeNull();
  });

  it('shows dismiss button when hint is active', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /dismiss hint/i })).toBeTruthy();
  });

  it('clicking Hint button on empty board leaves currentHint null', () => {
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /^hint$/i }));
    expect(useGameStore.getState().currentHint).toBeNull();
  });

  it('clicking Show more advances hintLevel', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /show more/i }));
    expect(useGameStore.getState().hintLevel).toBe(2);
  });

  it('clicking dismiss clears currentHint', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /dismiss hint/i }));
    expect(useGameStore.getState().currentHint).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/hints/HintPanel.test.tsx
```

Expected: error — `Cannot find module './HintPanel'`.

- [ ] **Step 3: Create `src/hints/HintPanel.tsx`**

```tsx
import './HintPanel.css';
import { useGameStore } from '../game/store';
import { TECHNIQUE_LABELS } from './engine';

export function HintPanel() {
  const currentHint = useGameStore((s) => s.currentHint);
  const hintLevel = useGameStore((s) => s.hintLevel);

  const handleRequestHint = () => useGameStore.getState().requestHint();
  const handleAdvanceHint = () => useGameStore.getState().advanceHint();
  const handleDismissHint = () => useGameStore.getState().dismissHint();

  if (currentHint === null) {
    return (
      <div className="hint-panel">
        <button className="hint-panel__request" onClick={handleRequestHint}>
          Hint
        </button>
      </div>
    );
  }

  return (
    <div className="hint-panel hint-panel--active">
      <button className="hint-panel__dismiss" onClick={handleDismissHint} aria-label="Dismiss hint">
        ×
      </button>
      <div className="hint-panel__content">
        {hintLevel === 1 && <span>There is a technique you can apply.</span>}
        {hintLevel >= 2 && <span>{TECHNIQUE_LABELS[currentHint.technique]}</span>}
        {hintLevel >= 4 && <p className="hint-panel__explanation">{currentHint.explanation}</p>}
      </div>
      {hintLevel < 4 && (
        <button className="hint-panel__more" onClick={handleAdvanceHint}>
          Show more
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/hints/HintPanel.css`**

```css
.hint-panel {
  display: flex;
  align-items: center;
  width: min(100%, 500px);
  gap: 8px;
  margin-top: 8px;
  min-height: 44px;
}

.hint-panel__request {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 0.875rem;
  min-height: 44px;
}

.hint-panel--active {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 12px;
}

.hint-panel__dismiss {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--fg-muted);
  font-size: 1.25rem;
  line-height: 1;
  padding: 0 4px;
  flex-shrink: 0;
}

.hint-panel__content {
  flex: 1;
  font-size: 0.875rem;
  color: var(--fg);
}

.hint-panel__explanation {
  margin: 4px 0 0;
  font-size: 0.8125rem;
  color: var(--fg-muted);
  line-height: 1.4;
}

.hint-panel__more {
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 0.8125rem;
  flex-shrink: 0;
}
```

- [ ] **Step 5: Update `src/app.tsx`**

Replace the entire file with:

```tsx
import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
import { HintPanel } from './hints/HintPanel';
import { NumberPad } from './game/NumberPad';
import { useGameStore } from './game/store';

export function App() {
  const handleMainClick = () => {
    const store = useGameStore.getState();
    store.selectCell(null);
    store.setSelectedNumber(null);
  };

  return (
    <main onClick={handleMainClick}>
      <h1>Sudoku</h1>
      <Board />
      <ActionBar />
      <HintPanel />
      <NumberPad />
    </main>
  );
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (~379 existing + 3 engine + ~9 reducers + 5 highlights + 9 HintPanel = ~405 total).

- [ ] **Step 7: Commit**

```bash
git add src/hints/HintPanel.tsx src/hints/HintPanel.css src/hints/HintPanel.test.tsx src/app.tsx
git commit -m "feat(hints): add HintPanel component and render in App"
```

---

## Acceptance checklist

- [ ] "Hint" button visible in the panel row below ActionBar
- [ ] Pressing it on an empty board does nothing (no hint available)
- [ ] Pressing it on a board with a naked single shows level-1 text
- [ ] "Show more" advances through levels 1→2→3→4
- [ ] At level 3+, relevant cells are highlighted in light blue on the board
- [ ] At level 4, `step.explanation` text is shown
- [ ] Any digit placement, erase, undo, or redo auto-dismisses the hint
- [ ] "×" button dismisses the hint manually
- [ ] All ~405 tests pass
- [ ] `npm run typecheck` is clean
- [ ] No regressions in any earlier-phase tests
