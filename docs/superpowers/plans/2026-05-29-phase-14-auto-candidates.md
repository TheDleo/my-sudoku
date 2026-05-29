# Phase 14: Auto-Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Candidates" button to `ActionBar` that merges computed valid candidates into every empty cell's pencil marks as a single undoable step.

**Architecture:** A pure `computeCandidates(cells)` helper in `helpers.ts` computes valid digits per empty cell (using `peersOf`) and unions them with existing pencil marks. A `fillCandidates` reducer in `reducers.ts` calls it and returns the updated state. The store wires it with `withSnapshot` for undo. `ActionBar` gains a second button that dispatches the action.

**Tech Stack:** React, Zustand (`useGameStore`), Vitest, React Testing Library

---

## File map

| File                          | Action | Responsibility                                  |
| ----------------------------- | ------ | ----------------------------------------------- |
| `src/game/helpers.ts`         | Modify | Add `computeCandidates(cells)` pure function    |
| `src/game/helpers.test.ts`    | Modify | Unit tests for `computeCandidates`              |
| `src/game/reducers.ts`        | Modify | Add `fillCandidates` reducer                    |
| `src/game/reducers.test.ts`   | Modify | Tests for `fillCandidates`                      |
| `src/game/types.ts`           | Modify | Add `fillCandidates: () => void` to `GameStore` |
| `src/game/store.ts`           | Modify | Wire `fillCandidates` action                    |
| `src/game/ActionBar.tsx`      | Modify | Add "Candidates" button                         |
| `src/game/ActionBar.test.tsx` | Modify | RTL test for the new button                     |

---

## Task 1: `computeCandidates` helper

**Files:**

- Modify: `src/game/helpers.ts`
- Modify: `src/game/helpers.test.ts`

- [ ] **Step 1: Add 5 failing tests to `helpers.test.ts`**

Append this `describe` block to the end of `src/game/helpers.test.ts`:

```ts
describe('computeCandidates', () => {
  it('gives every empty cell all 9 candidates on an empty board', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    const result = computeCandidates(cells);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result[r]![c]!.pencilMarks.size).toBe(9);
      }
    }
  });

  it('excludes digits already placed in peer cells', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Place 1–5 in row-0 peers of (0,0)
    cells[0]![1]!.value = 1 as Digit;
    cells[0]![2]!.value = 2 as Digit;
    cells[0]![3]!.value = 3 as Digit;
    cells[0]![4]!.value = 4 as Digit;
    cells[0]![5]!.value = 5 as Digit;
    const result = computeCandidates(cells);
    const marks = result[0]![0]!.pencilMarks;
    expect(marks.has(1 as Digit)).toBe(false);
    expect(marks.has(5 as Digit)).toBe(false);
    expect(marks.has(6 as Digit)).toBe(true);
    expect(marks.has(9 as Digit)).toBe(true);
  });

  it('preserves an existing pencil mark that is a valid candidate (union)', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    cells[0]![0]!.pencilMarks.add(6 as Digit);
    const result = computeCandidates(cells);
    expect(result[0]![0]!.pencilMarks.has(6 as Digit)).toBe(true);
  });

  it('preserves an existing pencil mark that is NOT a valid candidate (no removal)', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Peer (0,1) has 1 → 1 is invalid for (0,0), but the existing mark must survive
    cells[0]![1]!.value = 1 as Digit;
    cells[0]![0]!.pencilMarks.add(1 as Digit);
    const result = computeCandidates(cells);
    expect(result[0]![0]!.pencilMarks.has(1 as Digit)).toBe(true);
  });

  it('leaves a cell with a placed value completely untouched', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    cells[0]![0]!.value = 5 as Digit;
    const result = computeCandidates(cells);
    expect(result[0]![0]!.value).toBe(5);
    expect(result[0]![0]!.pencilMarks.size).toBe(0);
  });
});
```

Also update the top import line in `helpers.test.ts` to include `computeCandidates`:

```ts
import { cloneCells, computeCandidates, empty9x9, getRemainingCounts } from './helpers';
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/game/helpers.test.ts
```

Expected: 5 failures — `computeCandidates is not a function` (or similar import error).

- [ ] **Step 3: Implement `computeCandidates` in `helpers.ts`**

Add the following import at the top of `src/game/helpers.ts` (after the existing import):

```ts
import { peersOf } from '../solver/units';
```

Then append this function to the end of `src/game/helpers.ts`:

```ts
export function computeCandidates(cells: Cell[][]): Cell[][] {
  return cells.map((row, r) =>
    row.map((cell, c) => {
      if (cell.value !== null) return cell;
      const peerValues = new Set<Digit>();
      for (const p of peersOf({ row: r, col: c })) {
        const v = cells[p.row]![p.col]!.value;
        if (v !== null) peerValues.add(v);
      }
      const valid = (DIGITS as readonly Digit[]).filter((d) => !peerValues.has(d));
      return {
        value: null,
        pencilMarks: new Set<Digit>([...cell.pencilMarks, ...valid]),
      };
    }),
  );
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/game/helpers.test.ts
```

Expected: all tests pass (3 existing + 5 new = 8 total).

- [ ] **Step 5: Commit**

```bash
git add src/game/helpers.ts src/game/helpers.test.ts
git commit -m "feat(game): add computeCandidates helper"
```

---

## Task 2: `fillCandidates` reducer

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

- [ ] **Step 1: Add 2 failing tests to `reducers.test.ts`**

Update the import at the top of `src/game/reducers.test.ts` to include `fillCandidates`:

