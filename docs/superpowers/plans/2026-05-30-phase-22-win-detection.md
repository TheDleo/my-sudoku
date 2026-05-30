# Phase 22 — Win Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a win modal when the player places the last correct digit, displaying congratulations, difficulty, mistakes, and elapsed time, with "New Game" and "Close" buttons.

**Architecture:** Add `won: boolean` to `GameState` (not persisted). `placeDigit` calls a private `isSolved` helper after each placement and sets `won: true` when all cells match `puzzle.solution`. A new `WinModal` component renders as a backdrop + card overlay when `won && screen === 'game'`.

**Tech Stack:** React, Zustand, Vitest, @testing-library/react, CSS custom properties

---

## File Map

| File                         | Action | Responsibility                                                                                             |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `src/game/types.ts`          | Modify | Add `won: boolean` to `GameState`; add `dismissWin` to `GameStore`                                         |
| `src/game/reducers.ts`       | Modify | Add `isSolved` helper; wire `won` into `placeDigit` + `loadPuzzle` + `initialEmptyState`; add `dismissWin` |
| `src/game/store.ts`          | Modify | Wire `dismissWin` action                                                                                   |
| `src/game/WinModal.tsx`      | Create | Modal component — reads store, renders stats, handles buttons                                              |
| `src/game/WinModal.css`      | Create | Backdrop + card styles using existing CSS variables                                                        |
| `src/game/WinModal.test.tsx` | Create | Component tests                                                                                            |
| `src/app.tsx`                | Modify | Subscribe to `won`; conditionally render `<WinModal />`                                                    |

---

## Task 1: Add `won` to types

**Files:**

- Modify: `src/game/types.ts`

- [ ] **Step 1: Add `won: boolean` to `GameState` and `dismissWin` to `GameStore`**

Open `src/game/types.ts`. The current `GameState` ends with `screen: 'landing' | 'game';`. Add `won` after it. Add `dismissWin` to `GameStore` after `resumeGame`:

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
  screen: 'landing' | 'game';
  won: boolean;
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
  setScreen: (s: 'landing' | 'game') => void;
  resumeGame: () => void;
  dismissWin: () => void;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(types): add won field and dismissWin action to game types"
```

---

## Task 2: Reducer logic — TDD

**Files:**

- Modify: `src/game/reducers.test.ts` (add tests at end)
- Modify: `src/game/reducers.ts`

- [ ] **Step 1: Write failing tests**

Add these `describe` blocks at the end of `src/game/reducers.test.ts`.

First add `dismissWin` to the import from `./reducers` and add `type { Puzzle, SolvedGrid }` to the import from `../types`:

```ts
// Change the vitest import line to include dismissWin:
import {
  advanceHint,
  dismissHint,
  dismissWin,
  eraseCell,
  fillCandidates,
  initialEmptyState,
  loadPuzzle,
  placeDigit,
  redo,
  requestHint,
  selectCell,
  setScreen,
  setSelectedNumber,
  togglePencilMark,
  togglePencilMode,
  undo,
  withSnapshot,
} from './reducers';

// Change the ../types import to include Puzzle and SolvedGrid:
import type { Digit, Puzzle, SolvedGrid } from '../types';
```

Then append these `describe` blocks at the end of the file:

```ts
describe('initialEmptyState.won', () => {
  it('is false', () => {
    expect(initialEmptyState.won).toBe(false);
  });
});

describe('loadPuzzle — won', () => {
  it('resets won to false', () => {
    const dirty = { ...initialEmptyState, won: true };
    expect(loadPuzzle(dirty, makePuzzle()).won).toBe(false);
  });
});

