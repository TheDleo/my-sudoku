# Phase 11: Cell Interaction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire mouse and keyboard interaction onto the existing board — click to select cells, arrow keys to navigate, digits to place, Shift+digit for pencil marks, Backspace to erase, Escape to deselect, and conflict detection that increments the mistake counter.

**Architecture:** `keyboard.ts` is a pure handler function (no React) tested in isolation. Board attaches it via `useEffect` on a `tabIndex={0}` div. Board's `onClick` uses event delegation to handle cell clicks and board-background clicks. App's `<main>` has an `onClick` for click-outside deselect; Board's handler calls `stopPropagation()` to prevent bubbling. `placeDigit` in `reducers.ts` gains a conflict check via `peersOf()` and increments `mistakes` when a rule violation is detected.

**Tech Stack:** React 18, Zustand 4, TypeScript, Vitest, @testing-library/react, @testing-library/jest-dom.

---

## File Map

**New files**

- `src/game/keyboard.ts` — pure `handleKey()` function, no React
- `src/game/keyboard.test.ts` — unit tests for `handleKey`, no component rendering

**Modified files**

- `src/game/reducers.ts` — import `peersOf`, add `isConflictingPlacement` helper, update `placeDigit`
- `src/game/reducers.test.ts` — add 5 tests to the `placeDigit` describe block
- `src/game/Board.tsx` — add `boardRef`, `tabIndex={0}`, `useEffect` keyboard listener, `onClick` delegation handler
- `src/game/Board.test.tsx` — add `fireEvent` import, add 7 interaction tests
- `src/app.tsx` — add `onClick` to `<main>` + import `useGameStore`
- `src/app.test.tsx` — add `beforeEach` store reset + 1 click-outside test

---

## Task 1: `placeDigit` mistake increment

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

- [ ] **Step 1: Add failing tests to `src/game/reducers.test.ts`**

Add these 5 tests inside the existing `describe('placeDigit', ...)` block, after the last existing test:

```ts
it('increments mistakes when placed digit conflicts in the same row', () => {
  const loaded = loadPuzzle(initialEmptyState, makePuzzle());
  // Place 3 at (1,1) — no peer has 3 yet
  const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
  expect(s1.mistakes).toBe(0);
  // Place 3 at (1,3) — same row as (1,1), conflict
  const s2 = placeDigit(selectCell(s1, { row: 1, col: 3 }), 3 as Digit);
  expect(s2.mistakes).toBe(1);
});

it('increments mistakes when placed digit conflicts in the same column', () => {
  const loaded = loadPuzzle(initialEmptyState, makePuzzle());
  const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
  // Place 3 at (3,1) — same col as (1,1), conflict
  const s2 = placeDigit(selectCell(s1, { row: 3, col: 1 }), 3 as Digit);
  expect(s2.mistakes).toBe(1);
});

it('increments mistakes when placed digit conflicts in the same box', () => {
  const loaded = loadPuzzle(initialEmptyState, makePuzzle());
  const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
  // (2,2) is in the same top-left 3×3 box as (1,1), conflict
  const s2 = placeDigit(selectCell(s1, { row: 2, col: 2 }), 3 as Digit);
  expect(s2.mistakes).toBe(1);
});

it('does not increment mistakes on a clean (non-conflicting) placement', () => {
  const loaded = loadPuzzle(initialEmptyState, makePuzzle());
  const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
  expect(s1.mistakes).toBe(0);
});

it('undo does not restore mistakes', () => {
  const loaded = loadPuzzle(initialEmptyState, makePuzzle());
  const s1 = selectCell(loaded, { row: 1, col: 1 });
  const s2 = withSnapshot(s1, (s) => placeDigit(s, 3 as Digit)); // clean placement
  const s3 = selectCell(s2, { row: 1, col: 3 });
  const s4 = withSnapshot(s3, (s) => placeDigit(s, 3 as Digit)); // conflict → mistakes=1
  expect(s4.mistakes).toBe(1);
  const s5 = undo(s4);
  expect(s5.mistakes).toBe(1); // mistakes NOT restored by undo
  expect(s5.cells[1]![3]!.value).toBeNull(); // cell IS restored
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

```
npx vitest run src/game/reducers.test.ts
```

Expected: the 5 new tests fail with `expected 0 to be 1` or similar. All prior tests pass.

- [ ] **Step 3: Update `src/game/reducers.ts`**

Add `peersOf` to the imports at line 1:

```ts
import type { Cell, CellCoord, Digit, Puzzle } from '../types';
import { cloneCells, empty9x9 } from './helpers';
import { peersOf } from '../solver/units';
import type { GameSnapshot, GameState } from './types';
```

Add a private helper just before `placeDigit`:

```ts
function isConflictingPlacement(cells: Cell[][], sel: CellCoord, digit: Digit): boolean {
  return peersOf(sel).some((peer) => cells[peer.row]![peer.col]!.value === digit);
}
```

Replace the existing `placeDigit` function body:

```ts
export function placeDigit(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const nextCells = cloneCells(state.cells);
  nextCells[sel.row]![sel.col]!.value = digit;
  const conflicted = isConflictingPlacement(state.cells, sel, digit);
  return {
    ...state,
    cells: nextCells,
    mistakes: conflicted ? state.mistakes + 1 : state.mistakes,
  };
}
```

- [ ] **Step 4: Run the tests to verify all pass**

```
npx vitest run src/game/reducers.test.ts
```

Expected: all tests pass (prior tests + 5 new).

- [ ] **Step 5: Run the full suite to confirm no regressions**

```
npm test
```

Expected: all 301 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): increment mistakes on conflicting placement in placeDigit"
```

