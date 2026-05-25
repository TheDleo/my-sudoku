# Sudoku App — Design & Implementation Plan

**Goal:** A single-page sudoku web app with four difficulty tiers, manual+auto pencil marks, technique-aware hints that teach rather than reveal, and live highlighting of placements and conflicts.

**Architecture:** Static SPA. Pure-logic solver is the central piece — it drives the hint system, the generator's difficulty classifier, and conflict detection. Puzzle generation runs in a Web Worker to keep the UI responsive. All game state flows through a Zustand store with bundled undo/redo.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, Vitest, Playwright, ESLint, Prettier, Husky + lint-staged, GitHub Pages via GitHub Actions.

---

## Table of Contents

1. [Design Decisions](#1-design-decisions)
2. [Domain Model](#2-domain-model)
3. [File Structure](#3-file-structure)
4. [Phased Implementation Roadmap](#4-phased-implementation-roadmap)
5. [Testing Strategy](#5-testing-strategy)
6. [Accessibility Requirements](#6-accessibility-requirements)
7. [Deployment](#7-deployment)
8. [Open Items](#8-open-items)

---

## 1. Design Decisions

This section is the authoritative record of decisions made during the design grilling. Implementation plans for each phase should reference these.

### 1.1 Puzzles

- **Source:** Runtime generation in a Web Worker. No bundled puzzle library.
- **Difficulty tiers and required techniques** (each tier _adds_ to the previous):
  - **Easy:** naked singles, hidden singles
  - **Medium:** + naked pairs, naked triples, hidden pairs, hidden triples, pointing pairs (locked candidates)
  - **Hard:** + naked quads, hidden quads, X-wing, box/line reduction
  - **Expert:** + swordfish, XY-wing, XYZ-wing, coloring, unique rectangles
- **Pure-logic cap:** Every generated puzzle must be solvable using only the listed techniques. No trial-and-error required at any tier.
- **Difficulty classification:** A puzzle's tier equals the hardest technique its canonical solve path requires.
- **Pre-generation cache:** Worker maintains 1 puzzle per tier (4 total). Cache refills opportunistically after consumption. First load may show "generating..." until cache fills.

### 1.2 Hint System

- **4-level progressive disclosure:**
  1. Region pointer ("Try looking at row 4.")
  2. Technique name ("There's a hidden single in row 4.")
  3. Visual highlight + one-sentence explanation of _why_.
  4. App places the number (counts as one move on the undo stack).
- **Algorithm:** Always pick the _easiest applicable_ technique. Ties broken by first-found.
- **Explainer link:** Level 2 and Level 3 show a "What is this technique?" link that opens a brief explainer (one screen of text + small diagram).
- **Hints used** is tracked and shown in the win modal. Does not count as a mistake.

### 1.3 Pencil Marks (Candidates)

- **Two modes** with a global toggle in settings:
  - **Manual (default):** user owns pencil marks; app never adds.
  - **Auto:** app fills/maintains every valid candidate in every empty cell.
- **Auto-removal of invalidated candidates** (rule violations) is **automatic** in both modes — placing a digit removes that digit from the pencil marks of all cells in the same row, column, and box.
- Auto-removal is bundled into the placement on the undo stack: undo restores both the digit and the removed candidates.

### 1.4 Highlighting

- **Trigger:** cell selection and number selection are independent state.
- **When a number N is selected (via cell-with-N or pad-tap):**
  - Strong highlight on all cells containing N.
  - Soft highlight on all empty cells where N is a valid candidate ("possible placements" — toggleable in settings, default on).
  - Subtle marker on candidate-N pencil marks.
- **When a cell C is selected:**
  - Faint background tint on C's row, column, and box.
  - If C contains a digit, also activate "number selected" highlights for that digit.
- **Conflicts** (same digit twice in a unit): both offending cells highlighted red. Conflict checking is _rule violations only_ — never against the unique solution.
- **Color palette:** must work in both light and dark themes; must be color-blind safe (uses brightness + hue, not hue alone).

### 1.5 Input Model

- **Cell selection:** click/tap a cell, or use arrow keys.
- **Pencil mode toggle:** button in the action bar; while on, digit presses set candidates.
- **Shift+digit on desktop:** always sets pencil mark regardless of mode.
- **Number pad tap semantics:**
  - If a cell is selected: places the digit (or toggles pencil mark in pencil mode).
  - If no cell is selected: sets the selected number for highlighting only.
- **Deselect a cell:** click outside the grid, click the same cell again, or press Escape.
- **Erase:** Backspace/Delete clears digit or pencil marks in the selected cell. Givens cannot be erased or overwritten.
- **Cell selection preserves selected number** — clicking around with a number selected shows possible placements as the cursor moves.

### 1.6 Persistence & Undo

- **Single-slot localStorage** for in-progress game. Auto-save on every state change. Restore on load.
- **Settings** persist in a separate localStorage key from game state.
- **Undo/redo:** unbounded stack. Each user action is one step. Auto-candidate removal is bundled into the placement that caused it. Redo cleared on any new action.

### 1.7 Number Pad

- One row of 1–9 plus an erase button.
- **Each digit shows a remaining-placements counter** (placements only, not pencil marks).
- **Auto-disable** when zero remaining.

### 1.8 Meta Features

- **Timer:** counts up, optional (toggle in settings, default on), pausable. Pausing **blanks the grid** to prevent the timer being gamed.
- **Mistakes counter:** informational only, no limit. Optional via setting. Counts rule violations only.
- **No "check my work" button.** Real-time conflict highlighting + hint system are the unstuck tools.
- **No auto-placement on single-candidate cells.** The play _is_ the placement.

### 1.9 New Game & Win State

- **Landing screen:** difficulty picker with four buttons. Easy is the keyboard default (Enter on first load).
- If a saved game exists, landing shows "Resume" (primary) + "New game" (secondary).
- **First-time tooltips:** one-line affordances on the Hint and Pencil-mode buttons. Auto-dismiss after first use of each. Stored in localStorage.
- **Mid-game new-game:** confirm dialog ("You'll lose your progress").
- **Win state:** modal with time, mistakes, hints-used stats, and a "New game" button (defaults to same difficulty). Brief confetti animation; skip if `prefers-reduced-motion`.

### 1.10 Layout

- **Mobile-first.** Breakpoint at ~768px.
- **Mobile portrait:** header → square grid (full width minus padding) → number pad → action bar.
- **Mobile landscape:** switch to side-panel layout earlier.
- **Desktop:** grid centered, capped at ~600px wide; side panel on the right with timer, mistakes, hint button, undo/redo, pencil-mode toggle, new game button, number pad.

### 1.11 Settings

- **Gear icon** in header opens a modal.
- Toggles: Auto-candidates, Possible-placements highlight, Show timer, Show mistakes counter, Theme (Auto/Light/Dark).
- Global, not per-difficulty.

### 1.12 Theming

- **Light + dark.** Follows `prefers-color-scheme` by default; manual override in settings.
- Implemented as CSS custom properties under a `data-theme` attribute.

### 1.13 State Management

- **Zustand** store. One store for the game, one for settings (persists independently).
- Game store shape (sketch):
  ```ts
  type GameState = {
    puzzle: Puzzle; // immutable puzzle definition
    cells: Cell[][]; // current state
    given: boolean[][]; // which cells came from the puzzle
    selection: { cell: CellCoord | null; number: Digit | null };
    difficulty: Difficulty;
    history: { past: GameSnapshot[]; future: GameSnapshot[] };
    elapsedMs: number;
    paused: boolean;
    pausedAt: number | null;
    mistakeCount: number;
    pencilMode: boolean;
    hintLevel: 0 | 1 | 2 | 3;
    currentHint: Hint | null;
  };
  ```
- **Actions:** `placeDigit`, `eraseCell`, `togglePencilMark`, `selectCell`, `selectNumber`, `togglePencilMode`, `undo`, `redo`, `takeHint`, `dismissHint`, `newGame`, `pauseTimer`, `resumeTimer`.

---

## 2. Domain Model

### 2.1 Primitive Types

```ts
// src/types.ts
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CellCoord = { row: number; col: number }; // 0–8 each
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Cell = {
  value: Digit | null;
  pencilMarks: Set<Digit>; // serialized as number[] for storage
};

export type Board = Cell[][]; // 9x9
export type SolvedGrid = Digit[][]; // 9x9 fully solved
```

### 2.2 Puzzle

```ts
// src/types.ts (cont.)
export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  initialBoard: (Digit | null)[][]; // 9x9, null = empty
  solution: SolvedGrid; // the unique solution
};
```

### 2.3 Solver Step

A solver step describes one technique application: which technique, which cells are involved, which placements or eliminations result, and the human-readable reason.

```ts
// src/solver/types.ts
import type { CellCoord, Digit, Difficulty } from '../types';

export type TechniqueName =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'nakedPair'
  | 'nakedTriple'
  | 'hiddenPair'
  | 'hiddenTriple'
  | 'pointingPair'
  | 'nakedQuad'
  | 'hiddenQuad'
  | 'xWing'
  | 'boxLineReduction'
  | 'swordfish'
  | 'xyWing'
  | 'xyzWing'
  | 'coloring'
  | 'uniqueRectangle';

export const TECHNIQUE_DIFFICULTY: Record<TechniqueName, Difficulty> = {
  nakedSingle: 'easy',
  hiddenSingle: 'easy',
  nakedPair: 'medium',
  nakedTriple: 'medium',
  hiddenPair: 'medium',
  hiddenTriple: 'medium',
  pointingPair: 'medium',
  nakedQuad: 'hard',
  hiddenQuad: 'hard',
  xWing: 'hard',
  boxLineReduction: 'hard',
  swordfish: 'expert',
  xyWing: 'expert',
  xyzWing: 'expert',
  coloring: 'expert',
  uniqueRectangle: 'expert',
};

export type Step = {
  technique: TechniqueName;
  highlights: CellCoord[]; // cells the user should look at
  placements: { cell: CellCoord; digit: Digit }[];
  eliminations: { cell: CellCoord; digit: Digit }[];
  explanation: string; // one sentence
};

export type TechniqueDetector = (state: SolverState) => Step | null;
```

### 2.4 Solver State

The solver works on an internal state with explicit candidate sets per cell (not the user's pencil marks — the solver computes its own).

```ts
// src/solver/types.ts (cont.)
export type SolverState = {
  values: (Digit | null)[][]; // 9x9
  candidates: Set<Digit>[][]; // 9x9, valid candidates for each empty cell
};
```

### 2.5 Hint

A hint is a Step plus a current disclosure level.

```ts
// src/hints/types.ts
export type Hint = {
  step: Step;
  level: 0 | 1 | 2 | 3; // current disclosure level
};
```

### 2.6 Game Snapshot (for undo)

```ts
// src/game/types.ts
export type GameSnapshot = {
  cells: Cell[][];
  mistakeCount: number;
  // selection is NOT part of the snapshot — undo doesn't restore cursor position
};
```

### 2.7 Settings

```ts
// src/settings/types.ts
export type Theme = 'auto' | 'light' | 'dark';

export type Settings = {
  autoCandidates: boolean; // default false
  possiblePlacements: boolean; // default true
  showTimer: boolean; // default true
  showMistakes: boolean; // default true
  theme: Theme; // default 'auto'
  seenHintTooltip: boolean; // default false
  seenPencilTooltip: boolean; // default false
};
```

---

## 3. File Structure

```
my-sudoku/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── app.tsx
│   ├── types.ts                    # cross-cutting primitives
│   │
│   ├── game/
│   │   ├── Board.tsx               # the 9x9 grid
│   │   ├── Cell.tsx                # one cell (digit or pencil marks)
│   │   ├── NumberPad.tsx           # 1–9 + erase, with counters
│   │   ├── ActionBar.tsx           # pencil mode, hint, undo, redo, new game
│   │   ├── SidePanel.tsx           # desktop side panel composition
│   │   ├── store.ts                # Zustand game store
│   │   ├── reducers.ts             # pure state transitions
│   │   ├── keyboard.ts             # keyboard event handling
│   │   ├── persistence.ts          # localStorage save/load
│   │   ├── types.ts                # game-specific types
│   │   └── __tests__/
│   │
│   ├── solver/
│   │   ├── techniques/
│   │   │   ├── nakedSingle.ts
│   │   │   ├── hiddenSingle.ts
│   │   │   ├── nakedPair.ts
│   │   │   ├── nakedTriple.ts
│   │   │   ├── hiddenPair.ts
│   │   │   ├── hiddenTriple.ts
│   │   │   ├── pointingPair.ts
│   │   │   ├── nakedQuad.ts
│   │   │   ├── hiddenQuad.ts
│   │   │   ├── xWing.ts
│   │   │   ├── boxLineReduction.ts
│   │   │   ├── swordfish.ts
│   │   │   ├── xyWing.ts
│   │   │   ├── xyzWing.ts
│   │   │   ├── coloring.ts
│   │   │   ├── uniqueRectangle.ts
│   │   │   └── index.ts            # ordered technique list
│   │   ├── solve.ts                # main solver loop
│   │   ├── candidates.ts           # candidate computation helpers
│   │   ├── units.ts                # row/col/box iteration helpers
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── generator/
│   │   ├── generate.ts             # produce a puzzle of a given difficulty
│   │   ├── fullGrid.ts             # generate a complete solved grid
│   │   ├── digHoles.ts             # remove cells while preserving uniqueness
│   │   ├── difficulty.ts           # classify a puzzle by required techniques
│   │   ├── worker.ts               # web worker entry point
│   │   ├── workerClient.ts         # main-thread client for the worker
│   │   └── __tests__/
│   │
│   ├── hints/
│   │   ├── HintPanel.tsx           # the in-game hint UI
│   │   ├── TechniqueExplainer.tsx  # "what is this technique?" modal
│   │   ├── engine.ts               # pick easiest applicable technique
│   │   ├── explainers/             # per-technique explainer content
│   │   │   ├── nakedSingle.tsx
│   │   │   ├── hiddenSingle.tsx
│   │   │   └── ...
│   │   └── __tests__/
│   │
│   ├── settings/
│   │   ├── SettingsModal.tsx
│   │   ├── store.ts                # Zustand settings store (persisted)
│   │   ├── theme.ts                # apply data-theme to <html>
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── ui/                         # generic, reusable
│   │   ├── Modal.tsx
│   │   ├── Button.tsx
│   │   ├── Toggle.tsx
│   │   ├── IconButton.tsx
│   │   └── Confetti.tsx
│   │
│   ├── landing/
│   │   ├── LandingScreen.tsx       # difficulty picker / resume
│   │   └── DifficultyButton.tsx
│   │
│   ├── win/
│   │   └── WinModal.tsx
│   │
│   └── styles/
│       ├── tokens.css              # CSS custom properties (light + dark)
│       ├── reset.css
│       └── global.css
│
├── tests/
│   └── e2e/
│       └── smoke.spec.ts           # Playwright happy-path
│
├── docs/
│   └── superpowers/
│       └── plans/                  # per-phase implementation plans
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # typecheck + test + build + deploy
│
├── .eslintrc.cjs
├── .prettierrc
├── .husky/
│   └── pre-commit
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── index.html
├── PLAN.md
└── README.md
```

---

## 4. Phased Implementation Roadmap

Each phase is a unit of work that produces working, testable software. Before starting a phase, create a detailed task-by-task implementation plan in `docs/superpowers/plans/YYYY-MM-DD-<phase-name>.md` using the writing-plans skill. Each phase plan should follow TDD with bite-sized 2–5 minute steps.

### Phase 1: Project Bootstrap

**Goal:** A buildable, type-checked, lint-clean Vite + React + TS project that deploys "Hello Sudoku" to GitHub Pages.

**Deliverables:**

- `package.json` with React 18, TypeScript, Vite, Vitest, Playwright, ESLint, Prettier, Husky, lint-staged, Zustand.
- `tsconfig.json` with strict mode.
- `vite.config.ts` configured for the `/my-sudoku/` base path (GitHub Pages).
- `vitest.config.ts` and `playwright.config.ts`.
- ESLint config with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.
- Prettier with project defaults.
- Husky pre-commit hook running lint-staged (Prettier + ESLint + `tsc --noEmit`) on staged files.
- `.github/workflows/ci.yml`: typecheck → test → build → deploy to GitHub Pages on push to main.
- `src/app.tsx` renders "Sudoku" with the tokens.css palette in light + dark.
- README with one-paragraph project description and dev/test commands.

**Acceptance:** `npm run dev` serves the placeholder, `npm test` passes (zero tests), `npm run build` produces a static bundle, CI is green, app is reachable on GitHub Pages.

### Phase 2: Domain Types and Pure Helpers

**Goal:** Foundational pure code — types, board manipulation primitives, and unit iteration helpers. All TDD, no UI.

**Deliverables:**

- `src/types.ts` with `Digit`, `CellCoord`, `Difficulty`, `Cell`, `Board`, `SolvedGrid`, `Puzzle`.
- `src/solver/units.ts` — `rowsOf`, `colsOf`, `boxesOf`, `peersOf(coord)`, `unitsContaining(coord)`. All return `CellCoord[]` or `CellCoord[][]`.
- `src/solver/candidates.ts` — `computeCandidates(values): Set<Digit>[][]`, `removeCandidateFromPeers(state, coord, digit)`.
- 100% unit test coverage on these — they're load-bearing for everything else.

**Acceptance:** Every helper has tests covering normal cases, edge cases (corners, single-cell unit), and invariants (peer relationships are symmetric).

### Phase 3: Solver Core and Easy Techniques

**Goal:** A working solver that can solve all easy-tier puzzles using naked singles and hidden singles. Establishes the technique interface and the main solver loop.

**Deliverables:**

- `src/solver/types.ts` with `TechniqueName`, `TECHNIQUE_DIFFICULTY`, `Step`, `SolverState`, `TechniqueDetector`.
- `src/solver/techniques/nakedSingle.ts` and `hiddenSingle.ts` — each exports a `TechniqueDetector` that returns the first applicable step or null.
- `src/solver/techniques/index.ts` — exports `ALL_TECHNIQUES` ordered by difficulty.
- `src/solver/solve.ts` — main loop: applies techniques in order, stops when none apply, returns either a solved grid or the partial state with the list of steps taken.
- TDD: each technique has a test file with hand-crafted board states. The solver itself has end-to-end tests on a battery of easy puzzles.

**Acceptance:** Solver solves a set of curated easy puzzles. Each technique correctly identifies and skips the cases it doesn't apply to.

### Phase 4: Medium Techniques

**Goal:** Solver handles medium-tier puzzles.

**Deliverables:**

- `nakedPair.ts`, `nakedTriple.ts`, `hiddenPair.ts`, `hiddenTriple.ts`, `pointingPair.ts`.
- Each is TDD'd in isolation.
- Solver test battery extended with medium puzzles.

**Acceptance:** Curated medium puzzles solve cleanly. Solver's `Step[]` output for a medium puzzle includes at least one medium-tier technique.

### Phase 5: Hard Techniques

**Goal:** Solver handles hard-tier puzzles.

**Deliverables:**

- `nakedQuad.ts`, `hiddenQuad.ts`, `xWing.ts`, `boxLineReduction.ts`.
- TDD per technique.

**Acceptance:** Curated hard puzzles solve. Step sequence reflects expected technique usage.

### Phase 6: Expert Techniques

**Goal:** Solver handles expert-tier puzzles.

**Deliverables:**

- `swordfish.ts`, `xyWing.ts`, `xyzWing.ts`, `coloring.ts`, `uniqueRectangle.ts`.
- TDD per technique.

**Acceptance:** Curated expert puzzles solve. After this phase, the solver covers the entire pure-logic-cap technique set.

### Phase 7: Generator

**Goal:** Generate puzzles of each difficulty tier, classified by their canonical solve path.

**Deliverables:**

- `src/generator/fullGrid.ts` — produce a random valid completed sudoku grid (random fill + backtracking).
- `src/generator/digHoles.ts` — symmetric or random hole-digging while preserving uniqueness (verified by a brute-force solver or by the human solver detecting only one solution path).
- `src/generator/difficulty.ts` — classify a puzzle by running the human solver and finding the hardest technique used.
- `src/generator/generate.ts` — combines the above: `generate(difficulty): Puzzle`. Loops dig-and-classify until a puzzle matches the target tier.
- TDD: statistical tests that generated puzzles match their target difficulty most of the time. End-to-end test that every generated puzzle is solvable by the human solver using only techniques up to its tier.

**Acceptance:** `generate('expert')` returns a puzzle whose canonical solve path requires at least one expert-tier technique and no harder. Runs in a reasonable time budget (< 30s expert, < 5s easy).

### Phase 8: Web Worker for Generation

**Goal:** Generation runs off the main thread, with a per-tier pre-generation cache.

**Deliverables:**

- `src/generator/worker.ts` — listens for `{ type: 'generate', difficulty }`, posts back `{ type: 'puzzle', difficulty, puzzle }`.
- `src/generator/workerClient.ts` — main-thread API: `getPuzzle(difficulty): Promise<Puzzle>`, internally maintains a cache that auto-refills on consumption. Falls back to live generation if cache miss.
- Vite worker integration (`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`).
- Tests: client returns cached puzzle instantly when warm; falls back gracefully when cold.

**Acceptance:** From the main thread, requesting a puzzle is non-blocking. UI does not freeze during generation.

### Phase 9: Game Store and Reducers

**Goal:** Zustand store managing all game state, with pure reducers for every action and full undo/redo.

**Deliverables:**

- `src/game/types.ts` with `GameState`, `GameSnapshot`.
- `src/game/reducers.ts` — pure functions for each action (`placeDigit`, `eraseCell`, `togglePencilMark`, etc.). Each returns the new state.
- `src/game/store.ts` — Zustand store wrapping the reducers; each action commits the previous state to the undo stack.
- `src/game/persistence.ts` — serialize/deserialize game state to localStorage (`Set<Digit>` → `number[]`).
- TDD on every reducer covering normal, edge, and undo/redo cases.

**Acceptance:** Reducers handle the full action set; undo/redo round-trips work; localStorage save/load is lossless.

### Phase 10: Board and Cell Rendering

**Goal:** Render a static board from store state. No interaction yet — just visual.

**Deliverables:**

- `src/styles/tokens.css` — CSS custom properties for all colors (light + dark variants).
- `src/game/Board.tsx` — 9x9 grid with thick 3x3 borders. CSS Grid, square aspect ratio.
- `src/game/Cell.tsx` — renders a single cell: either the digit (bold for given, regular for entered) or a 3x3 grid of pencil marks. Subscribes to `state.cells[r][c]` slice only.
- Cell highlighting layers (selected, peer, possible-placement, conflict) driven by CSS classes derived from store state.
- Component tests with React Testing Library.

**Acceptance:** Given a seeded puzzle in the store, the board renders correctly in both themes.

### Phase 11: Cell Interaction

**Goal:** User can select cells and place digits.

**Deliverables:**

- Click/tap a cell → store dispatches `selectCell`.
- `src/game/keyboard.ts` — arrow keys move cursor, digits place, Shift+digit sets pencil mark, Backspace erases, Escape deselects.
- Conflict detection on placement (no-op on the digit if it violates a rule? or place + highlight? — **place + highlight**, increment mistake counter).
- Givens cannot be overwritten or erased.
- Component + integration tests.

**Acceptance:** Full keyboard and mouse interaction works. Givens are immutable. Conflicts are highlighted.

### Phase 12: Number Pad

**Goal:** Touch-friendly number entry with placement counters.

**Deliverables:**

- `src/game/NumberPad.tsx` — 1–9 buttons + erase. Each button shows a small counter of placements remaining.
- Auto-disable button at zero remaining.
- Pad-tap semantics:
  - Cell selected → place (or pencil mark in pencil mode).
  - No cell selected → set selected number for highlighting only.
- Tests cover both pad-tap modes.

**Acceptance:** Mobile-friendly digit entry; counters update reactively; auto-disable works.

### Phase 13: Pencil Marks (Manual)

**Goal:** Users can manually set/clear pencil marks; auto-removal on placement works.

**Deliverables:**

- Pencil mode toggle button in action bar.
- `togglePencilMode` action; visual indicator on the toggle and the selected cell.
- `togglePencilMark` reducer.
- Auto-removal: when `placeDigit` fires, remove that digit from pencil marks of all peer cells. Bundle into one undo step.
- Tests.

**Acceptance:** Full pencil-mark workflow including undo of placement restoring peer pencil marks.

### Phase 14: Auto-Candidates Mode

**Goal:** Setting toggle that switches pencil marks from user-owned to app-computed.

**Deliverables:**

- `settings.autoCandidates` toggle.
- When on: pencil marks reflect computed candidates for every empty cell, recomputed on every placement.
- When toggled on, populate pencil marks. When toggled off, leave current pencil marks in place (user takes over).
- Tests.

**Acceptance:** Toggling auto-candidates updates the board correctly; placements correctly update auto-maintained marks.

### Phase 15: Highlighting

**Goal:** All five highlight layers from §1.4 working together with the configured palette.

**Deliverables:**

- Derived state in the store or selectors: `getHighlights(state) → CellHighlightMap`.
- CSS classes for each highlight type, color-blind-safe (brightness + hue).
- `settings.possiblePlacements` toggle controls whether possible-placement highlights render.
- Tests verify the right cells get highlighted in each scenario.

**Acceptance:** Highlights compose visually without clashing; toggle works; dark and light palettes both pass WCAG AA for contrast.

### Phase 16: Undo / Redo UI

**Goal:** Undo and redo buttons hooked up.

**Deliverables:**

- Buttons in action bar; disabled state based on stack contents.
- Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y).
- Tests.

**Acceptance:** Undo/redo works for every action type. Disabled states are correct.

### Phase 17: Hint Engine

**Goal:** Pick the easiest applicable technique, produce a 4-level progressive hint.

**Deliverables:**

- `src/hints/engine.ts` — given a `SolverState`, run techniques in order, return the first `Step` produced (this _is_ the easiest applicable). Returns null if no technique applies.
- `src/hints/HintPanel.tsx` — renders the current hint at its current disclosure level. "Show more" advances the level. Level 4 dispatches a placement.
- `currentHint` and `hintLevel` in game store.
- Tests on engine; component tests on panel.

**Acceptance:** Hint button reveals progressively. Level 4 places the digit as an undoable action.

### Phase 18: Technique Explainers

**Goal:** "What is this technique?" link opens a per-technique explainer modal.

**Deliverables:**

- `src/hints/explainers/` — one component per technique, each ~one screen of text + a small SVG diagram.
- `src/hints/TechniqueExplainer.tsx` — modal that renders the requested technique's explainer.
- Linked from level 2 and 3 of the hint panel.

**Acceptance:** Every technique in the repertoire has a working explainer.

### Phase 19: Timer, Mistakes, Pause

**Goal:** Timer counting up, pausable; mistakes counter incrementing on rule violations.

**Deliverables:**

- Timer logic in the store (`elapsedMs`, `paused`, `pausedAt`). `useEffect` in a top-level component drives the tick (every 1s when not paused).
- Pause blanks the grid (CSS overlay).
- Mistake counter increments on rule-violating placement.
- Both visible/invisible per settings.
- Tests for timer math (especially across pause boundaries).

**Acceptance:** Timer is accurate; pause/resume works without drift; mistake counter is correct.

### Phase 20: Settings Modal

**Goal:** All settings exposed in a gear-icon modal.

**Deliverables:**

- `src/settings/store.ts` — Zustand store with localStorage persistence middleware.
- `src/settings/SettingsModal.tsx` — toggle UI for every setting.
- `src/settings/theme.ts` — applies `data-theme` on `<html>` based on setting + `prefers-color-scheme`.
- Tests.

**Acceptance:** Every setting works and persists across reloads. Theme reacts to OS in 'auto' mode.

### Phase 21: Landing Screen and New Game Flow

**Goal:** First-load and new-game UX.

**Deliverables:**

- `src/landing/LandingScreen.tsx` — difficulty picker, with "Resume" button if a saved game exists.
- Mid-game "New game" button triggers a confirm dialog.
- First-time tooltips on Hint and Pencil-mode buttons; dismiss on first use; track in settings.
- Keyboard: Enter starts the highlighted difficulty.

**Acceptance:** Fresh load shows picker; saved-game load shows resume; mid-game new game asks for confirmation.

### Phase 22: Win State

**Goal:** Detect completion, show win modal with stats.

**Deliverables:**

- Completion check after every placement (board is fully filled AND no conflicts).
- `src/win/WinModal.tsx` — displays time, mistakes, hints used, difficulty, "New game" button (defaults to same difficulty).
- Brief confetti via `src/ui/Confetti.tsx`. Skipped if `prefers-reduced-motion`.

**Acceptance:** Solving a puzzle triggers the modal; new-game button works.

### Phase 23: Accessibility Pass

**Goal:** Meet the a11y baseline from §6.

**Deliverables:**

- ARIA labels on every cell ("Row 4, column 7, contains 5, given" / "empty").
- Live region announces hints and conflict highlights.
- Focus ring visible on every interactive element.
- WCAG AA contrast verified for both themes.
- `prefers-reduced-motion` respected.

**Acceptance:** Manual screen-reader smoke test passes; automated a11y checks (e.g., axe via Playwright) report no critical issues.

### Phase 24: Responsive Layout Polish

**Goal:** Mobile-first layout works on phones (portrait + landscape) and desktops.

**Deliverables:**

- Mobile portrait: header → grid → number pad → action bar.
- Mobile landscape: side-panel-style layout.
- Desktop ≥ 768px: side panel right, grid capped at ~600px.
- Test on real device sizes (Playwright viewport tests).

**Acceptance:** Layout works at 320px, 414px (portrait), 812px (landscape), 1024px, 1920px.

### Phase 25: E2E Smoke Test and Final QA

**Goal:** Smoke test covering the happy path; manual QA pass; ship.

**Deliverables:**

- `tests/e2e/smoke.spec.ts` — start expert game, place digits, take a hint, undo, solve, see win modal.
- Manual QA checklist covering every feature in §1.
- Bundle size sanity check.

**Acceptance:** Smoke test green in CI; manual QA clean.

---

## 5. Testing Strategy

### 5.1 Coverage Targets

- **Solver techniques:** 100% — both positive (technique applies) and negative (lookalike cases) tests.
- **Solver integration:** Battery of curated puzzles per tier, verifying full solve and expected technique sequence.
- **Generator:** Statistical tests — generate N puzzles per tier, assert ≥ 90% land in the target tier; assert 100% solvable by the human solver.
- **Game reducers:** Every reducer covered with normal + edge cases + undo round-trip.
- **UI components:** Light component tests for critical interactions only. Avoid testing styling.
- **E2E:** One Playwright smoke test.

### 5.2 TDD Discipline

Every solver technique and every reducer is written test-first. Workflow:

1. Write the failing test (with a hand-crafted board state and expected step/state).
2. Run it; confirm failure.
3. Implement the minimal code to pass.
4. Run; confirm pass.
5. Commit.

### 5.3 Test Data

A test-fixtures directory contains:

- Hand-crafted board states per technique (one for each positive and negative case).
- Curated full puzzles per tier with their expected technique sequences.
- These are versioned in the repo as part of the testing canon.

---

## 6. Accessibility Requirements

- **Screen reader (basic):** ARIA labels on cells reflecting position + content + given-ness. Live region announces hint text, conflict events, and timer/mistakes when they change.
- **Keyboard:** Full game playable without mouse. Arrows move cursor, digits place, Shift+digit pencil-mark, Backspace erase, Escape deselect, Tab/Shift+Tab through interactive UI.
- **Visual:**
  - WCAG AA contrast (4.5:1 text, 3:1 UI) in both themes.
  - No information conveyed by color alone (conflicts use red + a border/icon; givens use weight + color).
  - Focus rings on every interactive element.
- **Motion:** Respect `prefers-reduced-motion` — kill confetti, page transitions, and non-essential animation.
- **Color-blind safe:** Highlight palette uses brightness + hue together. Verify with simulators (deuteranopia, protanopia, tritanopia).

---

## 7. Deployment

- **Host:** GitHub Pages, deployed from `gh-pages` branch via GitHub Actions.
- **Vite base path:** `/my-sudoku/` configured in `vite.config.ts`.
- **CI workflow:**
  1. Install (`npm ci`).
  2. Typecheck (`tsc --noEmit`).
  3. Lint (`eslint .`).
  4. Test (`vitest run`).
  5. Build (`vite build`).
  6. Deploy to `gh-pages` on push to `main`.
- **PR runs:** Steps 1–5 only (no deploy).
- **Branch protection:** require CI green before merge to `main`.

---

## 8. Open Items

These are decisions deliberately deferred — revisit when ready:

- **Generation time on expert tier:** Cap is unknown in practice. Phase 8 may need a timeout + fallback (e.g., "if 30s elapse, reduce difficulty by one tier"). Defer to Phase 7 when we measure real performance.
- **Box-symmetric vs random hole digging:** Symmetric is prettier; random is slightly easier. Defer to Phase 7.
- **Mobile haptics on placement:** Skipped for v1. Revisit post-ship if polish bandwidth allows.
- **Sound effects:** Skipped for v1.
- **Online/PWA:** Out of scope; sudoku app is fully client-side already but does not register a service worker. Could add `vite-plugin-pwa` later for true offline.
- **Daily puzzle feature:** Out of scope.
- **Statistics history:** Out of scope. Win modal shows the current puzzle's stats only.
