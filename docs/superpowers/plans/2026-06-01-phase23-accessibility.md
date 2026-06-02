# Phase 23 Accessibility Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ARIA labels on every cell, a live-region hint announcer, visible focus rings on all interactive elements, and proper dialog roles on WinModal.

**Architecture:** Four independent layers — cell semantics (Cell.tsx), a self-contained Announcer component that reads from the Zustand store, global CSS for focus rings, and targeted modal fixes. Each task can be reviewed and committed independently.

**Tech Stack:** React 18, TypeScript, Zustand, CSS custom properties, Vitest + Testing Library.

---

### Task 1: Cell ARIA labels

**Files:**

- Modify: `src/game/Cell.tsx`
- Modify: `src/game/Cell.test.tsx`

- [ ] **Step 1: Write the failing tests**

  Open `src/game/Cell.test.tsx`. Add a new `describe('cellAriaLabel', ...)` block after the existing imports and before the `describe('Cell', ...)` block. The function `cellAriaLabel` doesn't exist yet, so these tests will fail to compile until Step 3.

  ```ts
  import { cellAriaLabel } from './Cell';

  describe('cellAriaLabel', () => {
    it('labels a given digit', () => {
      const cell = { value: 5 as Digit, pencilMarks: new Set<Digit>() };
      expect(cellAriaLabel(2, 6, cell, true)).toBe('Row 3, column 7, given 5');
    });

    it('labels a user-placed digit', () => {
      const cell = { value: 5 as Digit, pencilMarks: new Set<Digit>() };
      expect(cellAriaLabel(2, 6, cell, false)).toBe('Row 3, column 7, your 5');
    });

    it('labels pencil marks sorted', () => {
      const cell = { value: null, pencilMarks: new Set([7, 1, 4] as Digit[]) };
      expect(cellAriaLabel(2, 6, cell, false)).toBe('Row 3, column 7, candidates 1 4 7');
    });

    it('labels an empty cell', () => {
      const cell = { value: null, pencilMarks: new Set<Digit>() };
      expect(cellAriaLabel(2, 6, cell, false)).toBe('Row 3, column 7, empty');
    });
  });
  ```

  The import line goes at the top alongside the existing `Cell` import:

  ```ts
  import { Cell, cellAriaLabel } from './Cell';
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/game/Cell.test.tsx
  ```

  Expected: compile error — `cellAriaLabel` is not exported from `./Cell`.

- [ ] **Step 3: Add `cellAriaLabel` and update the Cell component**

  Replace the entire contents of `src/game/Cell.tsx` with:

  ```tsx
  import './Cell.css';
  import type { Digit } from '../types';
  import type { CellHighlight } from './highlights';
  import { useGameStore } from './store';

  type Props = { row: number; col: number; highlight: CellHighlight };

  const PENCIL_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  export function cellAriaLabel(
    row: number,
    col: number,
    cell: { value: Digit | null; pencilMarks: Set<Digit> },
    isGiven: boolean,
  ): string {
    const prefix = `Row ${row + 1}, column ${col + 1}`;
    if (cell.value !== null) {
      return `${prefix}, ${isGiven ? 'given' : 'your'} ${cell.value}`;
    }
    if (cell.pencilMarks.size > 0) {
      const marks = [...cell.pencilMarks].sort((a, b) => a - b).join(' ');
      return `${prefix}, candidates ${marks}`;
    }
    return `${prefix}, empty`;
  }

  export function Cell({ row, col, highlight }: Props) {
    const cell = useGameStore((s) => s.cells[row]![col]!);
    const isGiven = useGameStore((s) => s.given[row]![col]!);
    const selectedNumber = useGameStore((s) => s.selection.number);

    const highlightClass = highlight !== null ? `cell--${highlight}` : '';

    return (
      <div
        className={`cell ${highlightClass}`.trim()}
        data-row={row}
        data-col={col}
        role="gridcell"
        aria-label={cellAriaLabel(row, col, cell, isGiven)}
      >
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

  Note: `cellAriaLabel` uses an inline structural type for `cell` rather than importing the `Cell` type — this avoids a name collision with the `Cell` component in the same file.

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npx vitest run src/game/Cell.test.tsx
  ```

  Expected: all tests pass, including the 4 new `cellAriaLabel` tests.

