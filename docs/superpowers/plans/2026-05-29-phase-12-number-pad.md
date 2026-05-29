# Phase 12: Number Pad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a touch-friendly number pad below the Sudoku board with per-digit remaining counts and auto-disable at zero.

**Architecture:** A pure `getRemainingCounts` selector in `helpers.ts` drives both disabled state and counter display. `NumberPad.tsx` subscribes to `cells`/`selection`/`pencilMode` from the Zustand store and dispatches existing actions. `App.tsx` gains a `<NumberPad />` below `<Board />`.

**Tech Stack:** React, Zustand (`useGameStore`), Vitest, React Testing Library, CSS custom properties

---

## File map

| File                          | Action | Responsibility                                |
| ----------------------------- | ------ | --------------------------------------------- |
| `src/game/helpers.ts`         | Modify | Add `getRemainingCounts(cells)` pure selector |
| `src/game/helpers.test.ts`    | Modify | Unit tests for `getRemainingCounts`           |
| `src/game/NumberPad.tsx`      | Create | Number pad component                          |
| `src/game/NumberPad.css`      | Create | Styles using existing CSS tokens              |
| `src/game/NumberPad.test.tsx` | Create | RTL integration tests                         |
| `src/app.tsx`                 | Modify | Render `<NumberPad />` below `<Board />`      |

---

## Task 1: `getRemainingCounts` selector

**Files:**

- Modify: `src/game/helpers.ts`
- Modify: `src/game/helpers.test.ts`

- [ ] **Step 1: Add failing tests for `getRemainingCounts`**

First, update the existing import in `src/game/helpers.test.ts` (line 3) to add `getRemainingCounts`:

```ts
import { cloneCells, empty9x9, getRemainingCounts } from './helpers';
```

Then append the following `describe` block to the end of `src/game/helpers.test.ts`:

```ts
describe('getRemainingCounts', () => {
  it('returns 9 for every digit when all cells are empty', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    const counts = getRemainingCounts(cells);
    for (let d = 1; d <= 9; d++) {
      expect(counts[d as Digit]).toBe(9);
    }
  });

  it('returns 8 for the placed digit and 9 for all others', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    cells[0]![0]!.value = 5 as Digit;
    const counts = getRemainingCounts(cells);
    expect(counts[5 as Digit]).toBe(8);
    expect(counts[1 as Digit]).toBe(9);
    expect(counts[9 as Digit]).toBe(9);
  });

  it('returns 0 for a digit placed in all 9 cells of a row', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    for (let c = 0; c < 9; c++) {
      cells[0]![c]!.value = 3 as Digit;
    }
    const counts = getRemainingCounts(cells);
    expect(counts[3 as Digit]).toBe(0);
    expect(counts[1 as Digit]).toBe(9);
  });
});
```

- [ ] **Step 2: Run the tests — expect 3 failures**

```bash
npx vitest run src/game/helpers.test.ts
```

Expected: `getRemainingCounts is not a function` or similar — 3 tests failing.

- [ ] **Step 3: Implement `getRemainingCounts` in `helpers.ts`**

Append to `src/game/helpers.ts` (after `cloneCells`):

```ts
import type { Digit } from '../types';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function getRemainingCounts(cells: Cell[][]): Record<Digit, number> {
  const placed = new Map<Digit, number>();
  for (const row of cells) {
    for (const cell of row) {
      if (cell.value !== null) {
        placed.set(cell.value, (placed.get(cell.value) ?? 0) + 1);
      }
    }
  }
  return Object.fromEntries(DIGITS.map((d) => [d, 9 - (placed.get(d) ?? 0)])) as Record<
    Digit,
    number
  >;
}
```

Note: `Cell` is already imported at the top of `helpers.ts`. Add `Digit` to the existing import from `'../types'`:

```ts
import type { Cell, Digit } from '../types';
```

- [ ] **Step 4: Run the tests — expect all passing**

```bash
npx vitest run src/game/helpers.test.ts
```

Expected: all tests in `helpers.test.ts` passing (3 existing + 3 new = 6 total).

- [ ] **Step 5: Commit**

```bash
git add src/game/helpers.ts src/game/helpers.test.ts
git commit -m "feat(game): add getRemainingCounts selector to helpers"
```

---

## Task 2: `NumberPad` component

**Files:**

- Create: `src/game/NumberPad.test.tsx`
- Create: `src/game/NumberPad.tsx`
- Create: `src/game/NumberPad.css`

- [ ] **Step 1: Create the test file**

