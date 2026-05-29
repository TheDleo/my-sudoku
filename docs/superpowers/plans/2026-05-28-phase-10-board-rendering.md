# Phase 10: Board and Cell Rendering — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a static 9×9 Sudoku board from Zustand store state with four highlight layers (selected, peer, conflict, possible-placement) and per-cell digit/pencil-mark rendering.

**Architecture:** A pure `getHighlights()` selector computes the full highlight map once per Board render and passes each Cell its tier as a prop. `Board` subscribes to `cells`, `given`, and `selection`; each `Cell` subscribes only to its own `cells[r][c]` and `given[r][c]` slices. CSS custom properties from `tokens.css` handle all theming.

**Tech Stack:** React 18, Zustand 4, TypeScript, Vitest, @testing-library/react, @testing-library/jest-dom, plain CSS (co-located with components).

---

## File Map

**New files**

- `src/game/testHelpers.ts` — canonical `makePuzzle()` factory shared across all game tests
- `src/game/highlights.ts` — `CellHighlight`, `HighlightMap`, `getHighlights()`
- `src/game/highlights.test.ts` — pure unit tests for the highlights selector
- `src/game/Cell.tsx` — single-cell component: digit or pencil marks + highlight class
- `src/game/Cell.css` — cell layout, highlight, and digit/pencil-mark styles
- `src/game/Cell.test.tsx` — RTL component tests for Cell
- `src/game/Board.tsx` — 9×9 CSS Grid that calls `getHighlights` and renders 81 Cells
- `src/game/Board.css` — grid layout and thick-border nth-child selectors
- `src/game/Board.test.tsx` — RTL component tests for Board

**Modified files**

- `src/game/reducers.test.ts` — remove local `makePuzzle`, import from testHelpers
- `src/game/persistence.test.ts` — remove local `makePuzzle`, update two `id` assertions `'p'` → `'test'`, import from testHelpers
- `src/game/store.test.ts` — remove local `makePuzzle`, import from testHelpers
- `src/app.tsx` — mount `<Board />` below the heading

---

## Task 1: Extract shared `makePuzzle` test helper

**Files:**

- Create: `src/game/testHelpers.ts`
- Modify: `src/game/reducers.test.ts`
- Modify: `src/game/persistence.test.ts`
- Modify: `src/game/store.test.ts`

- [ ] **Step 1: Create `src/game/testHelpers.ts`**

```ts
import type { Digit, Puzzle } from '../types';

export function makePuzzle(): Puzzle {
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
```

- [ ] **Step 2: Update `src/game/reducers.test.ts`**

Remove the local `makePuzzle` function (lines 18–28). Change the import block to:

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import {
  eraseCell,
  initialEmptyState,
  loadPuzzle,
  placeDigit,
  redo,
  selectCell,
  setSelectedNumber,
  togglePencilMark,
  togglePencilMode,
  undo,
  withSnapshot,
} from './reducers';
import { cloneCells as cloneCellsForTest } from './helpers';
import { makePuzzle } from './testHelpers';
```

- [ ] **Step 3: Update `src/game/persistence.test.ts`**

Remove the local `makePuzzle` function (lines 6–15). Change the import block to:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit } from '../types';
import { initialEmptyState, loadPuzzle, togglePencilMark, selectCell } from './reducers';
import { deserialize, load, save, serialize, STORAGE_KEY } from './persistence';
import { makePuzzle } from './testHelpers';
```

Update the two `id` assertions that reference `'p'` (in the `load / save` describe block) to reference `'test'`:

```ts
expect(parsed!.puzzle.id).toBe('test');
// and
expect(restored!.puzzle.id).toBe('test');
```

- [ ] **Step 4: Update `src/game/store.test.ts`**

