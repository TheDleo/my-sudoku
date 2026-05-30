# Phase 20: Settings Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a settings Zustand store with localStorage persistence, a gear-icon modal with five toggles and a theme picker, and wire all settings into the game (timer display, mistakes display, possible-placements highlights, auto-candidates, theme).

**Architecture:** Separate `src/settings/` module with its own Zustand store (persist middleware, key `'sudoku-settings'`). Game store reads settings via `useSettingsStore.getState()` inside action implementations. `theme.ts` applies `data-theme` to `<html>` via a React hook and a one-time startup call. Modal open state lives as local `useState` in `ActionBar`.

**Tech Stack:** React 18, TypeScript, Zustand 4 (`zustand/middleware` persist), Vitest, React Testing Library.

---

## File Map

| Action | File                                  |
| ------ | ------------------------------------- |
| Create | `src/settings/types.ts`               |
| Create | `src/settings/store.ts`               |
| Create | `src/settings/store.test.ts`          |
| Create | `src/settings/theme.ts`               |
| Create | `src/settings/theme.test.ts`          |
| Create | `src/settings/SettingsModal.tsx`      |
| Create | `src/settings/SettingsModal.css`      |
| Create | `src/settings/SettingsModal.test.tsx` |
| Modify | `src/game/GameHeader.tsx`             |
| Modify | `src/game/GameHeader.css`             |
| Modify | `src/game/GameHeader.test.tsx`        |
| Modify | `src/game/highlights.ts`              |
| Modify | `src/game/highlights.test.ts`         |
| Modify | `src/game/Board.tsx`                  |
| Modify | `src/game/store.ts`                   |
| Modify | `src/game/store.test.ts`              |
| Modify | `src/game/ActionBar.tsx`              |
| Modify | `src/game/ActionBar.css`              |
| Modify | `src/game/ActionBar.test.tsx`         |
| Modify | `src/app.tsx`                         |
| Modify | `src/main.tsx`                        |

---

## Task 1: Settings types

**Files:**

- Create: `src/settings/types.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/settings/types.ts
export type Theme = 'auto' | 'light' | 'dark';

export type Settings = {
  autoCandidates: boolean;
  possiblePlacements: boolean;
  showTimer: boolean;
  showMistakes: boolean;
  theme: Theme;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/settings/types.ts
git commit -m "feat(settings): add Settings and Theme types"
```

---

## Task 2: Settings store

**Files:**

- Create: `src/settings/store.ts`
- Create: `src/settings/store.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/settings/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './store';

const DEFAULTS = {
  autoCandidates: false,
  possiblePlacements: true,
  showTimer: true,
  showMistakes: true,
  theme: 'auto' as const,
};

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState(DEFAULTS);
});

describe('useSettingsStore', () => {
  it('has correct default values', () => {
    const s = useSettingsStore.getState();
    expect(s.autoCandidates).toBe(false);
    expect(s.possiblePlacements).toBe(true);
    expect(s.showTimer).toBe(true);
    expect(s.showMistakes).toBe(true);
    expect(s.theme).toBe('auto');
  });

  it('updateSetting changes autoCandidates', () => {
    useSettingsStore.getState().updateSetting('autoCandidates', true);
    expect(useSettingsStore.getState().autoCandidates).toBe(true);
  });

  it('updateSetting changes theme', () => {
    useSettingsStore.getState().updateSetting('theme', 'dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('updateSetting changes showTimer', () => {
    useSettingsStore.getState().updateSetting('showTimer', false);
    expect(useSettingsStore.getState().showTimer).toBe(false);
  });

  it('updateSetting changes possiblePlacements', () => {
    useSettingsStore.getState().updateSetting('possiblePlacements', false);
    expect(useSettingsStore.getState().possiblePlacements).toBe(false);
  });

  it('updateSetting persists value to localStorage', () => {
    useSettingsStore.getState().updateSetting('showMistakes', false);
    const raw = localStorage.getItem('sudoku-settings');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.showMistakes).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/settings/store.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the store**

```ts
// src/settings/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from './types';

