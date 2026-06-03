# Mobile Layout Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the top of the screen (title + settings + New Game in one row, smaller stats), fix ActionBar overflow (icon-only color buttons, settings moved to header), and split NumberPad into two rows for larger tap targets.

**Architecture:** Three independent tasks — GameHeader absorbs the h1 title and Settings button, ActionBar loses settings and shrinks color buttons to icon-only, NumberPad splits into two flex rows. LandingScreen's `<p>` title becomes an `<h1>` so the e2e smoke test still finds a heading on the landing screen. The global `h1` rule is removed; GameHeader owns its own title style.

**Tech Stack:** React 18, TypeScript, CSS custom properties, Vitest + Testing Library.

---

### Task 1: GameHeader — title row, settings, compact stats

**Files:**

- Modify: `src/game/GameHeader.tsx`
- Modify: `src/game/GameHeader.css`
- Modify: `src/game/GameHeader.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/landing/LandingScreen.tsx`

- [ ] **Step 1: Write the failing tests**

  Open `src/game/GameHeader.test.tsx`. Add these three tests at the end of the existing `describe('GameHeader', ...)` block, before the closing `});`:

  ```ts
  it('renders the "Sudoku" h1 heading', () => {
    render(<GameHeader />);
    expect(screen.getByRole('heading', { name: 'Sudoku', level: 1 })).toBeInTheDocument();
  });

  it('renders a Settings button', () => {
    render(<GameHeader />);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('clicking Settings opens the settings modal', () => {
    render(<GameHeader />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closing the settings modal hides it', () => {
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  ```

  The import at the top of the file already includes `fireEvent` and `screen`, so no new imports are needed.

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/game/GameHeader.test.tsx
  ```

  Expected: 4 new failures — the heading, Settings button, and modal tests all fail because GameHeader doesn't have those elements yet.

- [ ] **Step 3: Replace `src/game/GameHeader.tsx`**

  ```tsx
  // src/game/GameHeader.tsx
  import './GameHeader.css';
  import { useState, useEffect } from 'react';
  import type { Difficulty } from '../types';
  import { formatTime } from './helpers';
  import { useGameStore } from './store';
  import { useSettingsStore } from '../settings/store';
  import { SettingsModal } from '../settings/SettingsModal';

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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
        <div className="game-header__top">
          <button
            className="game-header__settings"
            aria-label="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            ⚙
          </button>
          <h1 className="game-header__title">Sudoku</h1>
          <button className="game-header__new-game" onClick={handleNewGame}>
            New Game
          </button>
        </div>
        <div className="game-header__stats">
          <span className="game-header__difficulty">{DIFFICULTY_LABELS[difficulty]}</span>
          {showTimer && <span className="game-header__time">{formatTime(elapsedMs)}</span>}
          {showMistakes && <span className="game-header__mistakes">✕{mistakes}</span>}
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    );
  }
  ```

- [ ] **Step 4: Replace `src/game/GameHeader.css`**

  ```css
  .game-header {
    display: flex;
    flex-direction: column;
    width: min(100%, 500px);
    gap: 2px;
    margin-bottom: 8px;
  }

  .game-header__top {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .game-header__title {
    flex: 1;
    text-align: center;
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: var(--fg);
  }

  .game-header__settings {
    padding: 4px 9px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
    font-size: 1rem;
    min-height: 36px;
    min-width: 36px;
  }

  .game-header__new-game {
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
    font-size: 0.75rem;
    min-height: 36px;
    white-space: nowrap;
  }

  .game-header__stats {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  .game-header__difficulty,
  .game-header__time,
  .game-header__mistakes {
    color: var(--fg-muted);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
  ```

- [ ] **Step 5: Update `src/App.tsx` — remove the standalone h1**

  Replace the entire file with:

  ```tsx
  import { Board } from './game/Board';
  import { ActionBar } from './game/ActionBar';
  import { GameHeader } from './game/GameHeader';
  import { HintPanel } from './hints/HintPanel';
  import { NumberPad } from './game/NumberPad';
  import { LandingScreen } from './landing/LandingScreen';
  import { WinModal } from './game/WinModal';
  import { Announcer } from './game/Announcer';
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
        <Announcer />
        {screen === 'landing' && <LandingScreen />}
        {won && screen === 'game' && <WinModal />}
        {screen === 'game' && <GameHeader />}
        <Board />
        <ActionBar />
        <HintPanel />
        <NumberPad />
      </main>
    );
  }
  ```

  The only change from the current file is removing the `<h1>Sudoku</h1>` line.

- [ ] **Step 6: Remove the global h1 rule from `src/styles/global.css`**

  Find and remove this block:

  ```css
  h1 {
    font-size: 2rem;
    margin: 0;
  }
  ```

  The `.game-header__title` rule in `GameHeader.css` handles the game-screen h1. The LandingScreen title (next step) gets its size from `.landing-title`.

- [ ] **Step 7: Update `src/landing/LandingScreen.tsx` — change `<p>` to `<h1>` for the title**

  Find this line:

  ```tsx
  <p className="landing-title">Sudoku</p>
  ```

  Replace with:

  ```tsx
  <h1 className="landing-title">Sudoku</h1>
  ```

  The `.landing-title` CSS already sets `font-size: 2rem; font-weight: 700; margin: 0;` so the visual appearance is unchanged. This restores the `role="heading" level=1` that the e2e smoke test expects on the landing screen.

- [ ] **Step 8: Run all GameHeader tests to confirm they pass**

  ```bash
  npx vitest run src/game/GameHeader.test.tsx
  ```

  Expected: all 17 tests pass (13 original + 4 new).

- [ ] **Step 9: Run the full test suite for regressions**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass. ActionBar still has its own Settings button at this point (Task 2 removes it), so ActionBar's Settings tests continue to pass. There are now two components with a Settings button — that is intentional and temporary.

- [ ] **Step 10: Commit**

  ```bash
  git add src/game/GameHeader.tsx src/game/GameHeader.css src/game/GameHeader.test.tsx \
          src/App.tsx src/styles/global.css src/landing/LandingScreen.tsx
  git commit -m "feat(ui): move title + settings into GameHeader top row; compact stats"
  ```

---

### Task 2: ActionBar — remove settings, icon-only color buttons

**Files:**

- Modify: `src/game/ActionBar.tsx`
- Modify: `src/game/ActionBar.css`
- Modify: `src/game/ActionBar.test.tsx`

Context: ActionBar currently has 7 items (Pencil, Candidates, Undo, Redo, 🔵 A, 🟡 B, ⚙). Task 1 moved ⚙ to GameHeader. This task removes the Settings import from ActionBar, changes the color buttons to icon-only (🔵, 🟡 with `aria-label`), and updates the tests.

- [ ] **Step 1: Update `ActionBar.test.tsx`**

  Make these changes to `src/game/ActionBar.test.tsx`:

  **Remove** these three tests entirely (lines 167–186 in the current file):

  ```ts
  it('renders a gear/settings button', ...
  it('clicking the gear button opens the settings modal', ...
  it('closing the settings modal hides it', ...
  ```

  **Replace** the six color-button tests at lines 188–227. The current tests use `{ name: /🔵 a/i }` which matches the button's text content "🔵 A". After the change, the text will be just "🔵" with `aria-label="Color A"`, so the accessible name becomes "Color A". Update the name matchers:

  Replace:

  ```ts
  it('renders 🔵 A color button with aria-pressed="false" by default', () => {
    render(<ActionBar />);
    const btn = screen.getByRole('button', { name: /🔵 a/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders 🟡 B color button with aria-pressed="false" by default', () => {
    render(<ActionBar />);
    const btn = screen.getByRole('button', { name: /🟡 b/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking 🔵 A sets colorMode to "A"', () => {
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /🔵 a/i }));
    expect(useGameStore.getState().colorMode).toBe('A');
  });

  it('clicking 🔵 A again deactivates colorMode', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /🔵 a/i }));
    expect(useGameStore.getState().colorMode).toBeNull();
  });

  it('clicking 🟡 B while A is active switches colorMode to "B"', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /🟡 b/i }));
    expect(useGameStore.getState().colorMode).toBe('B');
  });

  it('🔵 A button has aria-pressed="true" when colorMode is "A"', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    expect(screen.getByRole('button', { name: /🔵 a/i }).getAttribute('aria-pressed')).toBe('true');
  });
  ```

  With:

  ```ts
  it('renders Color A button with aria-pressed="false" by default', () => {
    render(<ActionBar />);
    const btn = screen.getByRole('button', { name: /color a/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders Color B button with aria-pressed="false" by default', () => {
    render(<ActionBar />);
    const btn = screen.getByRole('button', { name: /color b/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking Color A sets colorMode to "A"', () => {
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /color a/i }));
    expect(useGameStore.getState().colorMode).toBe('A');
  });

  it('clicking Color A again deactivates colorMode', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /color a/i }));
    expect(useGameStore.getState().colorMode).toBeNull();
  });

  it('clicking Color B while A is active switches colorMode to "B"', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /color b/i }));
    expect(useGameStore.getState().colorMode).toBe('B');
  });

  it('Color A button has aria-pressed="true" when colorMode is "A"', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    expect(
      screen.getByRole('button', { name: /color a/i }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
  ```

- [ ] **Step 2: Run tests to confirm the color-button tests now fail (Settings tests no longer present)**

  ```bash
  npx vitest run src/game/ActionBar.test.tsx
  ```

  Expected: the 6 updated color-button tests fail (component still has "🔵 A" text), the 3 Settings tests are gone. All other existing tests pass.

- [ ] **Step 3: Replace `src/game/ActionBar.tsx`**

  ```tsx
  // src/game/ActionBar.tsx
  import './ActionBar.css';
  import { useGameStore } from './store';
  import { useSettingsStore } from '../settings/store';

  export function ActionBar() {
    const pencilMode = useGameStore((s) => s.pencilMode);
    const canUndo = useGameStore((s) => s.history.past.length > 0);
    const canRedo = useGameStore((s) => s.history.future.length > 0);
    const colorMode = useGameStore((s) => s.colorMode);
    const autoCandidates = useSettingsStore((s) => s.autoCandidates);

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
          className={`action-bar__color-a${colorMode === 'A' ? ' action-bar__color-a--active' : ''}`}
          aria-pressed={colorMode === 'A'}
          aria-label="Color A"
          onClick={() => useGameStore.getState().toggleColorMode('A')}
        >
          🔵
        </button>
        <button
          className={`action-bar__color-b${colorMode === 'B' ? ' action-bar__color-b--active' : ''}`}
          aria-pressed={colorMode === 'B'}
          aria-label="Color B"
          onClick={() => useGameStore.getState().toggleColorMode('B')}
        >
          🟡
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 4: Replace `src/game/ActionBar.css`**

  ```css
  .action-bar {
    display: flex;
    width: min(100%, 500px);
    gap: 4px;
    margin-top: 8px;
  }

  .action-bar__pencil {
    flex: 1;
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

  .action-bar__candidates {
    flex: 1;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
    font-size: 0.875rem;
    min-height: 44px;
  }

  .action-bar__undo,
  .action-bar__redo {
    flex: 1;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
    font-size: 0.875rem;
    min-height: 44px;
  }

  .action-bar__undo:disabled,
  .action-bar__redo:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-bar__color-a,
  .action-bar__color-b {
    flex: 0 0 44px;
    padding: 8px 4px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
    font-size: 1.125rem;
    min-height: 44px;
  }

  .action-bar__color-a--active {
    background: var(--accent);
    color: var(--accent-fg);
    border-color: var(--accent);
  }

  .action-bar__color-b--active {
    background: var(--color-b);
    color: #ffffff;
    border-color: var(--color-b);
  }
  ```

- [ ] **Step 5: Run ActionBar tests to confirm they all pass**

  ```bash
  npx vitest run src/game/ActionBar.test.tsx
  ```

  Expected: all remaining ActionBar tests pass (total count is now 3 fewer than before — the removed Settings tests).

- [ ] **Step 6: Run the full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add src/game/ActionBar.tsx src/game/ActionBar.css src/game/ActionBar.test.tsx
  git commit -m "feat(ui): remove settings from ActionBar; color buttons icon-only"
  ```

---

### Task 3: NumberPad — two rows

**Files:**

- Modify: `src/game/NumberPad.tsx`
- Modify: `src/game/NumberPad.css`

The existing tests all use `data-digit` attribute selectors and the `.number-pad__erase` class, which remain unchanged. The one test that uses `getAllByRole('button')` expects 10 buttons — still true with the two-row layout (5 + 5). No test changes needed.

- [ ] **Step 1: Verify the existing tests pass before making changes**

  ```bash
  npx vitest run src/game/NumberPad.test.tsx
  ```

  Expected: all 8 tests pass. This confirms the baseline before you change the component.

- [ ] **Step 2: Replace `src/game/NumberPad.tsx`**

  ```tsx
  import './NumberPad.css';
  import type { Digit } from '../types';
  import { useGameStore } from './store';
  import { getRemainingCounts } from './helpers';

  const ROW1: Digit[] = [1, 2, 3, 4, 5];
  const ROW2: Digit[] = [6, 7, 8, 9];

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

    const renderDigit = (d: Digit) => (
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
    );

    return (
      <div className="number-pad" onClick={(e) => e.stopPropagation()}>
        <div className="number-pad__row">{ROW1.map(renderDigit)}</div>
        <div className="number-pad__row">
          {ROW2.map(renderDigit)}
          <button className="number-pad__erase" aria-label="Erase" onClick={handleErase}>
            ⌫
          </button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Replace `src/game/NumberPad.css`**

  ```css
  .number-pad {
    display: flex;
    flex-direction: column;
    width: min(100%, 500px);
    gap: 4px;
    margin-top: 12px;
  }

  .number-pad__row {
    display: flex;
    gap: 4px;
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
    font-size: clamp(1.125rem, 4vw, 1.25rem);
    line-height: 1;
    gap: 2px;
    min-height: 52px;
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
    font-size: clamp(1.125rem, 4vw, 1.5rem);
  }
  ```

- [ ] **Step 4: Run NumberPad tests to confirm they all pass**

  ```bash
  npx vitest run src/game/NumberPad.test.tsx
  ```

  Expected: all 8 tests pass. The `getAllByRole('button')` test still finds 10 buttons (5 in row 1 + 4 digits + 1 erase in row 2).

- [ ] **Step 5: Run the full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 6: Typecheck**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add src/game/NumberPad.tsx src/game/NumberPad.css
  git commit -m "feat(ui): split NumberPad into two rows for larger tap targets"
  ```
