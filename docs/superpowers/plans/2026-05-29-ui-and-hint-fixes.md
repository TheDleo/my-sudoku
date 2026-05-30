# UI and Hint Engine Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four issues in the Sudoku app: larger pencil marks, green-circle highlight on matching pencil marks when a number is selected, auto-highlight candidate cells after placing a digit, and a hint engine bug where removing pencil marks didn't prevent the same hint repeating.

**Architecture:** Three logic fixes (one reducer change, one engine change, one CSS change) and one new UI feature (pencil mark highlight). The reducer and engine fixes are pure functions tested with unit tests. The UI feature adds a single store selector to `Cell` and a new CSS class.

**Tech Stack:** React, TypeScript, Zustand, CSS Modules-style BEM classes, Vitest + Testing Library

---

## File Map

| File                        | What changes                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| `src/game/reducers.ts`      | `placeDigit` sets `selection.number` to the placed digit                   |
| `src/game/reducers.test.ts` | New test: `placeDigit` updates `selection.number`                          |
| `src/hints/engine.ts`       | `getHint` uses cell pencil marks as candidates when present                |
| `src/hints/engine.test.ts`  | New test: pencil marks override computed candidates                        |
| `src/game/Cell.css`         | Increase pencil mark font-size; add `.cell__pencil-mark--highlighted`      |
| `src/game/Cell.tsx`         | Read `selection.number` from store; apply highlight class to matching mark |
| `src/game/Cell.test.tsx`    | Three new tests for pencil mark highlight class                            |

---

## Task 1: Fix 3 — `placeDigit` sets `selection.number`

**Files:**

- Modify: `src/game/reducers.ts`
- Test: `src/game/reducers.test.ts`

