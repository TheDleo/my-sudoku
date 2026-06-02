# Confetti + Hints Used Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `hintsUsed` counter to the game (shown in the win modal) and a canvas-based corner-cannon confetti animation that fires when the puzzle is solved.

**Architecture:** `hintsUsed` flows through the same layers as `mistakes` — GameState type → reducer → persistence → store subscriber. `Confetti.tsx` is a self-contained canvas component that fires once, calls `onDone` when finished, and is rendered by WinModal behind a local `showConfetti` flag. `prefers-reduced-motion` skips the canvas entirely.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest + Testing Library, HTML Canvas API.

---

### Task 1: Add `hintsUsed` to game state and reducers

**Files:**

- Modify: `src/game/types.ts`
- Modify: `src/game/reducers.ts`
- Modify: `src/game/reducers.test.ts`

- [ ] **Step 1: Write the failing tests**

  Open `src/game/reducers.test.ts`. Add these three tests inside a new `describe('hintsUsed', ...)` block at the end of the file (before the closing of the outermost describe, or as a new top-level describe — follow existing file convention):

  ```ts
  describe('hintsUsed', () => {
    it('initialEmptyState starts at 0', () => {
      expect(initialEmptyState.hintsUsed).toBe(0);
    });

    it('requestHint increments hintsUsed by 1', () => {
      const cells = cloneCellsForTest(initialEmptyState.cells);
      for (let c = 0; c < 8; c++) {
        cells[0]![c]!.value = (c + 1) as Digit;
      }
      const state = { ...initialEmptyState, cells };
      const next = requestHint(state);
      expect(next.hintsUsed).toBe(1);
    });

    it('requestHint increments even when no hint is available', () => {
      const next = requestHint(initialEmptyState);
      expect(next.hintsUsed).toBe(1);
    });

    it('requestHint accumulates across multiple calls', () => {
      let s = requestHint(initialEmptyState);
      s = requestHint(s);
      s = requestHint(s);
      expect(s.hintsUsed).toBe(3);
    });

    it('loadPuzzle resets hintsUsed to 0', () => {
      const withHints = { ...initialEmptyState, hintsUsed: 5 };
      const next = loadPuzzle(withHints, makePuzzle());
      expect(next.hintsUsed).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/game/reducers.test.ts
  ```

  Expected: 5 new failures mentioning `hintsUsed` is `undefined`.

- [ ] **Step 3: Add `hintsUsed` to `GameState` type**

  In `src/game/types.ts`, add `hintsUsed: number` after `elapsedMs`:

  ```ts
  export type GameState = {
    puzzle: Puzzle;
    cells: Cell[][];
    given: boolean[][];
    selection: { cell: CellCoord | null; number: Digit | null };
    pencilMode: boolean;
    mistakes: number;
    elapsedMs: number;
    hintsUsed: number;
    history: { past: GameSnapshot[]; future: GameSnapshot[] };
    currentHint: Step | null;
    hintLevel: 1 | 2 | 3 | 4;
    screen: 'landing' | 'game';
    won: boolean;
    colorMarks: ('A' | 'B' | null)[][];
    colorMode: 'A' | 'B' | null;
  };
  ```