describe('placeDigit — win detection', () => {
  function makeAlmostWonState(): { state: ReturnType<typeof loadPuzzle>; solution: SolvedGrid } {
    // solution[r][c] = ((r + c) % 9) + 1
    const solution: SolvedGrid = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
    );
    const puzzle: Puzzle = {
      id: 'win-test',
      difficulty: 'easy',
      initialBoard: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => null as Digit | null),
      ),
      solution,
    };
    // All cells filled with solution values except (8,8)
    const cells = solution.map((row, r) =>
      row.map((v, c) => ({
        value: r === 8 && c === 8 ? null : v,
        pencilMarks: new Set<Digit>(),
      })),
    );
    const given = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));
    const state = {
      ...initialEmptyState,
      puzzle,
      cells,
      given,
      selection: { cell: { row: 8, col: 8 }, number: null },
    };
    return { state, solution };
  }

  it('sets won to true when the placed digit completes the solution', () => {
    const { state, solution } = makeAlmostWonState();
    // solution[8][8] = ((8 + 8) % 9 + 1) = (7 + 1) = 8
    const correctDigit = solution[8]![8]!;
    const next = placeDigit(state, correctDigit);
    expect(next.won).toBe(true);
  });

  it('leaves won false when the placed digit does not complete the solution', () => {
    const { state, solution } = makeAlmostWonState();
    // solution[8][8] is 8; place 1 instead (wrong digit)
    const wrongDigit = (solution[8]![8]! === 1 ? 2 : 1) as Digit;
    const next = placeDigit(state, wrongDigit);
    expect(next.won).toBe(false);
  });

  it('leaves won false when only some cells are filled', () => {
    const puzzle = makePuzzle();
    const loaded = loadPuzzle(initialEmptyState, puzzle);
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.won).toBe(false);
  });
});

describe('dismissWin', () => {
  it('sets won to false', () => {
    const state = { ...initialEmptyState, won: true };
    expect(dismissWin(state).won).toBe(false);
  });

  it('returns same reference when already false', () => {
    expect(dismissWin(initialEmptyState)).not.toBe(initialEmptyState);
    expect(dismissWin(initialEmptyState).won).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: several failures — `won` does not exist on `GameState`, `dismissWin` is not exported.

- [ ] **Step 3: Implement changes in `reducers.ts`**

Replace the full content of `src/game/reducers.ts`:

```ts
import type { Cell, CellCoord, Digit, Puzzle, SolvedGrid } from '../types';
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
  screen: 'landing',
  won: false,
};

export function loadPuzzle(state: GameState, puzzle: Puzzle): GameState {
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
    screen: state.screen,
    won: false,
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

function isSolved(cells: Cell[][], solution: SolvedGrid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (cells[r]![c]!.value !== solution[r]![c]) return false;
    }
  }
  return true;
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
  const won = isSolved(nextCells, state.puzzle.solution);
  return {
    ...state,
    cells: nextCells,
    selection: { ...state.selection, number: digit },
    mistakes: conflicted ? state.mistakes + 1 : state.mistakes,
    currentHint: null,
    hintLevel: 1,
    won,
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
    return { ...state, cells: nextCells, currentHint: null, hintLevel: 1 };
  }
  if (cell.pencilMarks.size > 0) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.pencilMarks = new Set<Digit>();
    return { ...state, cells: nextCells, currentHint: null, hintLevel: 1 };
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
  if (state.currentHint === null) return state;
  return { ...state, currentHint: null, hintLevel: 1 };
}

export function setScreen(state: GameState, s: 'landing' | 'game'): GameState {
  return { ...state, screen: s };
}

export function dismissWin(state: GameState): GameState {
  return { ...state, won: false };
}

// Re-export shared types for convenience.
export type { GameSnapshot, GameState };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(reducers): add won field, isSolved helper, and dismissWin reducer"
```

---

## Task 3: Wire `dismissWin` in the store

**Files:**

- Modify: `src/game/store.ts`

- [ ] **Step 1: Add `dismissWin` action**

In `src/game/store.ts`, add `dismissWin` to the store — add it after `resumeGame`:

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

  setScreen: (s) => set((st) => reducers.setScreen(st, s)),
  resumeGame: () =>
    set(() => {
      const saved = persistence.load();
      if (saved === null) return {};
      return { ...saved, screen: 'game' as const };
    }),

  dismissWin: () => set((s) => reducers.dismissWin(s)),
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
    screen: state.screen,
    won: state.won,
  };
  persistence.save(snapshot);
});
```

- [ ] **Step 2: Run store tests to confirm nothing broke**

```bash
npx vitest run src/game/store.test.ts
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/game/store.ts
git commit -m "feat(store): wire dismissWin action"
```

---

## Task 4: WinModal component — TDD

**Files:**

- Create: `src/game/WinModal.test.tsx`
- Create: `src/game/WinModal.tsx`
- Create: `src/game/WinModal.css`

- [ ] **Step 1: Write failing tests**

Create `src/game/WinModal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WinModal } from './WinModal';
import * as persistence from './persistence';
import { useGameStore } from './store';
import { initialEmptyState } from './reducers';
import { makePuzzle } from './testHelpers';

