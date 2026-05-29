# Phase 13: Pencil Marks (Manual) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pencil mode toggle button (`ActionBar`), visual pencil-mode indicator on the selected cell, and auto-removal of peer pencil marks when a digit is placed.

**Architecture:** `placeDigit` reducer is extended to clear the placed digit from peer pencil marks in the same mutation (one undo step). `getHighlights` gains a `'selected-pencil'` tier driven by `pencilMode`. A new `ActionBar` component holds the pencil mode toggle and sits between the board and number pad in `App`.

**Tech Stack:** React, Zustand (`useGameStore`), Vitest, React Testing Library, CSS custom properties

---

## File map

| File                          | Action | Responsibility                                                             |
| ----------------------------- | ------ | -------------------------------------------------------------------------- |
| `src/game/reducers.ts`        | Modify | Extend `placeDigit` to clear peer pencil marks                             |
| `src/game/reducers.test.ts`   | Modify | 3 new tests for auto-removal and undo                                      |
| `src/styles/tokens.css`       | Modify | Add `--cell-selected-pencil` token (all 3 blocks)                          |
| `src/game/Cell.css`           | Modify | Add `.cell--selected-pencil` rule                                          |
| `src/game/Cell.css`           | Modify | Add `.cell--selected-pencil` rule                                          |
| `src/game/highlights.ts`      | Modify | Add `'selected-pencil'` to type; accept `pencilMode`; update selected tier |
| `src/game/highlights.test.ts` | Modify | 2 new tests for `'selected-pencil'` tier                                   |
| `src/game/Board.tsx`          | Modify | Subscribe to `pencilMode`; pass it to `getHighlights`                      |
| `src/game/ActionBar.tsx`      | Create | Pencil mode toggle button                                                  |
| `src/game/ActionBar.css`      | Create | Styles                                                                     |
| `src/game/ActionBar.test.tsx` | Create | RTL integration tests                                                      |
| `src/app.tsx`                 | Modify | Render `<ActionBar />` between `<Board />` and `<NumberPad />`             |

---

## Task 1: `placeDigit` auto-removal

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

- [ ] **Step 1: Add 3 failing tests to `reducers.test.ts`**

Append the following `describe` block to the end of `src/game/reducers.test.ts`:

```ts
describe('placeDigit — auto-removal of peer pencil marks', () => {
  it('removes the placed digit from pencil marks of peer cells', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    // (0,1) shares column 1 with (1,1) — is a peer
    cells[0]![1]!.pencilMarks.add(3 as Digit);
    // (1,0) shares row 1 with (1,1) — is a peer
    cells[1]![0]!.pencilMarks.add(3 as Digit);
    // (2,2) is in the same top-left box as (1,1) — is a peer
    cells[2]![2]!.pencilMarks.add(3 as Digit);
    const state = { ...loaded, cells, selection: { cell: { row: 1, col: 1 }, number: null } };
    const next = placeDigit(state, 3 as Digit);
    expect(next.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(false);
    expect(next.cells[1]![0]!.pencilMarks.has(3 as Digit)).toBe(false);
    expect(next.cells[2]![2]!.pencilMarks.has(3 as Digit)).toBe(false);
  });

  it('leaves other pencil marks on peer cells untouched', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[0]![1]!.pencilMarks.add(3 as Digit);
    cells[0]![1]!.pencilMarks.add(5 as Digit);
    const state = { ...loaded, cells, selection: { cell: { row: 1, col: 1 }, number: null } };
    const next = placeDigit(state, 3 as Digit);
    expect(next.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(false);
    expect(next.cells[0]![1]!.pencilMarks.has(5 as Digit)).toBe(true);
  });

  it('undo restores cleared peer pencil marks', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[0]![1]!.pencilMarks.add(3 as Digit);
    const state = { ...loaded, cells, selection: { cell: { row: 1, col: 1 }, number: null } };
    const placed = withSnapshot(state, (s) => placeDigit(s, 3 as Digit));
    expect(placed.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(false);
    const reverted = undo(placed);
    expect(reverted.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(true);
    expect(reverted.cells[1]![1]!.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect 3 failures**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: 3 new tests fail (pencil marks not cleared).

- [ ] **Step 3: Extend `placeDigit` in `src/game/reducers.ts`**

Replace the current `placeDigit` function (lines 53–65) with:

```ts
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
```

`peersOf` is already imported at the top of `reducers.ts` — no new imports needed.

- [ ] **Step 4: Run — expect all passing**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: all tests pass (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): auto-remove peer pencil marks on placeDigit"
```