Remove the local `makePuzzle` function (lines 7–16). Change the import block to:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit } from '../types';
import * as persistence from './persistence';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { makePuzzle } from './testHelpers';
```

- [ ] **Step 5: Run the full test suite**

```
npm test
```

Expected: 264 tests pass, 0 fail. If any assertion fails on `puzzle.id`, verify the two persistence.test.ts assertions were updated to `'test'`.

- [ ] **Step 6: Commit**

```bash
git add src/game/testHelpers.ts src/game/reducers.test.ts src/game/persistence.test.ts src/game/store.test.ts
git commit -m "refactor(game): extract makePuzzle into shared testHelpers"
```

---

## Task 2: `highlights.ts` — types, selected, peer

**Files:**

- Create: `src/game/highlights.test.ts`
- Create: `src/game/highlights.ts`

- [ ] **Step 1: Create `src/game/highlights.test.ts` with selected/peer tests**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { getHighlights } from './highlights';

describe('getHighlights', () => {
  describe('empty state', () => {
    it('returns an all-null 9×9 map when there is no selection', () => {
      const map = getHighlights(initialEmptyState);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(map[r]![c]).toBeNull();
        }
      }
    });
  });

  describe('selected', () => {
    it('marks the selected cell as "selected"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 2, col: 3 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[2]![3]).toBe('selected');
    });

    it('returns all-null when selection.cell is null', () => {
      const map = getHighlights(initialEmptyState);
      expect(map[4]![4]).toBeNull();
    });
  });

  describe('peer', () => {
    it('marks cells in the same row as the selected cell as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[0]![1]).toBe('peer');
      expect(map[0]![8]).toBe('peer');
    });

    it('marks cells in the same column as the selected cell as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[1]![0]).toBe('peer');
      expect(map[8]![0]).toBe('peer');
    });

    it('marks cells in the same box as the selected cell as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[1]![1]).toBe('peer');
      expect(map[2]![2]).toBe('peer');
    });

    it('does not mark unrelated cells as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[3]![3]).toBeNull();
      expect(map[5]![7]).toBeNull();
    });

    it('the selected cell itself is "selected", not "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('selected');
    });
  });
});
```

- [ ] **Step 2: Create `src/game/highlights.ts` with a skeleton that returns all null**

```ts
import { peersOf } from '../solver/units';
import type { GameState } from './types';

export type CellHighlight = 'selected' | 'conflict' | 'peer' | 'possible' | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection'>,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );
  return map;
}
```

- [ ] **Step 3: Run the highlights tests — expect selected/peer tests to fail**

```
npx vitest run src/game/highlights.test.ts
```

Expected: the `all-null` test passes; all `selected` and `peer` tests fail with messages like `expected null to be 'selected'`.

- [ ] **Step 4: Implement selected and peer logic in `highlights.ts`**

Replace the body of `getHighlights` with:

```ts
export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection'>,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  // Peer (lower priority — overwritten by conflict and selected below)
  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  // Selected (highest priority so far)
  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = 'selected';
  }

  return map;
}
```

- [ ] **Step 5: Run the highlights tests — expect all to pass**

```
npx vitest run src/game/highlights.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Run the full suite to confirm no regressions**

```
npm test
```

Expected: all 264 + new highlights tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/highlights.ts src/game/highlights.test.ts
git commit -m "feat(game): add highlights selector — selected and peer tiers"
```

---

## Task 3: `highlights.ts` — conflict detection

**Files:**

- Modify: `src/game/highlights.test.ts`
- Modify: `src/game/highlights.ts`

- [ ] **Step 1: Add conflict tests to `src/game/highlights.test.ts`**

Add the following imports at the top of the file (after the existing imports):

```ts
import { cloneCells } from './helpers';
```

Append this `describe` block inside the outer `describe('getHighlights', ...)`, after the `peer` block:

```ts
describe('conflict', () => {
  it('marks both cells as "conflict" when two cells share the same digit in the same row', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 5 as Digit;
    cells[0]![3]!.value = 5 as Digit;
    const state = { ...initialEmptyState, cells };
    const map = getHighlights(state);
    expect(map[0]![0]).toBe('conflict');
    expect(map[0]![3]).toBe('conflict');
    expect(map[1]![0]).toBeNull();
  });

  it('marks both cells as "conflict" when two cells share the same digit in the same column', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 3 as Digit;
    cells[5]![0]!.value = 3 as Digit;
    const state = { ...initialEmptyState, cells };
    const map = getHighlights(state);
    expect(map[0]![0]).toBe('conflict');
    expect(map[5]![0]).toBe('conflict');
  });

  it('marks both cells as "conflict" when two cells share the same digit in the same box', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 7 as Digit;
    cells[2]![2]!.value = 7 as Digit;
    const state = { ...initialEmptyState, cells };
    const map = getHighlights(state);
    expect(map[0]![0]).toBe('conflict');
    expect(map[2]![2]).toBe('conflict');
  });

  it('does not mark unique digits as conflicts', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 5 as Digit;
    cells[0]![3]!.value = 6 as Digit;
    const state = { ...initialEmptyState, cells };
    const map = getHighlights(state);
    expect(map[0]![0]).toBeNull();
    expect(map[0]![3]).toBeNull();
  });
});
```