- [ ] **Step 5: Run the full suite for regressions**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/game/Cell.tsx src/game/Cell.test.tsx
  git commit -m "feat(a11y): add role=gridcell and aria-label to each cell"
  ```

---

### Task 2: Live region announcer

**Files:**

- Create: `src/game/Announcer.tsx`
- Create: `src/game/Announcer.test.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `.sr-only` to global CSS**

  Open `src/styles/global.css`. Add this block at the end of the file:

  ```css
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```

- [ ] **Step 2: Write the failing tests**

  Create `src/game/Announcer.test.tsx`:

  ```tsx
  import { describe, it, expect, beforeEach } from 'vitest';
  import { render } from '@testing-library/react';
  import { Announcer } from './Announcer';
  import { useGameStore } from './store';
  import { initialEmptyState } from './reducers';
  import type { Digit } from '../types';

  const mockHint = {
    technique: 'nakedSingle' as const,
    highlights: [],
    placements: [{ cell: { row: 0, col: 0 }, digit: 1 as Digit }],
    eliminations: [],
    explanation: 'test',
  };

  describe('Announcer', () => {
    beforeEach(() => {
      useGameStore.setState({ ...initialEmptyState });
    });

    it('renders a polite aria-live region', () => {
      const { container } = render(<Announcer />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.getAttribute('aria-live')).toBe('polite');
      expect(el.getAttribute('aria-atomic')).toBe('true');
    });

    it('is empty when no hint is active', () => {
      const { container } = render(<Announcer />);
      expect(container.firstElementChild?.textContent).toBe('');
    });

    it('announces technique name when hintLevel is 2', () => {
      useGameStore.setState({ ...initialEmptyState, currentHint: mockHint, hintLevel: 2 });
      const { container } = render(<Announcer />);
      expect(container.firstElementChild?.textContent).toContain('Naked Single');
    });

    it('is empty when hintLevel is 1 even with a hint', () => {
      useGameStore.setState({ ...initialEmptyState, currentHint: mockHint, hintLevel: 1 });
      const { container } = render(<Announcer />);
      expect(container.firstElementChild?.textContent).toBe('');
    });

    it('is empty when hintLevel is 3 (user already saw technique name)', () => {
      useGameStore.setState({ ...initialEmptyState, currentHint: mockHint, hintLevel: 3 });
      const { container } = render(<Announcer />);
      expect(container.firstElementChild?.textContent).toBe('');
    });
  });
  ```

- [ ] **Step 3: Run tests to confirm they fail**

  ```bash
  npx vitest run src/game/Announcer.test.tsx
  ```

  Expected: compile error — `Announcer` does not exist.

- [ ] **Step 4: Create `src/game/Announcer.tsx`**

  ```tsx
  import { useGameStore } from './store';
  import { TECHNIQUE_LABELS } from '../hints/engine';

  export function Announcer() {
    const hintLevel = useGameStore((s) => s.hintLevel);
    const currentHint = useGameStore((s) => s.currentHint);

    let message = '';
    if (hintLevel === 2 && currentHint !== null) {
      message = `Hint: ${TECHNIQUE_LABELS[currentHint.technique]}. Press Show more for details.`;
    }

    return (
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    );
  }
  ```

- [ ] **Step 5: Run tests to confirm they pass**

  ```bash
  npx vitest run src/game/Announcer.test.tsx
  ```

  Expected: all 5 tests pass.

- [ ] **Step 6: Add `<Announcer />` to App.tsx**

  Open `src/App.tsx`. Add the import:

  ```ts
  import { Announcer } from './game/Announcer';
  ```

  Add `<Announcer />` as the first child inside `<main>`:

  ```tsx
  return (
    <main onClick={handleMainClick}>
      <Announcer />
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
  ```