---

## Task 2: `keyboard.ts` pure handler

**Files:**

- Create: `src/game/keyboard.test.ts`
- Create: `src/game/keyboard.ts`

- [ ] **Step 1: Create `src/game/keyboard.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { handleKey } from './keyboard';

function makeEvent(key: string, shiftKey = false) {
  return { key, shiftKey, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

function makeState(overrides: Partial<typeof initialEmptyState> = {}) {
  return { ...initialEmptyState, ...overrides };
}

function makeActions() {
  return {
    selectCell: vi.fn(),
    setSelectedNumber: vi.fn(),
    placeDigit: vi.fn(),
    eraseCell: vi.fn(),
    togglePencilMark: vi.fn(),
  };
}

describe('handleKey', () => {
  describe('arrow keys', () => {
    it('ArrowUp moves cursor up by 1', () => {
      const e = makeEvent('ArrowUp');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 2, col: 3 });
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('ArrowDown moves cursor down by 1', () => {
      const e = makeEvent('ArrowDown');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 4, col: 3 });
    });

    it('ArrowLeft moves cursor left by 1', () => {
      const e = makeEvent('ArrowLeft');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 2 });
    });

    it('ArrowRight moves cursor right by 1', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 4 });
    });

    it('ArrowUp clamps at row 0', () => {
      const e = makeEvent('ArrowUp');
      const state = makeState({ selection: { cell: { row: 0, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 0, col: 3 });
    });

    it('ArrowDown clamps at row 8', () => {
      const e = makeEvent('ArrowDown');
      const state = makeState({ selection: { cell: { row: 8, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 8, col: 3 });
    });

    it('ArrowLeft clamps at col 0', () => {
      const e = makeEvent('ArrowLeft');
      const state = makeState({ selection: { cell: { row: 3, col: 0 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 0 });
    });

    it('ArrowRight clamps at col 8', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: { row: 3, col: 8 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 8 });
    });

    it('arrow keys are no-op (no selectCell) when no cell selected, but still call preventDefault', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).not.toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('arrow keys do not call setSelectedNumber (preserve selection.number)', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: 5 as Digit } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.setSelectedNumber).not.toHaveBeenCalled();
    });
  });

  describe('Escape', () => {
    it('Escape deselects and clears selected number', () => {
      const e = makeEvent('Escape');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: 5 as Digit } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith(null);
      expect(actions.setSelectedNumber).toHaveBeenCalledWith(null);
    });

    it('Escape works even when no cell is selected', () => {
      const e = makeEvent('Escape');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith(null);
      expect(actions.setSelectedNumber).toHaveBeenCalledWith(null);
    });
  });

  describe('Backspace / Delete', () => {
    it('Backspace calls eraseCell when a cell is selected', () => {
      const e = makeEvent('Backspace');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.eraseCell).toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('Delete calls eraseCell when a cell is selected', () => {
      const e = makeEvent('Delete');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.eraseCell).toHaveBeenCalled();
    });

    it('Backspace is no-op when no cell is selected', () => {
      const e = makeEvent('Backspace');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.eraseCell).not.toHaveBeenCalled();
    });
  });

  describe('digit keys', () => {
    it('digit key calls placeDigit when pencilMode is false', () => {
      const e = makeEvent('5');
      const state = makeState({
        selection: { cell: { row: 2, col: 2 }, number: null },
        pencilMode: false,
      });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.placeDigit).toHaveBeenCalledWith(5 as Digit);
      expect(actions.togglePencilMark).not.toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('digit key calls togglePencilMark when pencilMode is true', () => {
      const e = makeEvent('3');
      const state = makeState({
        selection: { cell: { row: 2, col: 2 }, number: null },
        pencilMode: true,
      });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.togglePencilMark).toHaveBeenCalledWith(3 as Digit);
      expect(actions.placeDigit).not.toHaveBeenCalled();
    });

    it('Shift+digit calls togglePencilMark regardless of pencilMode', () => {
      const e = makeEvent('7', true);
      const state = makeState({
        selection: { cell: { row: 2, col: 2 }, number: null },
        pencilMode: false,
      });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.togglePencilMark).toHaveBeenCalledWith(7 as Digit);
      expect(actions.placeDigit).not.toHaveBeenCalled();
    });

    it('digit key is no-op when no cell is selected', () => {
      const e = makeEvent('5');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.placeDigit).not.toHaveBeenCalled();
      expect(actions.togglePencilMark).not.toHaveBeenCalled();
    });
  });

  describe('unrecognized keys', () => {
    it('letter keys are no-ops and do not call preventDefault', () => {
      const e = makeEvent('a');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.placeDigit).not.toHaveBeenCalled();
      expect(actions.eraseCell).not.toHaveBeenCalled();
      expect(actions.selectCell).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
npx vitest run src/game/keyboard.test.ts
```