- [ ] **Step 2: Run the highlights tests — expect the 4 conflict tests to fail**

```
npx vitest run src/game/highlights.test.ts
```

Expected: previously-passing tests still pass; the 4 new conflict tests fail.

- [ ] **Step 3: Add conflict logic to `highlights.ts`**

Add to the import line at the top:

```ts
import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
```

Insert the conflict block between the peer block and the selected block in `getHighlights`:

```ts
// Conflict (overwrites peer)
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
```

The complete `getHighlights` at this point:

```ts
import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
import type { GameState } from './types';

export type CellHighlight = 'selected' | 'conflict' | 'peer' | 'possible' | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection'>,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  // Peer
  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  // Conflict (overwrites peer)
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

  // Selected (highest priority so far)
  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = 'selected';
  }

  return map;
}
```

- [ ] **Step 4: Run the highlights tests — expect all to pass**

```
npx vitest run src/game/highlights.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run the full suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/highlights.ts src/game/highlights.test.ts
git commit -m "feat(game): add conflict highlight tier to getHighlights"
```

---

## Task 4: `highlights.ts` — possible-placement + priority

**Files:**

- Modify: `src/game/highlights.test.ts`
- Modify: `src/game/highlights.ts`

- [ ] **Step 1: Add possible and priority tests to `highlights.test.ts`**

Append these two `describe` blocks inside the outer `describe('getHighlights', ...)`, after the `conflict` block:

```ts
describe('possible', () => {
  it('marks empty cells whose candidates include selection.number as "possible"', () => {
    // Empty board: every cell is a valid candidate for every digit
    const state = {
      ...initialEmptyState,
      selection: { cell: null, number: 5 as Digit },
    };
    const map = getHighlights(state);
    expect(map[0]![0]).toBe('possible');
    expect(map[4]![4]).toBe('possible');
    expect(map[8]![8]).toBe('possible');
  });

  it('does not mark filled cells as "possible"', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 5 as Digit;
    const state = {
      ...initialEmptyState,
      cells,
      selection: { cell: null, number: 5 as Digit },
    };
    const map = getHighlights(state);
    expect(map[0]![0]).toBeNull();
  });

  it('does not mark cells eliminated from candidates as "possible"', () => {
    // Placing 5 at (0,0) eliminates 5 from all of row 0, col 0, and box 0
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 5 as Digit;
    const state = {
      ...initialEmptyState,
      cells,
      selection: { cell: null, number: 5 as Digit },
    };
    const map = getHighlights(state);
    expect(map[0]![3]).toBeNull(); // same row as (0,0) — 5 eliminated
    expect(map[4]![0]).toBeNull(); // same col as (0,0) — 5 eliminated
    expect(map[1]![1]).toBeNull(); // same box as (0,0) — 5 eliminated
  });

  it('returns all-null when selection.number is null', () => {
    const map = getHighlights(initialEmptyState);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(map[r]![c]).toBeNull();
      }
    }
  });
});

describe('priority', () => {
  it('"selected" beats "conflict": a conflicted cell that is also selected shows "selected"', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 5 as Digit;
    cells[0]![1]!.value = 5 as Digit; // conflict in row 0
    const state = {
      ...initialEmptyState,
      cells,
      selection: { cell: { row: 0, col: 0 }, number: null },
    };
    const map = getHighlights(state);
    expect(map[0]![0]).toBe('selected');
    expect(map[0]![1]).toBe('conflict');
  });

  it('"conflict" beats "peer": a peer cell that also conflicts shows "conflict"', () => {
    const cells = cloneCells(initialEmptyState.cells);
    cells[0]![0]!.value = 5 as Digit;
    cells[0]![1]!.value = 5 as Digit; // (0,1) is a peer of (0,0) AND conflicts
    const state = {
      ...initialEmptyState,
      cells,
      selection: { cell: { row: 0, col: 0 }, number: null },
    };
    const map = getHighlights(state);
    expect(map[0]![1]).toBe('conflict');
  });

  it('"peer" beats "possible": a peer cell that is also a possible placement shows "peer"', () => {
    // Empty board: all cells are candidates for 5
    // (0,1) is both a peer of (0,0) and a possible placement for 5
    const state = {
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: 5 as Digit },
    };
    const map = getHighlights(state);
    expect(map[0]![1]).toBe('peer'); // peer beats possible
    expect(map[0]![0]).toBe('selected'); // selected beats peer and possible
    expect(map[3]![3]).toBe('possible'); // non-peer empty cell with 5 as candidate
  });
});
```