```ts
import {
  eraseCell,
  fillCandidates,
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
```

Then append this `describe` block to the end of `src/game/reducers.test.ts`:

```ts
describe('fillCandidates', () => {
  it('fills valid candidates into empty cells', () => {
    // makePuzzle sets (0,0)=5 and (4,4)=7; cell (1,1) is empty.
    // (0,0) is in the same box as (1,1), so 5 must not appear as a candidate.
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const next = withSnapshot(loaded, fillCandidates);
    const marks = next.cells[1]![1]!.pencilMarks;
    expect(marks.has(5 as Digit)).toBe(false);
    expect(marks.size).toBeGreaterThan(0);
  });

  it('undo after fillCandidates restores the prior empty pencil marks', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const filled = withSnapshot(loaded, fillCandidates);
    expect(filled.cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
    const reverted = undo(filled);
    expect(reverted.cells[1]![1]!.pencilMarks.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: 2 failures — `fillCandidates is not a function`.

- [ ] **Step 3: Implement `fillCandidates` in `reducers.ts`**

Add `computeCandidates` to the import from `./helpers` at the top of `src/game/reducers.ts`:

```ts
import { cloneCells, computeCandidates, empty9x9 } from './helpers';
```

Then append this function to the end of `src/game/reducers.ts` (before the re-export comment):

```ts
export function fillCandidates(state: GameState): GameState {
  return { ...state, cells: computeCandidates(state.cells) };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: all tests pass (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add fillCandidates reducer"
```

---

## Task 3: Wire `fillCandidates` in store types and store

**Files:**

- Modify: `src/game/types.ts`
- Modify: `src/game/store.ts`

- [ ] **Step 1: Add `fillCandidates` to `GameStore` in `types.ts`**

In `src/game/types.ts`, add `fillCandidates: () => void` to the `GameStore` type after `togglePencilMode`:

```ts
export type GameStore = GameState & {
  loadPuzzle: (puzzle: Puzzle) => void;
  selectCell: (coord: CellCoord | null) => void;
  setSelectedNumber: (n: Digit | null) => void;
  placeDigit: (d: Digit) => void;
  eraseCell: () => void;
  togglePencilMark: (d: Digit) => void;
  togglePencilMode: () => void;
  fillCandidates: () => void;
  undo: () => void;
  redo: () => void;
};
```

- [ ] **Step 2: Wire the action in `store.ts`**

In `src/game/store.ts`, add `fillCandidates` after `togglePencilMode`:

```ts
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

  undo: () => set(reducers.undo),
  redo: () => set(reducers.redo),
}));
```

- [ ] **Step 3: Run all tests and typecheck**

```bash
npx vitest run && npm run typecheck
```

Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts src/game/store.ts
git commit -m "feat(game): wire fillCandidates action in store"
```

---

## Task 4: "Candidates" button in `ActionBar`

**Files:**

- Modify: `src/game/ActionBar.tsx`
- Modify: `src/game/ActionBar.test.tsx`

- [ ] **Step 1: Add 2 failing tests to `ActionBar.test.tsx`**

Update the imports at the top of `src/game/ActionBar.test.tsx` to include `loadPuzzle`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { initialEmptyState, loadPuzzle } from './reducers';
import { useGameStore } from './store';
import { ActionBar } from './ActionBar';
import { makePuzzle } from './testHelpers';
```

Then append these two tests inside the existing `describe('ActionBar', ...)` block, before the closing `});`:

```ts
  it('renders a candidates button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /candidates/i })).toBeTruthy();
  });

  it('clicking the candidates button fills candidates into empty cells', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    useGameStore.setState({ ...loaded });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /candidates/i }));
    // (1,1) is empty in makePuzzle; after fill it must have candidates
    expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/game/ActionBar.test.tsx
```

Expected: 2 failures — button not found.

- [ ] **Step 3: Add the "Candidates" button to `ActionBar.tsx`**

Replace the contents of `src/game/ActionBar.tsx` with:

```tsx
import './ActionBar.css';
import { useGameStore } from './store';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);

  const handlePencilToggle = () => {
    useGameStore.getState().togglePencilMode();
  };

  const handleFillCandidates = () => {
    useGameStore.getState().fillCandidates();
  };

  return (
    <div className="action-bar" onClick={(e) => e.stopPropagation()}>
      <button
        className={`action-bar__pencil${pencilMode ? ' action-bar__pencil--active' : ''}`}
        aria-pressed={pencilMode}
        onClick={handlePencilToggle}
      >
        ✏️ Pencil
      </button>
      <button className="action-bar__candidates" onClick={handleFillCandidates}>
        Candidates
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npx vitest run
```

Expected: all tests pass (355 existing + 5 helpers + 2 reducers + 2 ActionBar = 364 total).

- [ ] **Step 5: Commit**

```bash
git add src/game/ActionBar.tsx src/game/ActionBar.test.tsx
git commit -m "feat(game): add Candidates button to ActionBar"
```

---

## Acceptance checklist

- [ ] `computeCandidates` returns all 9 candidates for a fully empty board
- [ ] `computeCandidates` excludes digits present in peer cells
- [ ] Existing pencil marks are never removed (union semantics)
- [ ] Cells with placed values are untouched
- [ ] Undo after "Fill candidates" restores the previous pencil mark state
- [ ] "Candidates" button is visible in `ActionBar`
- [ ] Clicking it populates candidates on the current board
- [ ] All 364 tests pass
- [ ] `npm run typecheck` is clean
- [ ] No regressions in any earlier-phase tests