- [ ] **Step 4: Update `initialEmptyState`, `loadPuzzle`, and `requestHint` in reducers**

  In `src/game/reducers.ts`:

  Add `hintsUsed: 0` to `initialEmptyState` (after `elapsedMs: 0`):

  ```ts
  export const initialEmptyState: GameState = {
    puzzle: SENTINEL_PUZZLE,
    cells: empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() })),
    given: empty9x9<boolean>(false),
    selection: { cell: null, number: null },
    pencilMode: false,
    mistakes: 0,
    elapsedMs: 0,
    hintsUsed: 0,
    history: { past: [], future: [] },
    currentHint: null,
    hintLevel: 1,
    screen: 'landing',
    won: false,
    colorMarks: empty9x9<'A' | 'B' | null>(null),
    colorMode: null,
  };
  ```

  Add `hintsUsed: 0` to the return value of `loadPuzzle` (after `elapsedMs: 0`):

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
      hintsUsed: 0,
      history: { past: [], future: [] },
      currentHint: null,
      hintLevel: 1,
      screen: state.screen,
      won: false,
      colorMarks: empty9x9<'A' | 'B' | null>(null),
      colorMode: null,
    };
  }
  ```

  Update `requestHint` to increment `hintsUsed`:

  ```ts
  export function requestHint(state: GameState): GameState {
    const hint = getHint(state.cells);
    return { ...state, currentHint: hint, hintLevel: 1, hintsUsed: state.hintsUsed + 1 };
  }
  ```

- [ ] **Step 5: Run tests to confirm they pass**

  ```bash
  npx vitest run src/game/reducers.test.ts
  ```

  Expected: all tests pass, including the 5 new ones.

- [ ] **Step 6: Run the full test suite to check for regressions**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass. If TypeScript errors appear about missing `hintsUsed`, they will be caught here — fix any spread/object literal in other files that constructs a `GameState` directly without `hintsUsed`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/game/types.ts src/game/reducers.ts src/game/reducers.test.ts
  git commit -m "feat(game): track hintsUsed counter in game state"
  ```

---

### Task 2: Persist `hintsUsed`

**Files:**

- Modify: `src/game/persistence.ts`
- Modify: `src/game/persistence.test.ts`

- [ ] **Step 1: Write the failing tests**

  Open `src/game/persistence.test.ts`. Add these two tests — one inside the existing `describe('serialize / deserialize round-trip', ...)` block, one new standalone test:

  ```ts
  // Inside 'serialize / deserialize round-trip' describe:
  it('round-trips hintsUsed through serialize → deserialize', () => {
    const state = { ...loadPuzzle(initialEmptyState, makePuzzle()), hintsUsed: 7 };
    const restored = deserialize(serialize(state));
    expect(restored).not.toBeNull();
    expect(restored!.hintsUsed).toBe(7);
  });

  // New standalone describe block:
  describe('hintsUsed fallback', () => {
    it('deserializes legacy saves missing hintsUsed as 0', () => {
      const state = loadPuzzle(initialEmptyState, makePuzzle());
      const raw = JSON.parse(serialize(state)) as Record<string, unknown>;
      delete raw['hintsUsed'];
      const restored = deserialize(JSON.stringify(raw));
      expect(restored).not.toBeNull();
      expect(restored!.hintsUsed).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/game/persistence.test.ts
  ```

  Expected: 2 new failures.

- [ ] **Step 3: Update `persistence.ts`**

  Add `hintsUsed: number` to `SerializedState`:

  ```ts
  type SerializedState = {
    puzzle: Puzzle;
    cells: SerializedCell[][];
    given: boolean[][];
    pencilMode: boolean;
    mistakes: number;
    elapsedMs: number;
    hintsUsed?: number;
    colorMarks?: ('A' | 'B' | null)[][];
  };
  ```

  Add `hintsUsed: state.hintsUsed` to the `serialize` function's payload (after `elapsedMs`):

  ```ts
  const payload: SerializedState = {
    puzzle: state.puzzle,
    cells,
    given: state.given,
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    colorMarks: state.colorMarks,
  };
  ```

  Add `hintsUsed: parsed.hintsUsed ?? 0` to the return value of `deserialize` (after `elapsedMs`):

  ```ts
  return {
    puzzle: parsed.puzzle,
    cells,
    given: parsed.given,
    selection: { cell: null, number: null },
    pencilMode: parsed.pencilMode,
    mistakes: parsed.mistakes,
    elapsedMs: parsed.elapsedMs,
    hintsUsed: parsed.hintsUsed ?? 0,
    history: { past: [], future: [] },
    currentHint: null,
    hintLevel: 1,
    screen: 'landing' as const,
    won: false,
    colorMarks: parsed.colorMarks ?? empty9x9<'A' | 'B' | null>(null),
    colorMode: null,
  };
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npx vitest run src/game/persistence.test.ts
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/game/persistence.ts src/game/persistence.test.ts
  git commit -m "feat(game): persist hintsUsed in localStorage"
  ```