- [ ] **Step 2: Run the highlights tests — expect possible and priority tests to fail**

```
npx vitest run src/game/highlights.test.ts
```

Expected: previously-passing tests still pass; the new possible and priority tests fail.

- [ ] **Step 3: Add `computeCandidates` import and possible logic to `highlights.ts`**

Add to the top-level imports:

```ts
import { computeCandidates } from '../solver/candidates';
```

Insert the possible block at the very start of `getHighlights`, before the peer block:

```ts
// Possible (lowest priority — applied first, overwritten by higher tiers)
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
```

The complete final `src/game/highlights.ts`:

```ts
import { computeCandidates } from '../solver/candidates';
import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
import type { GameState } from './types';

export type CellHighlight = 'selected' | 'conflict' | 'peer' | 'possible' | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection'>,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  // Possible (lowest priority)
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

  // Peer (overwrites possible)
  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  // Conflict (overwrites peer)
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

  // Selected (highest priority)
  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = 'selected';
  }

  return map;
}
```

- [ ] **Step 4: Run the highlights tests — expect all to pass**

```
npx vitest run src/game/highlights.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run the full suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/highlights.ts src/game/highlights.test.ts
git commit -m "feat(game): add possible-placement tier and priority ordering to getHighlights"
```

---

## Task 5: Cell component

**Files:**

- Create: `src/game/Cell.test.tsx`
- Create: `src/game/Cell.css`
- Create: `src/game/Cell.tsx`

- [ ] **Step 1: Create `src/game/Cell.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { cloneCells } from './helpers';
import { Cell } from './Cell';

function seedCell(
  row: number,
  col: number,
  value: Digit | null,
  pencilMarks: Digit[] = [],
  isGiven = false,
) {
  const cells = cloneCells(initialEmptyState.cells);
  cells[row]![col]!.value = value;
  cells[row]![col]!.pencilMarks = new Set(pencilMarks);
  const given = initialEmptyState.given.map((r) => [...r]);
  given[row]![col] = isGiven;
  useGameStore.setState({ cells, given });
}

describe('Cell', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  describe('digit rendering', () => {
    it('renders the digit text when cell has a value', () => {
      seedCell(0, 0, 5 as Digit);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toHaveTextContent('5');
    });

    it('applies the given class to a given digit', () => {
      seedCell(0, 0, 5 as Digit, [], true);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toHaveClass('cell__digit--given');
      expect(container.querySelector('.cell__digit')).not.toHaveClass('cell__digit--user');
    });

    it('applies the user class to a user-entered digit', () => {
      seedCell(0, 0, 5 as Digit, [], false);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toHaveClass('cell__digit--user');
      expect(container.querySelector('.cell__digit')).not.toHaveClass('cell__digit--given');
    });

    it('renders nothing when cell is empty with no pencil marks', () => {
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toBeNull();
      expect(container.querySelector('.cell__pencil-grid')).toBeNull();
    });
  });

  describe('pencil marks', () => {
    it('renders 9 pencil-mark slots when pencilMarks is non-empty', () => {
      seedCell(0, 0, null, [1, 5, 9] as Digit[]);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelectorAll('.cell__pencil-mark')).toHaveLength(9);
    });

    it('shows each mark at its fixed position in the 3×3 grid', () => {
      seedCell(0, 0, null, [1, 5, 9] as Digit[]);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      // Positions 0–8 correspond to digits 1–9
      expect(marks[0]?.textContent).toBe('1');
      expect(marks[4]?.textContent).toBe('5');
      expect(marks[8]?.textContent).toBe('9');
    });

    it('leaves absent marks blank', () => {
      seedCell(0, 0, null, [1] as Digit[]);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      expect(marks[1]?.textContent).toBe(''); // digit 2 not set
    });

    it('does not render the pencil grid when cell has a value', () => {
      seedCell(0, 0, 5 as Digit);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__pencil-grid')).toBeNull();
    });
  });

  describe('highlight classes', () => {
    it('applies .cell--selected for "selected"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="selected" />);
      expect(container.firstElementChild).toHaveClass('cell--selected');
    });

    it('applies .cell--peer for "peer"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="peer" />);
      expect(container.firstElementChild).toHaveClass('cell--peer');
    });

    it('applies .cell--conflict for "conflict"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="conflict" />);
      expect(container.firstElementChild).toHaveClass('cell--conflict');
    });

    it('applies .cell--possible for "possible"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="possible" />);
      expect(container.firstElementChild).toHaveClass('cell--possible');
    });

    it('applies no highlight class when highlight is null', () => {
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect((container.firstElementChild as HTMLElement).className).not.toMatch(/cell--/);
    });
  });
});
```