type SettingsStore = Settings & {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const DEFAULTS: Settings = {
  autoCandidates: false,
  possiblePlacements: true,
  showTimer: true,
  showMistakes: true,
  theme: 'auto',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsStore>),
    }),
    { name: 'sudoku-settings' },
  ),
);
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/settings/store.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/settings/store.ts src/settings/store.test.ts
git commit -m "feat(settings): add Zustand settings store with localStorage persistence"
```

---

## Task 3: Theme module

**Files:**

- Create: `src/settings/theme.ts`
- Create: `src/settings/theme.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/settings/theme.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme } from './theme';

beforeEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('applyTheme', () => {
  it('sets data-theme="light" when called with "light"', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('sets data-theme="dark" when called with "dark"', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('removes data-theme attribute when called with "auto"', () => {
    document.documentElement.dataset.theme = 'light';
    applyTheme('auto');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('overrides a previous theme value', () => {
    applyTheme('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/settings/theme.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create theme.ts**

```ts
// src/settings/theme.ts
import { useEffect } from 'react';
import { useSettingsStore } from './store';
import type { Theme } from './types';

export function applyTheme(theme: Theme): void {
  if (theme === 'auto') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function useThemeSync(): void {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/settings/theme.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/settings/theme.ts src/settings/theme.test.ts
git commit -m "feat(settings): add applyTheme and useThemeSync"
```

---

## Task 4: Wire theme into app startup

**Files:**

- Modify: `src/main.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Update main.tsx to apply theme before first render**

Replace the entire file:

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createWorkerClient } from './generator/workerClient';
import { applyTheme } from './settings/theme';
import { useSettingsStore } from './settings/store';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

declare global {
  interface Window {
    __sudoku__?: { createWorkerClient: typeof createWorkerClient };
  }
}
window.__sudoku__ = { createWorkerClient };

applyTheme(useSettingsStore.getState().theme);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 2: Update app.tsx to call useThemeSync()**

Replace the entire file:

```tsx
// src/app.tsx
import { Board } from './game/Board';
import { ActionBar } from './game/ActionBar';
import { GameHeader } from './game/GameHeader';
import { HintPanel } from './hints/HintPanel';
import { NumberPad } from './game/NumberPad';
import { LandingScreen } from './landing/LandingScreen';
import { WinModal } from './game/WinModal';
import { useGameStore } from './game/store';
import { useThemeSync } from './settings/theme';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const won = useGameStore((s) => s.won);

  useThemeSync();

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

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/app.tsx
git commit -m "feat(settings): wire theme sync into app startup"
```

---

## Task 5: Mistakes counter and conditional timer in GameHeader

**Files:**

- Modify: `src/game/GameHeader.tsx`
- Modify: `src/game/GameHeader.css`
- Modify: `src/game/GameHeader.test.tsx`

- [ ] **Step 1: Write the new failing tests**

Add to the bottom of the existing `describe('GameHeader', ...)` block (after the last `it` but before the closing `}`):

```ts
// New tests to add in src/game/GameHeader.test.tsx
// Add these imports at the top of the file:
// import { useSettingsStore } from '../settings/store';
//
// Add this to the beforeEach:
//   useSettingsStore.setState({ autoCandidates: false, possiblePlacements: true,
//     showTimer: true, showMistakes: true, theme: 'auto' });
//
// Add these new tests inside the describe block:

it('renders the timer when showTimer is true', () => {
  useSettingsStore.setState({ showTimer: true });
  render(<GameHeader />);
  expect(screen.getByText('0:00')).toBeInTheDocument();
});

it('hides the timer when showTimer is false', () => {
  useSettingsStore.setState({ showTimer: false });
  render(<GameHeader />);
  expect(screen.queryByText('0:00')).not.toBeInTheDocument();
});

it('renders the mistakes counter when showMistakes is true', () => {
  useSettingsStore.setState({ showMistakes: true });
  useGameStore.setState({ mistakes: 3 });
  render(<GameHeader />);
  expect(screen.getByText('✕3')).toBeInTheDocument();
});

it('hides the mistakes counter when showMistakes is false', () => {
  useSettingsStore.setState({ showMistakes: false });
  useGameStore.setState({ mistakes: 3 });
  render(<GameHeader />);
  expect(screen.queryByText('✕3')).not.toBeInTheDocument();
});

it('shows ✕0 by default when showMistakes is true and mistakes is 0', () => {
  useSettingsStore.setState({ showMistakes: true });
  render(<GameHeader />);
  expect(screen.getByText('✕0')).toBeInTheDocument();
});
```

The full updated `src/game/GameHeader.test.tsx`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameHeader } from './GameHeader';
import * as persistence from './persistence';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
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
    useSettingsStore.setState({
      autoCandidates: false,
      possiblePlacements: true,
      showTimer: true,
      showMistakes: true,
      theme: 'auto',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    expect(window.confirm).toHaveBeenCalledWith(
      'Start a new game? Your current progress will be lost.',
    );
    expect(useGameStore.getState().screen).toBe('landing');
  });

  it('clicking New Game with confirm=false does not change screen', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('renders elapsed time as "0:00" when elapsedMs is 0', () => {
    render(<GameHeader />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('renders elapsed time formatted from elapsedMs', () => {
    useGameStore.setState({ elapsedMs: 227000 });
    render(<GameHeader />);
    expect(screen.getByText('3:47')).toBeInTheDocument();
  });

  it('increments elapsedMs by 1000 per second while playing', () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: false,
      puzzle: makePuzzle(),
    });
    render(<GameHeader />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState().elapsedMs).toBe(3000);
  });

  it('stops timer permanently when won becomes true', () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: false,
      puzzle: makePuzzle(),
    });
    render(<GameHeader />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      useGameStore.setState({ won: true });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState().elapsedMs).toBe(2000);
  });

  it('renders the timer when showTimer is true', () => {
    useSettingsStore.setState({ showTimer: true });
    render(<GameHeader />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('hides the timer when showTimer is false', () => {
    useSettingsStore.setState({ showTimer: false });
    render(<GameHeader />);
    expect(screen.queryByText('0:00')).not.toBeInTheDocument();
  });

  it('renders the mistakes counter when showMistakes is true', () => {
    useSettingsStore.setState({ showMistakes: true });
    useGameStore.setState({ mistakes: 3 });
    render(<GameHeader />);
    expect(screen.getByText('✕3')).toBeInTheDocument();
  });

  it('hides the mistakes counter when showMistakes is false', () => {
    useSettingsStore.setState({ showMistakes: false });
    useGameStore.setState({ mistakes: 3 });
    render(<GameHeader />);
    expect(screen.queryByText('✕3')).not.toBeInTheDocument();
  });

  it('shows ✕0 by default when showMistakes is true and mistakes is 0', () => {
    useSettingsStore.setState({ showMistakes: true });
    render(<GameHeader />);
    expect(screen.getByText('✕0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm new ones fail**

Run: `npx vitest run src/game/GameHeader.test.tsx`
Expected: the 5 new tests FAIL (existing tests still pass)

- [ ] **Step 3: Update GameHeader.tsx**

```tsx
// src/game/GameHeader.tsx
import './GameHeader.css';
import { useEffect } from 'react';
import type { Difficulty } from '../types';
import { formatTime } from './helpers';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

export function GameHeader() {
  const difficulty = useGameStore((s) => s.puzzle.difficulty);
  const elapsedMs = useGameStore((s) => s.elapsedMs);
  const mistakes = useGameStore((s) => s.mistakes);
  const won = useGameStore((s) => s.won);
  const showTimer = useSettingsStore((s) => s.showTimer);
  const showMistakes = useSettingsStore((s) => s.showMistakes);

  useEffect(() => {
    if (won) return;
    const id = setInterval(() => useGameStore.getState().tickTimer(), 1000);
    return () => clearInterval(id);
  }, [won]);

  const handleNewGame = () => {
    const confirmed = window.confirm('Start a new game? Your current progress will be lost.');
    if (confirmed) {
      useGameStore.getState().setScreen('landing');
    }
  };

  return (
    <div className="game-header" onClick={(e) => e.stopPropagation()}>
      <span className="game-header__difficulty">{DIFFICULTY_LABELS[difficulty]}</span>
      {showTimer && <span className="game-header__time">{formatTime(elapsedMs)}</span>}
      {showMistakes && <span className="game-header__mistakes">✕{mistakes}</span>}
      <button className="game-header__new-game" onClick={handleNewGame}>
        New Game
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Update GameHeader.css — add mistakes style**

Add after the `.game-header__time` block:

```css
.game-header__mistakes {
  color: var(--fg-muted);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Run tests to confirm all pass**

Run: `npx vitest run src/game/GameHeader.test.tsx`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/GameHeader.tsx src/game/GameHeader.css src/game/GameHeader.test.tsx
git commit -m "feat(settings): show/hide timer and mistakes counter via settings"
```

---

## Task 6: possiblePlacements parameter in getHighlights

**Files:**

- Modify: `src/game/highlights.ts`
- Modify: `src/game/highlights.test.ts`
- Modify: `src/game/Board.tsx`

- [ ] **Step 1: Write the new failing test**

Add this test at the end of `src/game/highlights.test.ts` (inside the outer test file, not inside a specific describe block):

```ts
// Add to the bottom of src/game/highlights.test.ts
describe('possiblePlacements parameter', () => {
  it('produces no "possible" highlights when possiblePlacements is false', () => {
    const state = {
      ...initialEmptyState,
      selection: { cell: null, number: 5 as Digit },
    };
    const map = getHighlights(state, false);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(map[r]![c]).not.toBe('possible');
      }
    }
  });

  it('produces "possible" highlights when possiblePlacements is true (explicit)', () => {
    const state = {
      ...initialEmptyState,
      selection: { cell: null, number: 5 as Digit },
    };
    const map = getHighlights(state, true);
    expect(map[0]![0]).toBe('possible');
  });

  it('defaults to showing possible highlights when parameter is omitted', () => {
    const state = {
      ...initialEmptyState,
      selection: { cell: null, number: 5 as Digit },
    };
    const map = getHighlights(state);
    expect(map[0]![0]).toBe('possible');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/game/highlights.test.ts`
Expected: the 3 new tests FAIL (the `false` case produces `'possible'` cells incorrectly, and the parameter doesn't exist yet)

- [ ] **Step 3: Update highlights.ts**

```ts
// src/game/highlights.ts
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
  possiblePlacements = true,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  if (possiblePlacements && state.selection.number !== null) {
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

  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  if (state.hintLevel >= 3 && state.currentHint !== null) {
    for (const coord of state.currentHint.highlights) {
      map[coord.row]![coord.col] = 'hint';
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

- [ ] **Step 4: Run highlights tests to confirm all pass**

Run: `npx vitest run src/game/highlights.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Update Board.tsx to pass possiblePlacements from settings store**

```tsx
// src/game/Board.tsx
import './Board.css';
import { useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
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
  const possiblePlacements = useSettingsStore((s) => s.possiblePlacements);
  const boardRef = useRef<HTMLDivElement>(null);

  const highlights = getHighlights(
    { cells, given, selection, pencilMode, currentHint, hintLevel },
    possiblePlacements,
  );

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

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/highlights.ts src/game/highlights.test.ts src/game/Board.tsx
git commit -m "feat(settings): gate possible-placements highlights on settings toggle"
```

---

## Task 7: Auto-candidates sync in game store

**Files:**

- Modify: `src/game/store.ts`
- Modify: `src/game/store.test.ts`

- [ ] **Step 1: Write the new failing tests**

Add these tests to the bottom of the `describe('useGameStore', ...)` block in `src/game/store.test.ts`. Also add the import for `useSettingsStore` at the top.

Full updated `src/game/store.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit } from '../types';
import * as persistence from './persistence';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { makePuzzle } from './testHelpers';

describe('useGameStore', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    saveSpy = vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({ ...initialEmptyState });
    useSettingsStore.setState({
      autoCandidates: false,
      possiblePlacements: true,
      showTimer: true,
      showMistakes: true,
      theme: 'auto',
    });
    saveSpy.mockClear();
  });

  it('selectCell does NOT trigger save', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    saveSpy.mockClear();
    useGameStore.getState().selectCell({ row: 4, col: 4 });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit DOES trigger save when it modifies cells', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('placeDigit on a given cell does NOT trigger save', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 0, col: 0 }); // given
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit pushes a snapshot onto history.past', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    expect(useGameStore.getState().history.past.length).toBe(1);
  });

  it('loadPuzzle triggers save', () => {
    saveSpy.mockClear();
    useGameStore.getState().loadPuzzle(makePuzzle());
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('undo through the store reverts placeDigit', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    useGameStore.getState().undo();
    expect(useGameStore.getState().cells[1]![1]!.value).toBe(null);
  });

  it('tickTimer increments elapsedMs and triggers save', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    saveSpy.mockClear();
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().elapsedMs).toBe(1000);
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  describe('auto-candidates', () => {
    it('placeDigit with autoCandidates=true fills candidates on remaining empty cells', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useSettingsStore.setState({ autoCandidates: true });
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().placeDigit(3 as Digit);
      // cells[2][2] is empty in makePuzzle; auto-candidates must have filled it
      expect(useGameStore.getState().cells[2]![2]!.pencilMarks.size).toBeGreaterThan(0);
    });

    it('eraseCell with autoCandidates=true refills candidates after erase', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().placeDigit(3 as Digit);
      useSettingsStore.setState({ autoCandidates: true });
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().eraseCell();
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
    });

    it('toggling autoCandidates from false to true immediately fills candidates', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      // Start with no candidates
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBe(0);
      // Toggle on via the store action
      useSettingsStore.getState().updateSetting('autoCandidates', true);
      // Subscriber fires synchronously — candidates must be filled now
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
    });

    it('toggling autoCandidates from true to false does NOT clear existing candidates', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useSettingsStore.getState().updateSetting('autoCandidates', true);
      const sizeBefore = useGameStore.getState().cells[1]![1]!.pencilMarks.size;
      useSettingsStore.getState().updateSetting('autoCandidates', false);
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBe(sizeBefore);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm new ones fail**

Run: `npx vitest run src/game/store.test.ts`
Expected: the 4 new auto-candidates tests FAIL

- [ ] **Step 3: Update store.ts**

```ts
// src/game/store.ts
import { create } from 'zustand';
import * as persistence from './persistence';
import * as reducers from './reducers';
import { initialEmptyState, withSnapshot } from './reducers';
import type { GameState, GameStore } from './types';
import { useSettingsStore } from '../settings/store';

export const useGameStore = create<GameStore>()((set) => ({
  ...initialEmptyState,

  loadPuzzle: (puzzle) => set((s) => reducers.loadPuzzle(s, puzzle)),
  selectCell: (coord) => set((s) => reducers.selectCell(s, coord)),
  setSelectedNumber: (n) => set((s) => reducers.setSelectedNumber(s, n)),

  placeDigit: (d) =>
    set((s) => {
      const next = withSnapshot(s, (st) => reducers.placeDigit(st, d));
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),
  eraseCell: () =>
    set((s) => {
      const next = withSnapshot(s, reducers.eraseCell);
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),
  togglePencilMark: (d) => set((s) => withSnapshot(s, (st) => reducers.togglePencilMark(st, d))),
  togglePencilMode: () => set((s) => withSnapshot(s, reducers.togglePencilMode)),
  fillCandidates: () => set((s) => withSnapshot(s, reducers.fillCandidates)),

  requestHint: () => set((s) => reducers.requestHint(s)),
  advanceHint: () => set((s) => reducers.advanceHint(s)),
  dismissHint: () => set((s) => reducers.dismissHint(s)),

  undo: () =>
    set((s) => {
      const next = reducers.undo(s);
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),
  redo: () =>
    set((s) => {
      const next = reducers.redo(s);
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),

  setScreen: (s) => set((st) => reducers.setScreen(st, s)),
  resumeGame: () =>
    set(() => {
      const saved = persistence.load();
      if (saved === null) return {};
      return { ...saved, screen: 'game' as const };
    }),
  dismissWin: () => set((s) => reducers.dismissWin(s)),
  tickTimer: () => set((s) => reducers.tickTimer(s)),
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
    won: false,
  };
  persistence.save(snapshot);
});

// When autoCandidates is toggled ON, immediately fill candidates.
useSettingsStore.subscribe((state, prev) => {
  if (state.autoCandidates && !prev.autoCandidates) {
    useGameStore.getState().fillCandidates();
  }
});
```

- [ ] **Step 4: Run the store tests**

Run: `npx vitest run src/game/store.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/store.ts src/game/store.test.ts
git commit -m "feat(settings): auto-candidates sync after board mutations and on toggle-on"
```

---

## Task 8: SettingsModal component

**Files:**

- Create: `src/settings/SettingsModal.tsx`
- Create: `src/settings/SettingsModal.css`
- Create: `src/settings/SettingsModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/settings/SettingsModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { useSettingsStore } from './store';

const DEFAULTS = {
  autoCandidates: false,
  possiblePlacements: true,
  showTimer: true,
  showMistakes: true,
  theme: 'auto' as const,
};

beforeEach(() => {
  useSettingsStore.setState(DEFAULTS);
});

describe('SettingsModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the Settings heading', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicking the card does not call onClose', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders an Auto-candidates toggle checked according to store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    const toggle = screen.getByRole('checkbox', { name: /auto-candidates/i });
    expect((toggle as HTMLInputElement).checked).toBe(false);
  });

  it('toggling Auto-candidates updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /auto-candidates/i }));
    expect(useSettingsStore.getState().autoCandidates).toBe(true);
  });

  it('renders a Possible placements toggle', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /possible placements/i })).toBeInTheDocument();
  });

  it('toggling Possible placements updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /possible placements/i }));
    expect(useSettingsStore.getState().possiblePlacements).toBe(false);
  });

  it('renders a Show timer toggle', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /show timer/i })).toBeInTheDocument();
  });

  it('toggling Show timer updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /show timer/i }));
    expect(useSettingsStore.getState().showTimer).toBe(false);
  });

  it('renders a Show mistakes toggle', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /show mistakes/i })).toBeInTheDocument();
  });

  it('toggling Show mistakes updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /show mistakes/i }));
    expect(useSettingsStore.getState().showMistakes).toBe(false);
  });

  it('renders three theme buttons: Auto, Light, Dark', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /^auto$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument();
  });

  it('clicking Dark theme button updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^dark$/i }));
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('clicking Light theme button updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^light$/i }));
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('the current theme button has aria-pressed=true', () => {
    useSettingsStore.setState({ theme: 'dark' });
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(
      (screen.getByRole('button', { name: /^dark$/i }) as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    expect(
      (screen.getByRole('button', { name: /^auto$/i }) as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('false');
  });
});
```

Note: add `import { vi } from 'vitest';` to the imports at the top of this test file.

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/settings/SettingsModal.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create SettingsModal.tsx**

```tsx
// src/settings/SettingsModal.tsx
import './SettingsModal.css';
import { useEffect, useRef } from 'react';
import { useSettingsStore } from './store';
import type { Theme } from './types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsModal({ isOpen, onClose }: Props) {
  const autoCandidates = useSettingsStore((s) => s.autoCandidates);
  const possiblePlacements = useSettingsStore((s) => s.possiblePlacements);
  const showTimer = useSettingsStore((s) => s.showTimer);
  const showMistakes = useSettingsStore((s) => s.showMistakes);
  const theme = useSettingsStore((s) => s.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    cardRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal__backdrop" onClick={onClose}>
      <div
        className="settings-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">Settings</h2>
          <button className="settings-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-modal__body">
          <label className="settings-modal__row">
            <span>Auto-candidates</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={autoCandidates}
              onChange={() => updateSetting('autoCandidates', !autoCandidates)}
            />
          </label>
          <label className="settings-modal__row">
            <span>Possible placements</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={possiblePlacements}
              onChange={() => updateSetting('possiblePlacements', !possiblePlacements)}
            />
          </label>
          <label className="settings-modal__row">
            <span>Show timer</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={showTimer}
              onChange={() => updateSetting('showTimer', !showTimer)}
            />
          </label>
          <label className="settings-modal__row">
            <span>Show mistakes</span>
            <input
              type="checkbox"
              className="settings-modal__toggle"
              checked={showMistakes}
              onChange={() => updateSetting('showMistakes', !showMistakes)}
            />
          </label>

          <div className="settings-modal__section">
            <span className="settings-modal__section-label">Theme</span>
            <div className="settings-modal__theme-group" role="group" aria-label="Theme">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  className={`settings-modal__theme-btn${theme === value ? ' settings-modal__theme-btn--active' : ''}`}
                  aria-pressed={theme === value}
                  onClick={() => updateSetting('theme', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SettingsModal.css**

```css
/* src/settings/SettingsModal.css */
.settings-modal__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-modal__card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 280px;
  max-width: 360px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  outline: none;
}

.settings-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.settings-modal__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--fg);
}

.settings-modal__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--fg-muted);
  padding: 4px 8px;
  line-height: 1;
  border-radius: 4px;
  min-height: 44px;
  min-width: 44px;
}

.settings-modal__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-modal__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  color: var(--fg);
  font-size: 0.9375rem;
}

.settings-modal__row:last-of-type {
  border-bottom: none;
}

.settings-modal__toggle {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--accent);
}

.settings-modal__section {
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-modal__section-label {
  color: var(--fg-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.settings-modal__theme-group {
  display: flex;
  gap: 8px;
}

.settings-modal__theme-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 0.875rem;
  min-height: 44px;
}

.settings-modal__theme-btn--active {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/settings/SettingsModal.test.tsx`
Expected: all tests PASS

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/settings/SettingsModal.tsx src/settings/SettingsModal.css src/settings/SettingsModal.test.tsx
git commit -m "feat(settings): add SettingsModal component with toggles and theme picker"
```

---

## Task 9: Gear button and Candidates-hide in ActionBar

**Files:**

- Modify: `src/game/ActionBar.tsx`
- Modify: `src/game/ActionBar.css`
- Modify: `src/game/ActionBar.test.tsx`

- [ ] **Step 1: Write the new failing tests**

Full updated `src/game/ActionBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { initialEmptyState, loadPuzzle } from './reducers';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { ActionBar } from './ActionBar';
import { makePuzzle } from './testHelpers';

describe('ActionBar', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
    useSettingsStore.setState({
      autoCandidates: false,
      possiblePlacements: true,
      showTimer: true,
      showMistakes: true,
      theme: 'auto',
    });
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

  it('renders a candidates button when autoCandidates is false', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /candidates/i })).toBeTruthy();
  });

  it('hides the candidates button when autoCandidates is true', () => {
    useSettingsStore.setState({ autoCandidates: true });
    render(<ActionBar />);
    expect(screen.queryByRole('button', { name: /candidates/i })).not.toBeInTheDocument();
  });

  it('clicking the candidates button fills candidates into empty cells', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    useGameStore.setState({ ...loaded });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /candidates/i }));
    expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
  });

  it('renders an undo button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /^undo$/i })).toBeTruthy();
  });

  it('renders a redo button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /^redo$/i })).toBeTruthy();
  });

  it('undo button is disabled when history.past is empty', () => {
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^undo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('undo button is enabled when history.past has entries', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [{ cells: initialEmptyState.cells, pencilMode: false }], future: [] },
    });
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^undo$/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('redo button is disabled when history.future is empty', () => {
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^redo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('redo button is enabled when history.future has entries', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [], future: [{ cells: initialEmptyState.cells, pencilMode: false }] },
    });
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^redo$/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking undo removes the last entry from history.past', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [{ cells: initialEmptyState.cells, pencilMode: false }], future: [] },
    });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /^undo$/i }));
    expect(useGameStore.getState().history.past.length).toBe(0);
  });

  it('clicking redo removes the last entry from history.future', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [], future: [{ cells: initialEmptyState.cells, pencilMode: false }] },
    });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /^redo$/i }));
    expect(useGameStore.getState().history.future.length).toBe(0);
  });

  it('renders a gear/settings button', () => {
    render(<ActionBar />);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('clicking the gear button opens the settings modal', () => {
    render(<ActionBar />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closing the settings modal hides it', () => {
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Click the close button inside the modal
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm new ones fail**

Run: `npx vitest run src/game/ActionBar.test.tsx`
Expected: the 3 new tests FAIL (gear button absent, autoCandidates hide absent)

- [ ] **Step 3: Update ActionBar.tsx**

```tsx
// src/game/ActionBar.tsx
import './ActionBar.css';
import { useState } from 'react';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { SettingsModal } from '../settings/SettingsModal';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);
  const canUndo = useGameStore((s) => s.history.past.length > 0);
  const canRedo = useGameStore((s) => s.history.future.length > 0);
  const autoCandidates = useSettingsStore((s) => s.autoCandidates);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handlePencilToggle = () => {
    useGameStore.getState().togglePencilMode();
  };

  const handleFillCandidates = () => {
    useGameStore.getState().fillCandidates();
  };

  const handleUndo = () => {
    useGameStore.getState().undo();
  };

  const handleRedo = () => {
    useGameStore.getState().redo();
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
      {!autoCandidates && (
        <button className="action-bar__candidates" onClick={handleFillCandidates}>
          Candidates
        </button>
      )}
      <button className="action-bar__undo" onClick={handleUndo} disabled={!canUndo}>
        Undo
      </button>
      <button className="action-bar__redo" onClick={handleRedo} disabled={!canRedo}>
        Redo
      </button>
      <button
        className="action-bar__settings"
        aria-label="Settings"
        onClick={() => setIsSettingsOpen(true)}
      >
        ⚙
      </button>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 4: Add gear button style to ActionBar.css**

Add at the end of `src/game/ActionBar.css`:

```css
.action-bar__settings {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 1rem;
  min-height: 44px;
  margin-left: auto;
}
```

- [ ] **Step 5: Run ActionBar tests**

Run: `npx vitest run src/game/ActionBar.test.tsx`
Expected: all tests PASS

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS — note the final count

- [ ] **Step 7: Commit**

```bash
git add src/game/ActionBar.tsx src/game/ActionBar.css src/game/ActionBar.test.tsx
git commit -m "feat(settings): add gear button to ActionBar; hide Candidates when auto-candidates on"
```

---

## Done

All 9 tasks complete. The settings system is fully wired:

- `src/settings/` contains types, store, theme, and modal
- Theme applies on startup and reacts to setting changes
- Timer and mistakes counter respect their toggles
- Possible-placements highlights gate on their toggle
- Auto-candidates keeps pencil marks in sync after every board mutation and fills immediately on toggle-on
- Gear button in ActionBar opens the modal; Candidates button hides when auto-candidates is on