---

### Task 3: Wire `hintsUsed` into the store auto-save subscriber

**Files:**

- Modify: `src/game/store.ts`

No new tests needed — the persistence tests already cover round-tripping; the store subscriber is integration-level behavior.

- [ ] **Step 1: Update the equality check in the auto-save subscriber**

  In `src/game/store.ts`, the subscriber at the bottom checks whether any persisted field changed before saving. Add `hintsUsed` to that check:

  ```ts
  useGameStore.subscribe((state: GameStore, prev: GameStore) => {
    if (
      state.cells === prev.cells &&
      state.pencilMode === prev.pencilMode &&
      state.mistakes === prev.mistakes &&
      state.elapsedMs === prev.elapsedMs &&
      state.hintsUsed === prev.hintsUsed &&
      state.puzzle === prev.puzzle &&
      state.colorMarks === prev.colorMarks
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
      hintsUsed: state.hintsUsed,
      history: state.history,
      currentHint: null,
      hintLevel: 1,
      screen: state.screen,
      won: false,
      colorMarks: state.colorMarks,
      colorMode: null,
    };
    persistence.save(snapshot);
  });
  ```

- [ ] **Step 2: Run full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/game/store.ts
  git commit -m "feat(game): include hintsUsed in auto-save subscriber"
  ```

---

### Task 4: Create `Confetti.tsx`

**Files:**

- Create: `src/game/Confetti.tsx`

No unit tests for canvas animation (covered by manual QA / e2e). The component is tested visually via the app.

- [ ] **Step 1: Create `src/game/Confetti.tsx`**

  ```tsx
  import { useEffect, useRef } from 'react';

  interface ConfettiProps {
    onDone: () => void;
  }

  const COLORS = ['#ff4f4f', '#ffcc00', '#4caf50', '#2196f3', '#e91e63', '#ff9800'];
  const PARTICLES_PER_CANNON = 60;
  const DURATION_MS = 2500;
  const FADE_MS = 400;

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotSpeed: number;
    color: string;
    isRect: boolean;
    alpha: number;
  }

  function makeParticles(w: number): Particle[] {
    const particles: Particle[] = [];

    // Left cannon: fires from (10% W, 0) downward-right, angles 20°–80°
    for (let i = 0; i < PARTICLES_PER_CANNON; i++) {
      const angle = Math.PI / 9 + Math.random() * ((Math.PI * 5) / 18); // 20° to 80°
      const speed = 5 + Math.random() * 6;
      particles.push({
        x: w * 0.1,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        isRect: Math.random() > 0.4,
        alpha: 1,
      });
    }

    // Right cannon: fires from (90% W, 0) downward-left, angles 100°–160°
    for (let i = 0; i < PARTICLES_PER_CANNON; i++) {
      const angle = (Math.PI * 5) / 9 + Math.random() * ((Math.PI * 5) / 18); // 100° to 160°
      const speed = 5 + Math.random() * 6;
      particles.push({
        x: w * 0.9,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        isRect: Math.random() > 0.4,
        alpha: 1,
      });
    }

    return particles;
  }

  export function Confetti({ onDone }: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        onDone();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = makeParticles(window.innerWidth);
      const startTime = performance.now();
      let rafId = 0;

      function draw(now: number) {
        const elapsed = now - startTime;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
          p.vy += 0.15; // gravity
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;

          if (elapsed > DURATION_MS) {
            p.alpha = Math.max(0, 1 - (elapsed - DURATION_MS) / FADE_MS);
          }

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          if (p.isRect) {
            ctx.fillRect(-4, -2, 8, 4);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        if (elapsed < DURATION_MS + FADE_MS) {
          rafId = requestAnimationFrame(draw);
        } else {
          onDone();
        }
      }

      rafId = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(rafId);
    }, [onDone]);

    return (
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}
      />
    );
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/game/Confetti.tsx
  git commit -m "feat(game): add Confetti component with corner-cannon animation"
  ```

---

### Task 5: Update WinModal — add Hints stat and render Confetti

**Files:**

- Modify: `src/game/WinModal.tsx`
- Modify: `src/game/WinModal.test.tsx`

- [ ] **Step 1: Write the failing test**

  Open `src/game/WinModal.test.tsx`. In the `beforeEach`, add `hintsUsed: 3` to the `setState` call:

  ```ts
  beforeEach(() => {
    vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: true,
      puzzle: makePuzzle(),
      mistakes: 2,
      elapsedMs: 0,
      hintsUsed: 3,
    });
  });
  ```

  Then add this test:

  ```ts
  it('renders the hints used count', () => {
    render(<WinModal />);
    expect(screen.getByText('Hints: 3')).toBeInTheDocument();
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  npx vitest run src/game/WinModal.test.tsx
  ```

  Expected: the new "Hints: 3" test fails.

- [ ] **Step 3: Update `WinModal.tsx`**

  Replace the entire file with:

  ```tsx
  import { useState } from 'react';
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

    const handleNewGame = () => useGameStore.getState().setScreen('landing');
    const handleClose = () => useGameStore.getState().dismissWin();

    return (
      <div className="win-backdrop" onClick={handleClose}>
        {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
        <div className="win-card" onClick={(e) => e.stopPropagation()}>
          <h2 className="win-title">Puzzle Complete!</h2>
          <p className="win-difficulty">{DIFFICULTY_LABELS[difficulty]}</p>
          <p className="win-stat">Mistakes: {mistakes}</p>
          <p className="win-stat">Hints: {hintsUsed}</p>
          <p className="win-stat">Time: {formatTime(elapsedMs)}</p>
          <div className="win-actions">
            <button className="win-btn win-btn--new-game" onClick={handleNewGame}>
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

- [ ] **Step 4: Run the WinModal tests**

  ```bash
  npx vitest run src/game/WinModal.test.tsx
  ```

  Expected: all tests pass, including the new "Hints: 3" test.

  Note: Confetti uses `requestAnimationFrame` and `HTMLCanvasElement.getContext`. These are not available in jsdom. If any test fails due to canvas errors, add this mock at the top of `WinModal.test.tsx` (after the imports):

  ```ts
  // jsdom has no canvas implementation — stub getContext to avoid errors
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
  ```

  With `getContext` returning `null`, the `Confetti` effect checks `if (!ctx) return` and exits cleanly without calling `onDone`. The `showConfetti` state stays `true`, but that doesn't affect any assertions.

- [ ] **Step 5: Run the full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/game/WinModal.tsx src/game/WinModal.test.tsx
  git commit -m "feat(game): show hintsUsed in WinModal and fire confetti on win"
  ```

---

### Task 6: Visual verification

- [ ] **Step 1: Start the dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: Play through to a win state**

  Open `http://localhost:5173`. Start an Easy game. Fill in all cells correctly. Confirm:
  - Confetti fires from top-left and top-right corners, arcing down.
  - Animation lasts ~3 seconds then fades.
  - Win modal shows Mistakes, Hints, and Time stats.
  - The Hints count reflects how many times you pressed the Hint button.

- [ ] **Step 3: Verify `prefers-reduced-motion`**

  In browser DevTools → Rendering → Emulate CSS media feature → set `prefers-reduced-motion: reduce`. Win the game again. Confirm no canvas/animation appears — modal shows immediately with no confetti.

- [ ] **Step 4: Stop the server and run final checks**

  ```bash
  npx tsc --noEmit && npx vitest run
  ```

  Expected: no errors, all tests pass.