Expected: fails with `Cannot find module './keyboard'`.

- [ ] **Step 3: Create `src/game/keyboard.ts`**

```ts
import type { Digit } from '../types';
import type { GameState, GameStore } from './types';

type KeyState = Pick<GameState, 'cells' | 'given' | 'selection' | 'pencilMode'>;
type KeyActions = Pick<
  GameStore,
  'selectCell' | 'setSelectedNumber' | 'placeDigit' | 'eraseCell' | 'togglePencilMark'
>;

export function handleKey(event: KeyboardEvent, state: KeyState, actions: KeyActions): void {
  const { key, shiftKey } = event;
  const { selection, pencilMode } = state;

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
    event.preventDefault();
    if (selection.cell === null) return;
    const { row, col } = selection.cell;
    const next =
      key === 'ArrowUp'
        ? { row: Math.max(0, row - 1), col }
        : key === 'ArrowDown'
          ? { row: Math.min(8, row + 1), col }
          : key === 'ArrowLeft'
            ? { row, col: Math.max(0, col - 1) }
            : { row, col: Math.min(8, col + 1) };
    actions.selectCell(next);
    return;
  }

  if (key === 'Escape') {
    actions.selectCell(null);
    actions.setSelectedNumber(null);
    return;
  }

  if (key === 'Backspace' || key === 'Delete') {
    event.preventDefault();
    if (selection.cell !== null) actions.eraseCell();
    return;
  }

  const digit = parseDigit(key);
  if (digit !== null && selection.cell !== null) {
    event.preventDefault();
    if (shiftKey || pencilMode) {
      actions.togglePencilMark(digit);
    } else {
      actions.placeDigit(digit);
    }
    return;
  }
}

function parseDigit(key: string): Digit | null {
  const n = parseInt(key, 10);
  if (n >= 1 && n <= 9) return n as Digit;
  return null;
}
```

- [ ] **Step 4: Run the tests to verify all pass**

```
npx vitest run src/game/keyboard.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run the full suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/keyboard.ts src/game/keyboard.test.ts
git commit -m "feat(game): add keyboard handler — arrow keys, digits, pencil marks, erase, escape"
```

---

## Task 3: Board click handling and keyboard listener

**Files:**

- Modify: `src/game/Board.tsx`
- Modify: `src/game/Board.test.tsx`

- [ ] **Step 1: Add interaction tests to `src/game/Board.test.tsx`**

Add `fireEvent` to the existing import line at the top:

```ts
import { render, fireEvent } from '@testing-library/react';
```

Append these two nested `describe` blocks inside the existing `describe('Board', ...)` block (after the last existing test):