- [ ] **Step 2: Run Cell tests — expect failure (Cell not yet created)**

```
npx vitest run src/game/Cell.test.tsx
```

Expected: fails with `Cannot find module './Cell'`.

- [ ] **Step 3: Create `src/game/Cell.css`**

```css
.cell {
  background: var(--cell-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.875rem, 3vw, 1.5rem);
  position: relative;
  user-select: none;
}

.cell--selected {
  background: var(--cell-selected);
}

.cell--peer {
  background: var(--cell-peer);
}

.cell--conflict {
  background: var(--cell-conflict);
  color: var(--cell-conflict-fg);
}

.cell--possible {
  background: var(--cell-highlight);
}

.cell__digit {
  line-height: 1;
}

.cell__digit--given {
  color: var(--cell-given);
  font-weight: 700;
}

.cell__digit--user {
  color: var(--cell-user);
  font-weight: 400;
}

.cell__pencil-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  padding: 2px;
}

.cell__pencil-mark {
  font-size: 0.32em;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

- [ ] **Step 4: Create `src/game/Cell.tsx`**

```tsx
import './Cell.css';
import type { Digit } from '../types';
import type { CellHighlight } from './highlights';
import { useGameStore } from './store';

type Props = { row: number; col: number; highlight: CellHighlight };