**Context:** After `placeDigit(d)`, the `selection.number` stays null (or whatever it was before), so `getHighlights` doesn't show `possible` cells for the newly placed digit. Fix: the reducer itself sets `selection.number = digit` so both keyboard and NumberPad paths get the highlight automatically.

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe('placeDigit', ...)` block in `src/game/reducers.test.ts`:

```ts
it('sets selection.number to the placed digit', () => {
  const loaded = loadPuzzle(initialEmptyState, makePuzzle());
  const selected = selectCell(loaded, { row: 1, col: 1 });
  const next = placeDigit(selected, 3 as Digit);
  expect(next.selection.number).toBe(3);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: FAIL — `placeDigit` currently returns `selection.number` unchanged (null), not `3`.

- [ ] **Step 3: Implement the fix**

In `src/game/reducers.ts`, find the `placeDigit` function (around line 60). Change the return statement from:

```ts
return {
  ...state,
  cells: nextCells,
  mistakes: conflicted ? state.mistakes + 1 : state.mistakes,
  currentHint: null,
  hintLevel: 1,
};
```

To:

```ts
return {
  ...state,
  cells: nextCells,
  selection: { ...state.selection, number: digit },
  mistakes: conflicted ? state.mistakes + 1 : state.mistakes,
  currentHint: null,
  hintLevel: 1,
};
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): placeDigit sets selection.number to auto-highlight candidates"
```

---

## Task 2: Fix 4 — Hint engine respects user pencil marks

**Files:**

- Modify: `src/hints/engine.ts`
- Test: `src/hints/engine.test.ts`

**Context:** `getHint` currently calls `computeCandidates(values)` which recomputes candidates from board values, ignoring user pencil marks. When a user removes the pencil marks identified by a hint, the engine still sees the full mathematical candidate set and returns the same hint again. Fix: when a cell has pencil marks, use those marks as its candidates; fall back to computed only when a cell has no pencil marks.

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe('getHint', ...)` block in `src/hints/engine.test.ts`:

```ts
it('uses cell pencil marks as candidates when present, not computed candidates', () => {
  // Baseline: row 0 has 1-8 placed → (0,8) computed candidates = {9} → nakedSingle fires
  const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
  for (let c = 0; c < 8; c++) {
    cells[0]![c]!.value = (c + 1) as Digit;
  }
  expect(getHint(cells)?.technique).toBe('nakedSingle');

  // Now set pencil marks on (0,8) to {3,5} — engine must use those instead of computed {9}
  // With candidates {3,5} for (0,8) and no constraints elsewhere, no technique fires
  const cellsWithMarks = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
  for (let c = 0; c < 8; c++) {
    cellsWithMarks[0]![c]!.value = (c + 1) as Digit;
  }
  cellsWithMarks[0]![8]!.pencilMarks = new Set([3, 5] as Digit[]);
  expect(getHint(cellsWithMarks)).toBeNull();
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/hints/engine.test.ts
```

Expected: FAIL — the second `expect` fails because the current engine ignores pencil marks and still returns `nakedSingle`.

- [ ] **Step 3: Implement the fix**

Replace the body of `getHint` in `src/hints/engine.ts`. The current function is:

```ts
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

Replace with:

```ts
export function getHint(cells: Cell[][]): Step | null {
  const values = cells.map((row) => row.map((c) => c.value));
  const computedCandidates = computeCandidates(values);
  const candidates = cells.map((row, r) =>
    row.map((cell, c) => {
      if (cell.value !== null) return computedCandidates[r]![c]!;
      return cell.pencilMarks.size > 0 ? cell.pencilMarks : computedCandidates[r]![c]!;
    }),
  );
  for (const detector of ALL_TECHNIQUES) {
    const step = detector({ values, candidates });
    if (step !== null) return step;
  }
  return null;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/hints/engine.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hints/engine.ts src/hints/engine.test.ts
git commit -m "fix(hints): use cell pencil marks as candidates to prevent repeated hints"
```

---

## Task 3: Fix 1 — Bigger pencil marks

**Files:**

- Modify: `src/game/Cell.css`

**Context:** Pencil mark digits are currently rendered at `0.32em` — too small to read comfortably. No logic change needed.

- [ ] **Step 1: Update the font-size**

In `src/game/Cell.css`, find `.cell__pencil-mark` (around line 58). Change `font-size` from `0.32em` to `0.45em`:

```css
.cell__pencil-mark {
  font-size: 0.45em;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all tests PASS (CSS change has no unit test — visual verification happens in Task 4's dev server run).

- [ ] **Step 3: Commit**

```bash
git add src/game/Cell.css
git commit -m "style(cell): increase pencil mark font-size from 0.32em to 0.45em"
```

---

## Task 4: Fix 2 — Green circle on matching pencil mark

**Files:**

- Modify: `src/game/Cell.tsx`
- Modify: `src/game/Cell.css`
- Test: `src/game/Cell.test.tsx`

**Context:** When `selection.number` is non-null, the cell already shows a `possible` background highlight. Additionally, any pencil mark span whose digit matches `selection.number` should have a green circle behind it. `Cell` reads `selection.number` from the Zustand store via a new selector (cheap — Zustand memoizes per-selector). The CSS class `cell__pencil-mark--highlighted` is added to the matching span.

- [ ] **Step 1: Write the failing tests**

Add these three `it` blocks inside the existing `describe('pencil marks', ...)` block in `src/game/Cell.test.tsx`:

```tsx
it('applies cell__pencil-mark--highlighted to the pencil mark matching selection.number', () => {
  seedCell(0, 0, null, [3, 5, 7] as Digit[]);
  useGameStore.setState({ selection: { cell: null, number: 5 as Digit } });
  const { container } = render(<Cell row={0} col={0} highlight={null} />);
  const marks = container.querySelectorAll('.cell__pencil-mark');
  // PENCIL_POSITIONS = [1,2,3,4,5,6,7,8,9] → digit 5 is at index 4, 3 at index 2, 7 at index 6
  expect(marks[4]).toHaveClass('cell__pencil-mark--highlighted');
  expect(marks[2]).not.toHaveClass('cell__pencil-mark--highlighted');
  expect(marks[6]).not.toHaveClass('cell__pencil-mark--highlighted');
});

it('does not apply the highlighted class when selection.number is null', () => {
  seedCell(0, 0, null, [5] as Digit[]);
  useGameStore.setState({ selection: { cell: null, number: null } });
  const { container } = render(<Cell row={0} col={0} highlight={null} />);
  const marks = container.querySelectorAll('.cell__pencil-mark');
  expect(marks[4]).not.toHaveClass('cell__pencil-mark--highlighted');
});

it('does not apply the highlighted class when selectedNumber is not in pencilMarks', () => {
  seedCell(0, 0, null, [3, 7] as Digit[]);
  useGameStore.setState({ selection: { cell: null, number: 5 as Digit } });
  const { container } = render(<Cell row={0} col={0} highlight={null} />);
  const marks = container.querySelectorAll('.cell__pencil-mark');
  expect(marks[4]).not.toHaveClass('cell__pencil-mark--highlighted'); // 5 not in pencilMarks
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run src/game/Cell.test.tsx
```

Expected: the three new tests FAIL — the class `cell__pencil-mark--highlighted` doesn't exist yet.

- [ ] **Step 3: Add the highlighted CSS class**

In `src/game/Cell.css`, append after the existing `.cell__pencil-mark` rule:

```css
.cell__pencil-mark--highlighted {
  background: #4ade80;
  border-radius: 50%;
}
```

- [ ] **Step 4: Update Cell.tsx to read selection.number and apply the class**

Replace the full content of `src/game/Cell.tsx` with:

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
  const selectedNumber = useGameStore((s) => s.selection.number);

  const highlightClass = highlight !== null ? `cell--${highlight}` : '';

  return (
    <div className={`cell ${highlightClass}`.trim()} data-row={row} data-col={col}>
      {cell.value !== null ? (
        <span className={`cell__digit ${isGiven ? 'cell__digit--given' : 'cell__digit--user'}`}>
          {cell.value}
        </span>
      ) : cell.pencilMarks.size > 0 ? (
        <div className="cell__pencil-grid">
          {PENCIL_POSITIONS.map((d) => {
            const isHighlighted = selectedNumber === d && cell.pencilMarks.has(d as Digit);
            return (
              <span
                key={d}
                className={`cell__pencil-mark${isHighlighted ? ' cell__pencil-mark--highlighted' : ''}`}
              >
                {cell.pencilMarks.has(d as Digit) ? d : ''}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Run the Cell tests to confirm they pass**

```bash
npx vitest run src/game/Cell.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Start the dev server and verify visually**

```bash
npm run dev
```

Open the app in a browser. Verify:

1. Pencil marks are noticeably larger and legible.
2. When you select a number (click a filled cell or a NumberPad digit), pencil marks matching that number show a green circle.
3. After placing a digit, cells that can still hold that digit are highlighted immediately (no need to click another cell).
4. Request a hint for a hidden pair or similar elimination technique, remove the indicated pencil marks from the relevant cells, then request a hint again — the same hint should not repeat.

- [ ] **Step 8: Commit**

```bash
git add src/game/Cell.tsx src/game/Cell.css src/game/Cell.test.tsx
git commit -m "feat(cell): highlight pencil mark matching selected number with green circle"
```