```tsx
describe('click handling', () => {
  it('clicking an empty cell selects it and clears selection.number', () => {
    const { container } = render(<Board />);
    const cell = container.querySelector('[data-row="1"][data-col="1"]')!;
    fireEvent.click(cell);
    const { selection } = useGameStore.getState();
    expect(selection.cell).toEqual({ row: 1, col: 1 });
    expect(selection.number).toBeNull();
  });

  it('clicking a filled cell selects it and sets selection.number to that digit', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    const { container } = render(<Board />);
    // makePuzzle places given digit 5 at (0,0)
    const cell = container.querySelector('[data-row="0"][data-col="0"]')!;
    fireEvent.click(cell);
    const { selection } = useGameStore.getState();
    expect(selection.cell).toEqual({ row: 0, col: 0 });
    expect(selection.number).toBe(5);
  });

  it('clicking the already-selected cell deselects it', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 3 }, number: null },
    });
    const { container } = render(<Board />);
    const cell = container.querySelector('[data-row="2"][data-col="3"]')!;
    fireEvent.click(cell);
    expect(useGameStore.getState().selection.cell).toBeNull();
  });

  it('clicking the board background deselects', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 3 }, number: null },
    });
    const { container } = render(<Board />);
    // Click the .board div itself — its target has no data-row/data-col
    fireEvent.click(container.querySelector('.board')!);
    expect(useGameStore.getState().selection.cell).toBeNull();
  });
});

describe('keyboard handling', () => {
  it('ArrowRight moves selection right', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 3, col: 3 }, number: null },
    });
    const { container } = render(<Board />);
    const board = container.querySelector('.board') as HTMLElement;
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    expect(useGameStore.getState().selection.cell).toEqual({ row: 3, col: 4 });
  });

  it('digit key places a digit in the selected cell', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    const { container } = render(<Board />);
    const board = container.querySelector('.board') as HTMLElement;
    fireEvent.keyDown(board, { key: '3' });
    expect(useGameStore.getState().cells[1]![1]!.value).toBe(3);
  });

  it('Escape deselects the selected cell', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 2 }, number: null },
    });
    const { container } = render(<Board />);
    const board = container.querySelector('.board') as HTMLElement;
    fireEvent.keyDown(board, { key: 'Escape' });
    expect(useGameStore.getState().selection.cell).toBeNull();
  });
});
```

- [ ] **Step 2: Run the Board tests to verify new tests fail**

```
npx vitest run src/game/Board.test.tsx
```

Expected: the 7 new tests fail (Board has no click handler or keyboard listener yet). The 5 existing tests still pass.

- [ ] **Step 3: Replace `src/game/Board.tsx` with the updated version**

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
  const boardRef = useRef<HTMLDivElement>(null);

  const highlights = getHighlights({ cells, given, selection });

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

- [ ] **Step 4: Run the Board tests to verify all pass**

```
npx vitest run src/game/Board.test.tsx
```

Expected: all 12 tests pass (5 existing + 7 new).

- [ ] **Step 5: Run the full suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/Board.tsx src/game/Board.test.tsx
git commit -m "feat(game): add Board click delegation and keyboard listener"
```

---

## Task 4: App click-outside deselect

**Files:**

- Modify: `src/app.tsx`
- Modify: `src/app.test.tsx`

- [ ] **Step 1: Add a failing test to `src/app.test.tsx`**

Replace the entire file with:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { initialEmptyState } from './game/reducers';
import { useGameStore } from './game/store';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders the Sudoku heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeInTheDocument();
  });

  it('clicking outside the board deselects the selected cell', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: null },
    });
    render(<App />);
    // Click the <h1> — it is outside the Board, so Board's stopPropagation does not fire
    fireEvent.click(screen.getByRole('heading'));
    expect(useGameStore.getState().selection.cell).toBeNull();
  });
});
```

- [ ] **Step 2: Run the app tests to verify the new test fails**

```
npx vitest run src/app.test.tsx
```

Expected: the existing heading test passes; the new click-outside test fails (App has no onClick yet).

- [ ] **Step 3: Replace `src/app.tsx` with the updated version**

```tsx
import { Board } from './game/Board';
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
    </main>
  );
}
```

- [ ] **Step 4: Run the app tests to verify all pass**

```
npx vitest run src/app.test.tsx
```

Expected: both tests pass.

- [ ] **Step 5: Run the full suite**

```
npm test
```

Expected: all tests pass (~330 total).

- [ ] **Step 6: Commit**

```bash
git add src/app.tsx src/app.test.tsx
git commit -m "feat(game): add click-outside deselect to App"
```