const PENCIL_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function Cell({ row, col, highlight }: Props) {
  const cell = useGameStore((s) => s.cells[row]![col]!);
  const isGiven = useGameStore((s) => s.given[row]![col]!);

  const highlightClass = highlight !== null ? `cell--${highlight}` : '';

  return (
    <div className={`cell ${highlightClass}`.trim()} data-row={row} data-col={col}>
      {cell.value !== null ? (
        <span className={`cell__digit ${isGiven ? 'cell__digit--given' : 'cell__digit--user'}`}>
          {cell.value}
        </span>
      ) : cell.pencilMarks.size > 0 ? (
        <div className="cell__pencil-grid">
          {PENCIL_POSITIONS.map((d) => (
            <span key={d} className="cell__pencil-mark">
              {cell.pencilMarks.has(d as Digit) ? d : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Run Cell tests — expect all to pass**

```
npx vitest run src/game/Cell.test.tsx
```

Expected: all tests pass.

- [ ] **Step 6: Run the full suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/Cell.tsx src/game/Cell.css src/game/Cell.test.tsx
git commit -m "feat(game): add Cell component with digit, pencil marks, and highlight rendering"
```

---

## Task 6: Board component + App wiring

**Files:**

- Create: `src/game/Board.test.tsx`
- Create: `src/game/Board.css`
- Create: `src/game/Board.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Create `src/game/Board.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { makePuzzle } from './testHelpers';
import { Board } from './Board';

describe('Board', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders exactly 81 cells', () => {
    const { container } = render(<Board />);
    expect(container.querySelectorAll('.cell')).toHaveLength(81);
  });

  it('applies given styling to cells whose given flag is true', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    const { container } = render(<Board />);
    // makePuzzle places a given 5 at (0,0)
    const cell00 = container.querySelector('[data-row="0"][data-col="0"]');
    expect(cell00?.querySelector('.cell__digit--given')).toBeTruthy();
  });

  it('applies user styling to a non-given placed digit', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    const { container } = render(<Board />);
    const cell11 = container.querySelector('[data-row="1"][data-col="1"]');
    expect(cell11?.querySelector('.cell__digit--user')).toBeTruthy();
  });

  it('applies .cell--selected to the selected cell', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 3 }, number: null },
    });
    const { container } = render(<Board />);
    const cell = container.querySelector('[data-row="2"][data-col="3"]');
    expect(cell).toHaveClass('cell--selected');
  });

  it('applies .cell--peer to peers of the selected cell and not to unrelated cells', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: null },
    });
    const { container } = render(<Board />);
    // (0,1) shares row 0 with (0,0) — it is a peer
    const peer = container.querySelector('[data-row="0"][data-col="1"]');
    expect(peer).toHaveClass('cell--peer');
    // (3,3) is not a peer of (0,0)
    const notPeer = container.querySelector('[data-row="3"][data-col="3"]');
    expect(notPeer).not.toHaveClass('cell--peer');
  });
});
```

- [ ] **Step 2: Run Board tests — expect failure (Board not yet created)**

```
npx vitest run src/game/Board.test.tsx
```

Expected: fails with `Cannot find module './Board'`.

- [ ] **Step 3: Create `src/game/Board.css`**

```css
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  aspect-ratio: 1;
  width: min(100%, 500px);
  border: 2px solid var(--fg);
}

/* Thin borders on all cells */
.board .cell {
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

/* No right border on last column — outer board border handles it */
.board .cell:nth-child(9n) {
  border-right: none;
}

/* No bottom border on last row — outer board border handles it */
.board .cell:nth-child(n + 73) {
  border-bottom: none;
}

/* Thick right border after box columns 3 and 6 */
.board .cell:nth-child(9n + 3),
.board .cell:nth-child(9n + 6) {
  border-right: 2px solid var(--fg);
}

/* Thick bottom border after box rows 3 and 6 (cells 19–27 and 46–54) */
.board .cell:nth-child(n + 19):nth-child(-n + 27),
.board .cell:nth-child(n + 46):nth-child(-n + 54) {
  border-bottom: 2px solid var(--fg);
}
```

- [ ] **Step 4: Create `src/game/Board.tsx`**

```tsx
import './Board.css';
import { useGameStore } from './store';
import { getHighlights } from './highlights';
import { Cell } from './Cell';

export function Board() {
  const cells = useGameStore((s) => s.cells);
  const given = useGameStore((s) => s.given);
  const selection = useGameStore((s) => s.selection);

  const highlights = getHighlights({ cells, given, selection });

  return (
    <div className="board" role="grid" aria-label="Sudoku board">
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (
          <Cell key={`${r}-${c}`} row={r} col={c} highlight={highlights[r]![c]!} />
        )),
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run Board tests — expect all to pass**

```
npx vitest run src/game/Board.test.tsx
```

Expected: all tests pass.

- [ ] **Step 6: Update `src/app.tsx`**

Replace the entire file with:

```tsx
import { Board } from './game/Board';

export function App() {
  return (
    <main>
      <h1>Sudoku</h1>
      <Board />
    </main>
  );
}
```

- [ ] **Step 7: Run the app.test.tsx suite to confirm the heading test still passes**

```
npx vitest run src/app.test.tsx
```

Expected: 1 test passes (`renders the Sudoku heading`).

- [ ] **Step 8: Run the full test suite**

```
npm test
```

Expected: all tests pass (264 original + ~25 new ≈ 289 total).

- [ ] **Step 9: Commit**

```bash
git add src/game/Board.tsx src/game/Board.css src/game/Board.test.tsx src/app.tsx
git commit -m "feat(game): add Board component and wire into App"
```