describe('WinModal', () => {
  beforeEach(() => {
    vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: true,
      puzzle: makePuzzle(),
      mistakes: 2,
      elapsedMs: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the "Puzzle Complete!" heading', () => {
    render(<WinModal />);
    expect(screen.getByRole('heading', { name: 'Puzzle Complete!' })).toBeInTheDocument();
  });

  it('renders the difficulty label', () => {
    render(<WinModal />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('renders the mistakes count', () => {
    render(<WinModal />);
    expect(screen.getByText('Mistakes: 2')).toBeInTheDocument();
  });

  it('renders the formatted time', () => {
    render(<WinModal />);
    expect(screen.getByText('Time: 0:00')).toBeInTheDocument();
  });

  it('formats non-zero elapsed time correctly', () => {
    useGameStore.setState({ elapsedMs: 227000 }); // 3 min 47 sec
    render(<WinModal />);
    expect(screen.getByText('Time: 3:47')).toBeInTheDocument();
  });

  it('"New Game" button sets screen to landing', () => {
    render(<WinModal />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('landing');
  });

  it('"Close" button sets won to false', () => {
    render(<WinModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(useGameStore.getState().won).toBe(false);
  });

  it('clicking the backdrop sets won to false', () => {
    const { container } = render(<WinModal />);
    fireEvent.click(container.firstChild as Element);
    expect(useGameStore.getState().won).toBe(false);
  });

  it('clicking the card does not dismiss', () => {
    const { container } = render(<WinModal />);
    const card = container.querySelector('.win-card') as Element;
    fireEvent.click(card);
    expect(useGameStore.getState().won).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/game/WinModal.test.tsx
```

Expected: all fail — `WinModal` does not exist.

- [ ] **Step 3: Create `WinModal.tsx`**

Create `src/game/WinModal.tsx`:

```tsx
import './WinModal.css';
import type { Difficulty } from '../types';
import { useGameStore } from './store';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function WinModal() {
  const mistakes = useGameStore((s) => s.mistakes);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const difficulty = useGameStore((s) => s.puzzle.difficulty);

  const handleNewGame = () => useGameStore.getState().setScreen('landing');
  const handleClose = () => useGameStore.getState().dismissWin();

  return (
    <div className="win-backdrop" onClick={handleClose}>
      <div className="win-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="win-title">Puzzle Complete!</h2>
        <p className="win-difficulty">{DIFFICULTY_LABELS[difficulty]}</p>
        <p className="win-stat">Mistakes: {mistakes}</p>
        <p className="win-stat">Time: {formatTime(elapsedMs)}</p>
        <div className="win-actions">
          <button className="win-btn win-btn--new-game" onClick={handleNewGame}>
            New Game
          </button>
          <button className="win-btn win-btn--close" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `WinModal.css`**

Create `src/game/WinModal.css`:

```css
.win-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 280px;
  text-align: center;
}

.win-title {
  margin: 0;
  color: var(--fg);
  font-size: 1.75rem;
  font-weight: 700;
}

.win-difficulty {
  margin: 0;
  color: var(--fg-muted);
  font-size: 1rem;
}

.win-stat {
  margin: 0;
  color: var(--fg);
  font-size: 1rem;
}

.win-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.win-btn {
  padding: 10px 20px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 1rem;
  min-height: 44px;
}

.win-btn--new-game {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/game/WinModal.test.tsx
```

Expected: all 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/WinModal.tsx src/game/WinModal.css src/game/WinModal.test.tsx
git commit -m "feat(ui): add WinModal component with stats and dismiss/new-game actions"
```

---

## Task 5: App integration and full test run

**Files:**

- Modify: `src/app.tsx`

- [ ] **Step 1: Update `App` to render `WinModal`**

Replace the full content of `src/app.tsx`:

```tsx
import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
import { GameHeader } from './game/GameHeader';
import { HintPanel } from './hints/HintPanel';
import { NumberPad } from './game/NumberPad';
import { LandingScreen } from './landing/LandingScreen';
import { WinModal } from './game/WinModal';
import { useGameStore } from './game/store';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const won = useGameStore((s) => s.won);

  const handleMainClick = () => {
    const store = useGameStore.getState();
    store.selectCell(null);
    store.setSelectedNumber(null);
  };

  return (
    <main onClick={handleMainClick}>
      {screen === 'landing' && <LandingScreen />}
      {won && screen === 'game' && <WinModal />}
      <h1>Sudoku</h1>
      {screen === 'game' && <GameHeader />}
      <Board />
      <ActionBar />
      <HintPanel />
      <NumberPad />
    </main>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (previously 423, now ~432).

- [ ] **Step 3: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): render WinModal when puzzle is won"
```