---

## Task 2: `selected-pencil` highlight tier

**Files:**

- Modify: `src/styles/tokens.css`
- Modify: `src/game/Cell.css`
- Modify: `src/game/highlights.ts`
- Modify: `src/game/highlights.test.ts`
- Modify: `src/game/Board.tsx`

- [ ] **Step 1: Add 2 failing tests to `highlights.test.ts`**

Append the following `describe` block to the end of `src/game/highlights.test.ts`:

```ts
describe('selected-pencil', () => {
  it('marks the selected cell as "selected-pencil" when pencilMode is true', () => {
    const state = {
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 3 }, number: null },
      pencilMode: true,
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBe('selected-pencil');
  });

  it('marks the selected cell as "selected" when pencilMode is false', () => {
    const state = {
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 3 }, number: null },
      pencilMode: false,
    };
    const map = getHighlights(state);
    expect(map[2]![3]).toBe('selected');
  });
});
```

- [ ] **Step 2: Run — expect 1 failure**

```bash
npx vitest run src/game/highlights.test.ts
```

Expected: `'selected-pencil'` test fails; `'selected'` test still passes.

- [ ] **Step 3: Add `--cell-selected-pencil` to `src/styles/tokens.css`**

Add `--cell-selected-pencil: #dcfce7;` after `--cell-selected: #dbeafe;` in the `:root` block, `--cell-selected-pencil: #1a3a2a;` after `--cell-selected: #1e3a5f;` in both dark mode blocks.

Replace the full file with:

```css
:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --fg-muted: #555;
  --surface: #ffffff;
  --border: #d4d4d4;
  --accent: #2563eb;
  --accent-fg: #ffffff;
  --cell-bg: #ffffff;
  --cell-given: #1a1a1a;
  --cell-user: #2563eb;
  --cell-selected: #dbeafe;
  --cell-selected-pencil: #dcfce7;
  --cell-peer: #f1f5f9;
  --cell-highlight: #fef3c7;
  --cell-conflict: #fee2e2;
  --cell-conflict-fg: #b91c1c;
}

html[data-theme='dark'] {
  --bg: #0f0f10;
  --fg: #e8e8e8;
  --fg-muted: #999;
  --surface: #18181b;
  --border: #2a2a2e;
  --accent: #60a5fa;
  --accent-fg: #0f0f10;
  --cell-bg: #1c1c1f;
  --cell-given: #e8e8e8;
  --cell-user: #60a5fa;
  --cell-selected: #1e3a5f;
  --cell-selected-pencil: #1a3a2a;
  --cell-peer: #1f1f23;
  --cell-highlight: #3d3416;
  --cell-conflict: #4a1f1f;
  --cell-conflict-fg: #fca5a5;
}

@media (prefers-color-scheme: dark) {
  html:not([data-theme='light']):not([data-theme='dark']) {
    --bg: #0f0f10;
    --fg: #e8e8e8;
    --fg-muted: #999;
    --surface: #18181b;
    --border: #2a2a2e;
    --accent: #60a5fa;
    --accent-fg: #0f0f10;
    --cell-bg: #1c1c1f;
    --cell-given: #e8e8e8;
    --cell-user: #60a5fa;
    --cell-selected: #1e3a5f;
    --cell-selected-pencil: #1a3a2a;
    --cell-peer: #1f1f23;
    --cell-highlight: #3d3416;
    --cell-conflict: #4a1f1f;
    --cell-conflict-fg: #fca5a5;
  }
}
```

- [ ] **Step 4: Add `.cell--selected-pencil` rule to `src/game/Cell.css`**

Append after `.cell--selected { ... }`:

```css
.cell--selected-pencil {
  background: var(--cell-selected-pencil);
}
```

- [ ] **Step 5: Update `src/game/highlights.ts`**

Replace the full file with:

