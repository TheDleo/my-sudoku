# Phase 21: Landing Screen and New Game Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a landing screen that lets users pick a difficulty or resume a saved game, and a GameHeader with a "New Game" button, making the app playable end-to-end.

**Architecture:** `GameState` gains a `screen: 'landing' | 'game'` field; a module-level `workerClient` singleton pre-warms all four puzzle tiers at import time; a `LandingScreen` overlay renders over the game when `screen === 'landing'` and a `GameHeader` renders above the board when `screen === 'game'`.

**Tech Stack:** React, Zustand, Vitest, React Testing Library, CSS custom properties (existing token system)

---

## File Map

| File                                 | Action | Responsibility                                                                                                                         |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/game/types.ts`                  | Modify | Add `screen` to `GameState`; add `setScreen`/`resumeGame` to `GameStore`                                                               |
| `src/game/persistence.ts`            | Modify | Return `screen: 'landing'` in `deserialize()`                                                                                          |
| `src/game/reducers.ts`               | Modify | Add `screen: 'landing'` to `initialEmptyState`; rename `_state` to `state` in `loadPuzzle`, preserve `screen`; add `setScreen` reducer |
| `src/game/reducers.test.ts`          | Modify | Add 2 tests for `setScreen`                                                                                                            |
| `src/game/store.ts`                  | Modify | Wire `setScreen` and `resumeGame` actions; add `screen` to auto-save snapshot                                                          |
| `src/generator/client.ts`            | Create | Module-level `workerClient` singleton                                                                                                  |
| `src/landing/LandingScreen.tsx`      | Create | Difficulty picker + optional Resume button                                                                                             |
| `src/landing/LandingScreen.css`      | Create | Fixed full-screen overlay styles                                                                                                       |
| `src/landing/LandingScreen.test.tsx` | Create | RTL tests for LandingScreen                                                                                                            |
| `src/game/GameHeader.tsx`            | Create | Difficulty label + New Game button                                                                                                     |
| `src/game/GameHeader.css`            | Create | Header bar styles                                                                                                                      |
| `src/game/GameHeader.test.tsx`       | Create | RTL tests for GameHeader                                                                                                               |
| `src/app.tsx`                        | Modify | Render `<LandingScreen />` and `<GameHeader />` conditionally                                                                          |

---

### Task 1: Add `screen` to `GameState` and fix `persistence.ts`

**Files:**

- Modify: `src/game/types.ts`
- Modify: `src/game/persistence.ts`

- [ ] **Step 1: Add `screen` to `GameState` and `setScreen`/`resumeGame` to `GameStore`**

In `src/game/types.ts`, replace the existing types with:

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
};
```

- [ ] **Step 2: Add `screen: 'landing'` to `persistence.deserialize()`**

`deserialize()` in `src/game/persistence.ts` builds and returns a `GameState`. TypeScript now requires `screen`. Persistence always deserializes to `'landing'` so reloading always shows the landing first.

Find the `return { ... }` block inside `deserialize()` (lines 59–70) and add `screen: 'landing' as const` to it:

```ts
return {
  puzzle: parsed.puzzle,
  cells,
  given: parsed.given,
  selection: { cell: null, number: null },
  pencilMode: parsed.pencilMode,
  mistakes: parsed.mistakes,
  elapsedMs: parsed.elapsedMs,
  history: { past: [], future: [] },
  currentHint: null,
  hintLevel: 1,
  screen: 'landing' as const,
};
```

`serialize()` does not need to change — `SerializedState` intentionally omits `screen` so the persisted format stays stable.

- [ ] **Step 3: Run typecheck to confirm no remaining errors**

```bash
npm run typecheck
```

Expected: errors about `screen` missing from `initialEmptyState` and the `store.ts` snapshot — these will be fixed in Task 2 and Task 3.

---

### Task 2: Update reducers — `initialEmptyState`, `loadPuzzle`, and new `setScreen`

**Files:**

- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

- [ ] **Step 1: Write the failing tests for `setScreen`**