- [ ] **Step 7: Run the full suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/game/Announcer.tsx src/game/Announcer.test.tsx src/styles/global.css src/App.tsx
  git commit -m "feat(a11y): add sr-only live region that announces hint technique at level 2"
  ```

---

### Task 3: Global focus ring

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/hints/TechniqueExplainer.css`
- Modify: `src/settings/SettingsModal.css`

No new tests needed — focus rings are CSS-only. Verified visually in Task 5.

- [ ] **Step 1: Add `:focus-visible` rule to global CSS**

  Open `src/styles/global.css`. Add this block after the `.sr-only` block you added in Task 2:

  ```css
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  ```

- [ ] **Step 2: Remove `outline: none` from TechniqueExplainer**

  Open `src/hints/TechniqueExplainer.css`. Find and remove the `outline: none;` line from `.technique-explainer__card`:

  Before:

  ```css
  .technique-explainer__card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    min-width: 280px;
    max-width: 360px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    outline: none;
  }
  ```

  After:

  ```css
  .technique-explainer__card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    min-width: 280px;
    max-width: 360px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  ```

- [ ] **Step 3: Remove `outline: none` from SettingsModal**

  Open `src/settings/SettingsModal.css`. Find and remove the `outline: none;` line from `.settings-modal__card` (same pattern as Step 2). The exact surrounding CSS will differ — just remove the `outline: none` line.

- [ ] **Step 4: Run full suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass (CSS-only changes cannot break unit tests).

- [ ] **Step 5: Commit**

  ```bash
  git add src/styles/global.css src/hints/TechniqueExplainer.css src/settings/SettingsModal.css
  git commit -m "feat(a11y): add global focus-visible ring; remove outline:none suppression"
  ```

---

### Task 4: Modal focus management + WinModal dialog role

**Files:**

- Modify: `src/hints/TechniqueExplainer.tsx`
- Modify: `src/settings/SettingsModal.tsx`
- Modify: `src/game/WinModal.tsx`
- Modify: `src/game/WinModal.test.tsx`

- [ ] **Step 1: Write the failing test for WinModal dialog role**

  Open `src/game/WinModal.test.tsx`. Add this test to the existing `describe('WinModal', ...)` block:

  ```ts
  it('win card has dialog role and aria-labelledby pointing to the heading', () => {
    render(<WinModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const heading = document.getElementById(labelId!);
    expect(heading?.textContent).toBe('Puzzle Complete!');
  });
  ```

- [ ] **Step 2: Run tests to confirm it fails**

  ```bash
  npx vitest run src/game/WinModal.test.tsx
  ```

  Expected: the new dialog test fails — no element with `role="dialog"` in WinModal yet.

- [ ] **Step 3: Update `TechniqueExplainer.tsx` — focus close button instead of card**

  Replace the entire file:

  ```tsx
  import './TechniqueExplainer.css';
  import { useEffect, useRef } from 'react';
  import type { TechniqueName } from '../solver/types';
  import { EXPLAINERS } from './explainers/index';

  type Props = {
    technique: TechniqueName | null;
    onClose: () => void;
  };

  export function TechniqueExplainer({ technique, onClose }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (!technique) return;
      closeRef.current?.focus();
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }, [technique, onClose]);

    if (!technique) return null;

    const { title, summary, Diagram } = EXPLAINERS[technique];

    return (
      <div className="technique-explainer__backdrop" onClick={onClose}>
        <div
          className="technique-explainer__card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="technique-explainer-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="technique-explainer__header">
            <h2 id="technique-explainer-title" className="technique-explainer__title">
              {title}
            </h2>
            <button
              className="technique-explainer__close"
              aria-label="Close"
              onClick={onClose}
              ref={closeRef}
            >
              ×
            </button>
          </div>
          <div className="technique-explainer__diagram">
            <Diagram />
          </div>
          <p className="technique-explainer__summary">{summary}</p>
        </div>
      </div>
    );
  }
  ```

  Changes from original: `cardRef` → `closeRef` (moved to close button), removed `tabIndex={-1}` from card div, added `ref={closeRef}` to button.