Create `src/game/NumberPad.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { makePuzzle } from './testHelpers';
import { cloneCells } from './helpers';
import { NumberPad } from './NumberPad';

describe('NumberPad', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders 9 digit buttons and an erase button', () => {
    const { getAllByRole } = render(<NumberPad />);
    expect(getAllByRole('button')).toHaveLength(10);
  });

  describe('digit tap — cell selected, normal mode', () => {
    it('places the digit in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      const { container } = render(<NumberPad />);
      const btn = container.querySelector('[data-digit="3"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(useGameStore.getState().cells[1]![1]!.value).toBe(3);
    });
  });

  describe('digit tap — cell selected, pencil mode', () => {
    it('toggles a pencil mark in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.setState({ ...useGameStore.getState(), pencilMode: true });
      const { container } = render(<NumberPad />);
      const btn = container.querySelector('[data-digit="4"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.has(4 as Digit)).toBe(true);
    });
  });

  describe('digit tap — no cell selected', () => {
    it('sets selection.number for highlight-only mode', () => {
      const { container } = render(<NumberPad />);
      const btn = container.querySelector('[data-digit="7"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(useGameStore.getState().selection.number).toBe(7);
      expect(useGameStore.getState().selection.cell).toBeNull();
    });
  });

  describe('erase button', () => {
    it('clears the value in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().placeDigit(3 as Digit);
      const { container } = render(<NumberPad />);
      const eraseBtn = container.querySelector('.number-pad__erase') as HTMLButtonElement;
      fireEvent.click(eraseBtn);
      expect(useGameStore.getState().cells[1]![1]!.value).toBeNull();
    });
  });

  describe('remaining counts', () => {
    it('shows the remaining count on each digit button', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      cells[1]![3]!.value = 5 as Digit;
      useGameStore.setState({ ...initialEmptyState, cells });
      const { container } = render(<NumberPad />);
      const btn5 = container.querySelector('[data-digit="5"]')!;
      expect(btn5.querySelector('.number-pad__count')?.textContent).toBe('7');
    });

    it('disables a digit button when remaining count reaches 0', () => {
      const cells = cloneCells(initialEmptyState.cells);
      // Place digit 1 in all 9 cells of row 0 (9 placements → 0 remaining)
      for (let c = 0; c < 9; c++) {
        cells[0]![c]!.value = 1 as Digit;
      }
      useGameStore.setState({ ...initialEmptyState, cells });
      const { container } = render(<NumberPad />);
      const btn1 = container.querySelector('[data-digit="1"]') as HTMLButtonElement;
      expect(btn1.disabled).toBe(true);
    });
  });

  describe('click propagation', () => {
    it('does not bubble digit taps to the parent element', () => {
      const parentClick = vi.fn();
      const { container } = render(
        <div onClick={parentClick}>
          <NumberPad />
        </div>,
      );
      const btn = container.querySelector('[data-digit="1"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(parentClick).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the tests — expect failures (module not found)**

```bash
npx vitest run src/game/NumberPad.test.tsx
```

Expected: error importing `NumberPad` — module not found.

- [ ] **Step 3: Create `NumberPad.tsx`**

Create `src/game/NumberPad.tsx`:

```tsx
import './NumberPad.css';
import type { Digit } from '../types';
import { useGameStore } from './store';
import { getRemainingCounts } from './helpers';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberPad() {
  const cells = useGameStore((s) => s.cells);
  const remaining = getRemainingCounts(cells);

  const handleDigit = (d: Digit) => {
    const store = useGameStore.getState();
    if (store.selection.cell !== null) {
      if (store.pencilMode) {
        store.togglePencilMark(d);
      } else {
        store.placeDigit(d);
      }
    } else {
      store.setSelectedNumber(d);
    }
  };

  const handleErase = () => {
    useGameStore.getState().eraseCell();
  };

  return (
    <div className="number-pad" onClick={(e) => e.stopPropagation()}>
      {DIGITS.map((d) => (
        <button
          key={d}
          className="number-pad__digit"
          data-digit={d}
          disabled={remaining[d] === 0}
          onClick={() => handleDigit(d)}
        >
          <span className="number-pad__label">{d}</span>
          <span className="number-pad__count">{remaining[d]}</span>
        </button>
      ))}
      <button className="number-pad__erase" onClick={handleErase}>
        ⌫
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `NumberPad.css`**

Create `src/game/NumberPad.css`:

```css
.number-pad {
  display: flex;
  width: min(100%, 500px);
  gap: 4px;
  margin-top: 12px;
}

.number-pad__digit,
.number-pad__erase {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: clamp(0.875rem, 3vw, 1.25rem);
  line-height: 1;
  gap: 2px;
}

.number-pad__digit:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.number-pad__count {
  font-size: 0.6em;
  color: var(--fg-muted);
}

.number-pad__erase {
  font-size: clamp(1rem, 3.5vw, 1.5rem);
}
```

- [ ] **Step 5: Run the tests — expect all passing**

```bash
npx vitest run src/game/NumberPad.test.tsx
```

Expected: all 9 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/game/NumberPad.tsx src/game/NumberPad.css src/game/NumberPad.test.tsx
git commit -m "feat(game): add NumberPad component with remaining counts and tap semantics"
```

---

## Task 3: Wire `NumberPad` into `App`

**Files:**

- Modify: `src/app.tsx`

- [ ] **Step 1: Update `App.tsx`**

Replace the contents of `src/app.tsx` with:

```tsx
import { Board } from './game/Board';
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
      <NumberPad />
    </main>
  );
}
```

- [ ] **Step 2: Run all tests — expect everything passing**

```bash
npx vitest run
```

Expected: all tests pass (334 existing + 3 new helpers + 9 new NumberPad = 346 total).

- [ ] **Step 3: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): render NumberPad below Board"
```

---

## Acceptance checklist

- [ ] `getRemainingCounts` unit tests pass
- [ ] `NumberPad` tap tests pass (place, pencil mark, highlight-only, erase)
- [ ] Remaining count renders correctly
- [ ] Digit button disabled at count 0
- [ ] Digit taps do not bubble to parent (stopPropagation)
- [ ] All existing 334 tests still pass