At the bottom of the `describe` block in `src/game/reducers.test.ts`, add a new import for `setScreen` at the top (alongside existing imports):

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
  setScreen,
  setSelectedNumber,
  togglePencilMark,
  togglePencilMode,
  undo,
  withSnapshot,
} from './reducers';
```

Then add this describe block at the end of the file (before the final closing `}`):

```ts
describe('setScreen', () => {
  it("setScreen('game') sets screen to 'game'", () => {
    const next = setScreen(initialEmptyState, 'game');
    expect(next.screen).toBe('game');
  });

  it("setScreen('landing') sets screen to 'landing'", () => {
    const state = { ...initialEmptyState, screen: 'game' as const };
    const next = setScreen(state, 'landing');
    expect(next.screen).toBe('landing');
  });
});
```

Also add a `screen` assertion to the existing `initialEmptyState` test:

```ts
expect(initialEmptyState.screen).toBe('landing');
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: FAIL — `setScreen` is not exported, `initialEmptyState.screen` is undefined.

- [ ] **Step 3: Implement the reducer changes**

In `src/game/reducers.ts`:

**3a** — Add `screen: 'landing'` to `initialEmptyState` (after `hintLevel: 1`):

```ts
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
};
```

**3b** — Rename `_state` to `state` in `loadPuzzle` and preserve `screen` in the returned object:

```ts
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
  };
}
```

**3c** — Add the `setScreen` reducer after `dismissHint`:

```ts
export function setScreen(state: GameState, s: 'landing' | 'game'): GameState {
  return { ...state, screen: s };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/game/reducers.test.ts
```

Expected: all tests PASS (previously ~60+ tests + 3 new = no regressions).

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/persistence.ts src/game/reducers.ts src/game/reducers.test.ts
git commit -m "feat(game): add screen field to GameState with setScreen reducer"
```

---

### Task 3: Wire `setScreen` and `resumeGame` in the store

**Files:**

- Modify: `src/game/store.ts`

- [ ] **Step 1: Update `store.ts`**

Replace the entire `store.ts` with:

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
  };
  persistence.save(snapshot);
});
```

Note: `resumeGame` returns `{}` (no-op) when nothing is saved. Zustand's `set()` merges shallowly, so the action functions survive any `set()` call.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: clean (all `GameState` uses now include `screen`).

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all existing tests pass (≥ 412).

- [ ] **Step 4: Commit**

```bash
git add src/game/store.ts
git commit -m "feat(game): add setScreen and resumeGame store actions"
```

---

### Task 4: Create `workerClient` singleton

**Files:**

- Create: `src/generator/client.ts`

- [ ] **Step 1: Create the singleton module**

```ts
import { createWorkerClient } from './workerClient';

export const workerClient = createWorkerClient();
```

Pre-generation of all 4 difficulties begins the moment this module is imported. By the time the user picks a difficulty on the landing screen the puzzle is almost certainly ready in cache.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/generator/client.ts
git commit -m "feat(generator): export module-level workerClient singleton"
```

---

### Task 5: Create `LandingScreen` component

**Files:**

- Create: `src/landing/LandingScreen.test.tsx`
- Create: `src/landing/LandingScreen.tsx`
- Create: `src/landing/LandingScreen.css`

- [ ] **Step 1: Write the failing tests**

Create `src/landing/LandingScreen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingScreen } from './LandingScreen';
import { workerClient } from '../generator/client';
import * as persistence from '../game/persistence';
import { useGameStore } from '../game/store';
import { initialEmptyState } from '../game/reducers';
import { makePuzzle } from '../game/testHelpers';

vi.mock('../generator/client', () => ({
  workerClient: { getPuzzle: vi.fn() },
}));

vi.mock('../game/persistence', () => ({
  load: vi.fn(),
  save: vi.fn(),
}));