```ts
import { computeCandidates } from '../solver/candidates';
import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
import type { GameState } from './types';

export type CellHighlight =
  | 'selected'
  | 'selected-pencil'
  | 'conflict'
  | 'peer'
  | 'possible'
  | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection' | 'pencilMode'>,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

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

  // Peer (lower priority — overwritten by conflict and selected below)
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
    map[row]![col] = state.pencilMode ? 'selected-pencil' : 'selected';
  }

  return map;
}
```

- [ ] **Step 6: Update `src/game/Board.tsx`**

Subscribe to `pencilMode` and pass it to `getHighlights`. Replace lines 8–14:

```tsx
export function Board() {
  const cells = useGameStore((s) => s.cells);
  const given = useGameStore((s) => s.given);
  const selection = useGameStore((s) => s.selection);
  const pencilMode = useGameStore((s) => s.pencilMode);
  const boardRef = useRef<HTMLDivElement>(null);

  const highlights = getHighlights({ cells, given, selection, pencilMode });
```

- [ ] **Step 7: Run — expect all passing**

```bash
npx vitest run src/game/highlights.test.ts
```

Expected: all tests pass (existing + 2 new).

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/game/Cell.css src/game/highlights.ts src/game/highlights.test.ts src/game/Board.tsx
git commit -m "feat(game): add selected-pencil highlight tier for pencil mode"
```

---

## Task 3: `ActionBar` component

**Files:**

- Create: `src/game/ActionBar.test.tsx`
- Create: `src/game/ActionBar.tsx`
- Create: `src/game/ActionBar.css`

- [ ] **Step 1: Create the test file**

Create `src/game/ActionBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders a pencil toggle button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /pencil/i })).toBeTruthy();
  });

  it('button has aria-pressed="false" when pencilMode is off', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /pencil/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking the button toggles pencilMode on', () => {
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /pencil/i }));
    expect(useGameStore.getState().pencilMode).toBe(true);
  });

  it('button has aria-pressed="true" when pencilMode is on', () => {
    useGameStore.setState({ ...initialEmptyState, pencilMode: true });
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /pencil/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('does not bubble clicks to parent', () => {
    const parentClick = vi.fn();
    const { getByRole } = render(
      <div onClick={parentClick}>
        <ActionBar />
      </div>,
    );
    fireEvent.click(getByRole('button', { name: /pencil/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect failures (module not found)**

```bash
npx vitest run src/game/ActionBar.test.tsx
```

Expected: error importing `ActionBar`.

- [ ] **Step 3: Create `src/game/ActionBar.tsx`**

```tsx
import './ActionBar.css';
import { useGameStore } from './store';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);

  const handlePencilToggle = () => {
    useGameStore.getState().togglePencilMode();
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
    </div>
  );
}
```

- [ ] **Step 4: Create `src/game/ActionBar.css`**

```css
.action-bar {
  display: flex;
  width: min(100%, 500px);
  gap: 4px;
  margin-top: 8px;
}

.action-bar__pencil {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 0.875rem;
  min-height: 44px;
}

.action-bar__pencil--active {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
}
```

- [ ] **Step 5: Run — expect all 5 tests passing**

```bash
npx vitest run src/game/ActionBar.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/ActionBar.tsx src/game/ActionBar.css src/game/ActionBar.test.tsx
git commit -m "feat(game): add ActionBar component with pencil mode toggle"
```

---

## Task 4: Wire `ActionBar` into `App`

**Files:**

- Modify: `src/app.tsx`

- [ ] **Step 1: Update `src/app.tsx`**

Replace the full file with:

```tsx
import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
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
      <NumberPad />
    </main>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (345 existing + 3 reducers + 2 highlights + 5 ActionBar = 355 total).

- [ ] **Step 3: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): render ActionBar between Board and NumberPad"
```

---

## Acceptance checklist

- [ ] `placeDigit` clears the placed digit from peer pencil marks
- [ ] Undo restores cleared peer pencil marks
- [ ] Selected cell shows green tint when `pencilMode` is true
- [ ] Selected cell shows blue tint when `pencilMode` is false
- [ ] `ActionBar` pencil button reflects `pencilMode` via `aria-pressed`
- [ ] Clicking pencil button toggles `pencilMode`
- [ ] ActionBar clicks do not bubble to App's click-outside deselect handler
- [ ] All existing 345 tests still pass