- [ ] **Step 4: Update `SettingsModal.tsx` — focus close button instead of card**

  Replace `src/settings/SettingsModal.tsx` with:

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
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (!isOpen) return;
      closeRef.current?.focus();
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="settings-modal__header">
            <h2 className="settings-modal__title">Settings</h2>
            <button
              className="settings-modal__close"
              aria-label="Close"
              onClick={onClose}
              ref={closeRef}
            >
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

  Changes: `cardRef` → `closeRef` (moved to close button), removed `tabIndex={-1}` from card div, added `ref={closeRef}` to close button.

- [ ] **Step 5: Update `WinModal.tsx` — add dialog role and focus New Game button**

  Replace `src/game/WinModal.tsx` with:

  ```tsx
  import { useState, useEffect, useRef } from 'react';
  import './WinModal.css';
  import type { Difficulty } from '../types';
  import { formatTime } from './helpers';
  import { useGameStore } from './store';
  import { Confetti } from './Confetti';

  const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
  };

  export function WinModal() {
    const mistakes = useGameStore((s) => s.mistakes);
    const elapsedMs = useGameStore((s) => s.elapsedMs);
    const difficulty = useGameStore((s) => s.puzzle.difficulty);
    const hintsUsed = useGameStore((s) => s.hintsUsed);
    const [showConfetti, setShowConfetti] = useState(true);
    const newGameRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      newGameRef.current?.focus();
    }, []);

    const handleNewGame = () => useGameStore.getState().setScreen('landing');
    const handleClose = () => useGameStore.getState().dismissWin();

    return (
      <div className="win-backdrop" onClick={handleClose}>
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
        <div
          className="win-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="win-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="win-modal-title" className="win-title">
            Puzzle Complete!
          </h2>
          <p className="win-difficulty">{DIFFICULTY_LABELS[difficulty]}</p>
          <p className="win-stat">Mistakes: {mistakes}</p>
          <p className="win-stat">Hints: {hintsUsed}</p>
          <p className="win-stat">Time: {formatTime(elapsedMs)}</p>
          <div className="win-actions">
            <button className="win-btn win-btn--new-game" onClick={handleNewGame} ref={newGameRef}>
              New Game
            </button>
            <button className="win-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 6: Run WinModal tests to confirm the new test passes**

  ```bash
  npx vitest run src/game/WinModal.test.tsx
  ```

  Expected: all tests pass, including the new dialog role test.

- [ ] **Step 7: Run the full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/hints/TechniqueExplainer.tsx src/settings/SettingsModal.tsx src/game/WinModal.tsx src/game/WinModal.test.tsx
  git commit -m "feat(a11y): focus close/action buttons on modal open; add WinModal dialog role"
  ```

---

### Task 5: Typecheck and visual verification

- [ ] **Step 1: Typecheck**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 2: Start the dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 3: Verify focus rings**

  Open `http://localhost:5173`. Press Tab to navigate. Confirm:
  - Every button (Hint, Undo, Redo, number pad digits, gear icon) shows a blue outline on focus.
  - The board grid shows a blue outline when focused.
  - Mouse clicks do NOT show the focus ring (`:focus-visible` only fires on keyboard).

- [ ] **Step 4: Verify cell labels**

  Open browser DevTools. Inspect a cell element. Confirm it has `role="gridcell"` and `aria-label` like `"Row 1, column 1, empty"` or `"Row 1, column 1, given 5"`.

- [ ] **Step 5: Verify modal focus**
  - Click the gear icon to open Settings — confirm the Close button receives focus (it will have the blue outline).
  - Press Escape — confirm the modal closes.
  - Solve a puzzle or force `won: true` via DevTools to open WinModal — confirm the New Game button receives focus.

- [ ] **Step 6: Stop the server and run final checks**

  ```bash
  npx tsc --noEmit && npx vitest run
  ```

  Expected: no errors, all tests pass.