describe('LandingScreen', () => {
  beforeEach(() => {
    vi.mocked(persistence.load).mockReturnValue(null);
    vi.mocked(workerClient.getPuzzle).mockResolvedValue(makePuzzle());
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders 4 difficulty buttons', () => {
    render(<LandingScreen />);
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expert' })).toBeInTheDocument();
  });

  it('shows no Resume button when persistence.load returns null', () => {
    vi.mocked(persistence.load).mockReturnValue(null);
    render(<LandingScreen />);
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
  });

  it('shows Resume button when a non-sentinel saved game exists', () => {
    vi.mocked(persistence.load).mockReturnValue({
      ...initialEmptyState,
      puzzle: { ...initialEmptyState.puzzle, id: 'saved-puzzle-id' },
    });
    render(<LandingScreen />);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('clicking Easy calls getPuzzle(easy), then loadPuzzle, then setScreen(game)', async () => {
    const puzzle = makePuzzle();
    vi.mocked(workerClient.getPuzzle).mockResolvedValue(puzzle);
    render(<LandingScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Easy' }));

    expect(workerClient.getPuzzle).toHaveBeenCalledWith('easy');
    await waitFor(() => {
      expect(useGameStore.getState().puzzle).toBe(puzzle);
      expect(useGameStore.getState().screen).toBe('game');
    });
  });

  it('clicking Resume calls resumeGame, setting screen to game', () => {
    const saved = {
      ...initialEmptyState,
      puzzle: { ...initialEmptyState.puzzle, id: 'saved-puzzle-id' },
    };
    vi.mocked(persistence.load).mockReturnValue(saved);
    render(<LandingScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(useGameStore.getState().screen).toBe('game');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/landing/LandingScreen.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `LandingScreen.tsx`**

Create `src/landing/LandingScreen.tsx`:

```tsx
import { useState } from 'react';
import './LandingScreen.css';
import type { Difficulty } from '../types';
import { workerClient } from '../generator/client';
import * as persistence from '../game/persistence';
import { useGameStore } from '../game/store';

const DIFFICULTIES: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'medium', label: 'Medium' },
  { difficulty: 'hard', label: 'Hard' },
  { difficulty: 'expert', label: 'Expert' },
];

export function LandingScreen() {
  const [generating, setGenerating] = useState<Difficulty | null>(null);
  const [hasSavedGame] = useState(() => {
    const saved = persistence.load();
    return saved !== null && saved.puzzle.id !== '';
  });

  const handleDifficulty = async (d: Difficulty) => {
    setGenerating(d);
    const puzzle = await workerClient.getPuzzle(d);
    useGameStore.getState().loadPuzzle(puzzle);
    useGameStore.getState().setScreen('game');
  };

  const handleResume = () => {
    useGameStore.getState().resumeGame();
  };

  return (
    <div className="landing-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="landing-card">
        <p className="landing-title">Sudoku</p>
        {hasSavedGame && (
          <button
            className="landing-btn landing-btn--resume"
            onClick={handleResume}
            disabled={generating !== null}
          >
            Resume
          </button>
        )}
        <div className="landing-difficulties">
          {DIFFICULTIES.map(({ difficulty, label }) => (
            <button
              key={difficulty}
              className="landing-btn"
              onClick={() => {
                void handleDifficulty(difficulty);
              }}
              disabled={generating !== null}
            >
              {generating === difficulty ? 'Generating…' : label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `LandingScreen.css`**

Create `src/landing/LandingScreen.css`:

```css
.landing-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.landing-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 280px;
}

.landing-title {
  margin: 0;
  color: var(--fg);
  font-size: 2rem;
  font-weight: 700;
}

.landing-difficulties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.landing-btn {
  padding: 12px 24px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 1rem;
  min-height: 44px;
}

.landing-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.landing-btn--resume {
  width: 100%;
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/landing/LandingScreen.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/landing/LandingScreen.tsx src/landing/LandingScreen.css src/landing/LandingScreen.test.tsx
git commit -m "feat(landing): add LandingScreen difficulty picker and resume flow"
```

---

### Task 6: Create `GameHeader` component

**Files:**

- Create: `src/game/GameHeader.test.tsx`
- Create: `src/game/GameHeader.tsx`
- Create: `src/game/GameHeader.css`

- [ ] **Step 1: Write the failing tests**

Create `src/game/GameHeader.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameHeader } from './GameHeader';
import * as persistence from './persistence';
import { useGameStore } from './store';
import { initialEmptyState } from './reducers';
import { makePuzzle } from './testHelpers';

describe('GameHeader', () => {
  beforeEach(() => {
    vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      puzzle: makePuzzle(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the puzzle difficulty label', () => {
    render(<GameHeader />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('renders a New Game button', () => {
    render(<GameHeader />);
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
  });

  it('clicking New Game with confirm=true sets screen to landing', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('landing');
  });

  it('clicking New Game with confirm=false does not change screen', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('game');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/game/GameHeader.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GameHeader.tsx`**

Create `src/game/GameHeader.tsx`:

```tsx
import './GameHeader.css';
import type { Difficulty } from '../types';
import { useGameStore } from './store';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export function GameHeader() {
  const difficulty = useGameStore((s) => s.puzzle.difficulty);

  const handleNewGame = () => {
    const confirmed = window.confirm('Start a new game? Your current progress will be lost.');
    if (confirmed) {
      useGameStore.getState().setScreen('landing');
    }
  };

  return (
    <div className="game-header" onClick={(e) => e.stopPropagation()}>
      <span className="game-header__difficulty">{DIFFICULTY_LABELS[difficulty]}</span>
      <button className="game-header__new-game" onClick={handleNewGame}>
        New Game
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `GameHeader.css`**

Create `src/game/GameHeader.css`:

```css
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(100%, 500px);
  margin-bottom: 8px;
}

.game-header__difficulty {
  color: var(--fg-muted);
  font-size: 0.875rem;
}

.game-header__new-game {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 0.875rem;
  min-height: 44px;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/game/GameHeader.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/GameHeader.tsx src/game/GameHeader.css src/game/GameHeader.test.tsx
git commit -m "feat(game): add GameHeader with difficulty label and New Game button"
```

---

### Task 7: Wire `LandingScreen` and `GameHeader` into `App`

**Files:**

- Modify: `src/app.tsx`

- [ ] **Step 1: Update `App`**

Replace `src/app.tsx` with:

```tsx
import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
import { GameHeader } from './game/GameHeader';
import { HintPanel } from './hints/HintPanel';
import { NumberPad } from './game/NumberPad';
import { LandingScreen } from './landing/LandingScreen';
import { useGameStore } from './game/store';

export function App() {
  const screen = useGameStore((s) => s.screen);

  const handleMainClick = () => {
    const store = useGameStore.getState();
    store.selectCell(null);
    store.setSelectedNumber(null);
  };

  return (
    <main onClick={handleMainClick}>
      {screen === 'landing' && <LandingScreen />}
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

`LandingScreen` is a fixed overlay so it renders visually on top regardless of DOM order. The `<h1>Sudoku</h1>` stays in the document for semantic correctness and to keep the existing `app.test.tsx` assertions working. `LandingScreen` uses `<p className="landing-title">` (not a heading element) to avoid a duplicate heading conflict with the `<h1>`.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: ≥ 421 tests PASS, zero failures.

- [ ] **Step 4: Commit**

```bash
git add src/app.tsx
git commit -m "feat(app): render LandingScreen overlay and GameHeader based on screen state"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                                              | Task                    |
| ----------------------------------------------------------------------------- | ----------------------- |
| `screen: 'landing' \| 'game'` in `GameState`                                  | Task 1                  |
| `initialEmptyState` has `screen: 'landing'`                                   | Task 2                  |
| `persistence.deserialize()` always returns `screen: 'landing'`                | Task 1                  |
| `loadPuzzle` preserves `screen` (rename `_state` → `state`)                   | Task 2                  |
| `setScreen` reducer                                                           | Task 2                  |
| `setScreen` and `resumeGame` store actions                                    | Task 3                  |
| `workerClient` singleton in `src/generator/client.ts`                         | Task 4                  |
| `LandingScreen` — 4 difficulty buttons                                        | Task 5                  |
| `LandingScreen` — Resume button when non-sentinel save exists                 | Task 5                  |
| `LandingScreen` — difficulty flow: getPuzzle → loadPuzzle → setScreen('game') | Task 5                  |
| `LandingScreen` — "Generating…" disabled state while awaiting                 | Task 5 (component impl) |
| `LandingScreen` — fixed overlay, design tokens                                | Task 5 (CSS)            |
| `GameHeader` — difficulty label on left, New Game on right                    | Task 6                  |
| `GameHeader` — New Game confirm dialog                                        | Task 6                  |
| App wires both components conditionally                                       | Task 7                  |
| `npx vitest run` passes with ~421 tests                                       | Task 7 Step 3           |
| `npm run typecheck` clean                                                     | Tasks 1, 3, 7           |

**Placeholder scan:** No TBDs, TODOs, or "similar to Task N" shortcuts. Every step has the complete implementation.

**Type consistency check:**

- `setScreen(state, s)` defined in Task 2, imported in Task 3 (`reducers.setScreen`) and used in `GameHeader` as `useGameStore.getState().setScreen('landing')` — consistent.
- `workerClient.getPuzzle(d)` signature from `WorkerClient` type in `workerClient.ts` — matches usage in `LandingScreen`.
- `persistence.load()` returns `GameState | null` — matches `resumeGame` guard `if (saved === null) return {}`.
- `screen: 'landing' as const` used in both `persistence.deserialize()` (Task 1) and `resumeGame` fallback — consistent literal type.
