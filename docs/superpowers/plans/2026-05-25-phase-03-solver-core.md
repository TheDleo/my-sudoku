# Phase 3: Solver Core and Easy Techniques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working logic-only solver that solves easy-tier sudoku puzzles using naked singles and hidden singles. This phase establishes the technique-detector interface, the main solver loop, and a small battery of integration tests on curated easy puzzles.

**Architecture:** A technique detector is a pure function `(state: SolverState) => Step | null`. Each detector inspects the current candidates grid and returns the **first** technique application it finds, or `null` if it doesn't apply. The solver loop tries detectors in difficulty order (easiest first), applies the returned step (placement + auto-elimination from peers), then restarts the loop. It stops when no detector returns a step. Easy puzzles solve when only `nakedSingle` and `hiddenSingle` are in the technique list.

**Tech Stack:** No new dependencies. Uses the Phase 2 primitives from `src/types.ts`, `src/solver/units.ts`, `src/solver/candidates.ts`.

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design notes — locked in before tasks:**

- **`SolverState`** is `{ values: (Digit | null)[][]; candidates: Set<Digit>[][] }`. Both are 9×9. Cells with a value have an empty candidate set.
- **`Step`** has `technique`, `highlights`, `placements`, `eliminations`, `explanation`.
  - `placements`: digits to place. Most easy techniques produce exactly one placement.
  - `eliminations`: candidates to remove that the technique alone justifies. For nakedSingle/hiddenSingle the placement implies elimination from peers — that's handled by the **solver loop**, not encoded in `eliminations`.
  - `highlights`: cells the user should focus on (the placement cell, plus the unit for hidden singles).
- **Determinism:** detectors must scan in a deterministic order (row-major). Same input → same returned step. This makes test fixtures stable.
- **Detector return semantics:** first applicable step, then return. Don't enumerate all of them.
- **Solver loop:** after applying a step, restart from the easiest technique. (Cheaper to find a naked single again than to skip straight to hidden single if naked singles became available.)
- **Termination:** loop exits when no detector returns a step. The returned `SolveResult` reports whether the board is `solved` (all cells filled) and the ordered `steps` list.
- **Pure functions, no mutation of inputs.** The solver always returns new state objects. `removeCandidateFromPeers` from Phase 2 already returns new grids; the placement update wraps that.
- **No guessing, no brute-force.** Phase 3+ are pure-logic solvers. If neither tech applies, the puzzle isn't solvable in this phase's tech repertoire — that's a valid (partial) terminal state.

---

## Task 1: Solver types (`src/solver/types.ts`)

**Files:**

- Create: `src/solver/types.ts`
- Create: `src/solver/types.test.ts`

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/types.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { CellCoord, Digit } from '../types';
import type { TechniqueName, Step, SolverState, TechniqueDetector } from './types';
import { TECHNIQUE_DIFFICULTY } from './types';

describe('solver types', () => {
  it('TECHNIQUE_DIFFICULTY tags every TechniqueName', () => {
    const names: TechniqueName[] = [
      'nakedSingle',
      'hiddenSingle',
      'nakedPair',
      'nakedTriple',
      'hiddenPair',
      'hiddenTriple',
      'pointingPair',
      'nakedQuad',
      'hiddenQuad',
      'xWing',
      'boxLineReduction',
      'swordfish',
      'xyWing',
      'xyzWing',
      'coloring',
      'uniqueRectangle',
    ];
    for (const n of names) {
      expect(TECHNIQUE_DIFFICULTY[n]).toMatch(/^(easy|medium|hard|expert)$/);
    }
  });

  it('easy techniques include nakedSingle and hiddenSingle', () => {
    expect(TECHNIQUE_DIFFICULTY.nakedSingle).toBe('easy');
    expect(TECHNIQUE_DIFFICULTY.hiddenSingle).toBe('easy');
  });

  it('Step has the expected shape', () => {
    const coord: CellCoord = { row: 0, col: 0 };
    const digit: Digit = 5;
    const step: Step = {
      technique: 'nakedSingle',
      highlights: [coord],
      placements: [{ cell: coord, digit }],
      eliminations: [],
      explanation: 'Only 5 fits at (0,0).',
    };
    expect(step.technique).toBe('nakedSingle');
    expect(step.placements).toHaveLength(1);
    expect(step.eliminations).toHaveLength(0);
  });

  it('SolverState has values and candidates', () => {
    const state: SolverState = {
      values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
      candidates: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set<Digit>()),
      ),
    };
    expect(state.values).toHaveLength(9);
    expect(state.candidates).toHaveLength(9);
  });

  it('TechniqueDetector is callable with SolverState and returns Step | null', () => {
    const dummy: TechniqueDetector = (_state) => null;
    const state: SolverState = {
      values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
      candidates: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set<Digit>()),
      ),
    };
    expect(dummy(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/types.ts`**

```ts
import type { CellCoord, Difficulty, Digit } from '../types';

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

export type Placement = { cell: CellCoord; digit: Digit };
export type Elimination = { cell: CellCoord; digit: Digit };

export type Step = {
  technique: TechniqueName;
  highlights: CellCoord[];
  placements: Placement[];
  eliminations: Elimination[];
  explanation: string;
};

export type SolverState = {
  values: (Digit | null)[][];
  candidates: Set<Digit>[][];
};

export type TechniqueDetector = (state: SolverState) => Step | null;
```

- [ ] **Step 4: Run tests — pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 5: Typecheck and lint**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/types.ts src/solver/types.test.ts
git commit -m "feat(solver): add solver types (Step, SolverState, TechniqueDetector)"
```

---

## Task 2: Naked single detector (`src/solver/techniques/nakedSingle.ts`)

**Files:**

- Create: `src/solver/techniques/nakedSingle.ts`
- Create: `src/solver/techniques/nakedSingle.test.ts`

A **naked single** is an empty cell with exactly one candidate. The detector scans row-major and returns the first such cell as a placement.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/nakedSingle.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedSingle } from './nakedSingle';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

describe('nakedSingle', () => {
  it('returns null when no cell has exactly one candidate', () => {
    expect(nakedSingle(emptyState())).toBeNull();
  });

  it('finds a cell with exactly one candidate and returns a placement step', () => {
    const state = emptyState();
    state.candidates[3]![4] = new Set<Digit>([7]);
    const step = nakedSingle(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedSingle');
    expect(step?.placements).toEqual([{ cell: { row: 3, col: 4 }, digit: 7 }]);
    expect(step?.eliminations).toEqual([]);
    expect(step?.highlights).toEqual([{ row: 3, col: 4 }]);
  });

  it('scans row-major and returns the first naked single', () => {
    const state = emptyState();
    state.candidates[5]![5] = new Set<Digit>([2]); // later in row-major
    state.candidates[1]![8] = new Set<Digit>([9]); // earlier in row-major
    const step = nakedSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 1, col: 8 }, digit: 9 }]);
  });

  it('skips cells with two or more candidates', () => {
    const state = emptyState();
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([3, 4, 5]);
    state.candidates[0]![2] = new Set<Digit>([6]);
    const step = nakedSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 0, col: 2 }, digit: 6 }]);
  });

  it('skips cells that already have a value (empty candidate set)', () => {
    const state = emptyState();
    state.values[0]![0] = 5;
    state.candidates[0]![0] = new Set<Digit>(); // placed cells have empty candidates
    expect(nakedSingle(state)).toBeNull();
  });

  it('explanation mentions the cell and digit', () => {
    const state = emptyState();
    state.candidates[2]![3] = new Set<Digit>([8]);
    const step = nakedSingle(state);
    expect(step?.explanation).toMatch(/8/);
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/nakedSingle.ts`**

```ts
import type { Digit } from '../../types';
import type { SolverState, Step, TechniqueDetector } from '../types';

export const nakedSingle: TechniqueDetector = (state: SolverState): Step | null => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const cands = state.candidates[r]![c]!;
      if (cands.size === 1) {
        const digit = cands.values().next().value as Digit;
        return {
          technique: 'nakedSingle',
          highlights: [{ row: r, col: c }],
          placements: [{ cell: { row: r, col: c }, digit }],
          eliminations: [],
          explanation: `Cell (${r + 1}, ${c + 1}) has only one possible digit: ${digit}.`,
        };
      }
    }
  }
  return null;
};
```

- [ ] **Step 4: Run tests — pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 5: Typecheck and lint**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/nakedSingle.ts src/solver/techniques/nakedSingle.test.ts
git commit -m "feat(solver): add naked single technique detector"
```

---

## Task 3: Hidden single detector (`src/solver/techniques/hiddenSingle.ts`)

**Files:**

- Create: `src/solver/techniques/hiddenSingle.ts`
- Create: `src/solver/techniques/hiddenSingle.test.ts`

A **hidden single** is a digit that appears as a candidate in exactly one cell of a unit (row, column, or box). That cell is forced to be that digit, even if it has other candidates.

The detector scans units in this order: rows 0..8, then cols 0..8, then boxes 0..8. Within each unit, it scans digits 1..9 and finds the first digit that appears in exactly one cell's candidate set.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/hiddenSingle.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenSingle } from './hiddenSingle';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<Digit>(ALL))),
  };
}

describe('hiddenSingle', () => {
  it('returns null on an empty board (every digit is candidate everywhere — never a single)', () => {
    expect(hiddenSingle(emptyState())).toBeNull();
  });

  it('finds a hidden single in a row', () => {
    const state = emptyState();
    // In row 0, remove digit 5 from every cell except (0, 4).
    for (let c = 0; c < 9; c++) {
      if (c !== 4) state.candidates[0]![c]!.delete(5);
    }
    const step = hiddenSingle(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenSingle');
    expect(step?.placements).toEqual([{ cell: { row: 0, col: 4 }, digit: 5 }]);
    expect(step?.highlights).toContainEqual({ row: 0, col: 4 });
  });

  it('finds a hidden single in a column', () => {
    const state = emptyState();
    // Make row hidden singles impossible by also removing 7 from row 0 except (0,0)
    // Actually simpler: pick a digit that only survives in one column cell.
    for (let r = 0; r < 9; r++) {
      if (r !== 6) state.candidates[r]![2]!.delete(8);
    }
    // Also avoid earlier row matches: digit 8 is still a candidate everywhere else in row 6 etc., so we
    // need to confirm column wins. But scan order is rows first. To make column the only match, we need
    // rows to not have hidden singles. Strategy: leave 8 in every column 2 cell removed except (6,2),
    // but row 6 will have 8 in (6,0)..(6,8) still — so no row hidden single for 8 in row 6 (it's present
    // in 9 cells, not 1).
    // Verify: scan rows 0..5: row r has cell (r,2) with 8 removed; the other 8 cells still have 8.
    // So 8 appears in 8 cells of row r — not a hidden single.
    // Column 2: 8 appears only in (6, 2) — hidden single.
    const step = hiddenSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 6, col: 2 }, digit: 8 }]);
  });

  it('finds a hidden single in a box', () => {
    const state = emptyState();
    // Box 4 spans rows 3-5, cols 3-5. Remove digit 1 from every cell in box 4 except (4, 4).
    for (let r = 3; r <= 5; r++) {
      for (let c = 3; c <= 5; c++) {
        if (!(r === 4 && c === 4)) state.candidates[r]![c]!.delete(1);
      }
    }
    // Also ensure no row or col hidden single for 1 fires first: 1 is still present in many cells
    // of row 4 and col 4 outside the box. The targeted box-only restriction means rows 3-5 each have
    // 1 in 7 of 9 cells (only (r,3..5) except (4,4) had 1 removed) — no row hidden single.
    // Cols 3-5 similarly. Box 4 has 1 in exactly 1 cell — hidden single.
    const step = hiddenSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 4, col: 4 }, digit: 1 }]);
  });

  it('returns null when every digit is present as a candidate in 2+ cells of every unit', () => {
    expect(hiddenSingle(emptyState())).toBeNull();
  });

  it('skips digits already placed (not in any cell\\'s candidates within the unit)', () => {
    const state = emptyState();
    // Place 3 at (0, 0); clear 3 from row 0 candidates everywhere.
    state.values[0]![0] = 3;
    state.candidates[0]![0] = new Set<Digit>();
    for (let c = 1; c < 9; c++) state.candidates[0]![c]!.delete(3);
    // No hidden single for 3 in row 0 (it's placed, not a candidate in any cell of the row).
    // Confirm hiddenSingle still returns null (no other artificial singles set up).
    expect(hiddenSingle(state)).toBeNull();
  });

  it('explanation names the unit type and digit', () => {
    const state = emptyState();
    for (let c = 0; c < 9; c++) {
      if (c !== 4) state.candidates[0]![c]!.delete(5);
    }
    const step = hiddenSingle(state);
    expect(step?.explanation).toMatch(/5/);
    expect(step?.explanation).toMatch(/row/i);
  });
});
```

- [ ] **Step 2: Run the test — should fail**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/hiddenSingle.ts`**

```ts
import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { SolverState, Step, TechniqueDetector } from '../types';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type UnitKind = 'row' | 'column' | 'box';

function scanUnits(state: SolverState, units: CellCoord[][], kind: UnitKind): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    for (const digit of DIGITS) {
      const cellsWithDigit: CellCoord[] = [];
      for (const coord of unit) {
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) {
          cellsWithDigit.push(coord);
          if (cellsWithDigit.length > 1) break;
        }
      }
      if (cellsWithDigit.length === 1) {
        const placement = cellsWithDigit[0]!;
        return {
          technique: 'hiddenSingle',
          highlights: [placement, ...unit],
          placements: [{ cell: placement, digit }],
          eliminations: [],
          explanation: `In ${kind} ${u + 1}, ${digit} can only go in cell (${placement.row + 1}, ${placement.col + 1}).`,
        };
      }
    }
  }
  return null;
}

export const hiddenSingle: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanUnits(state, rowsOf(), 'row') ??
    scanUnits(state, colsOf(), 'column') ??
    scanUnits(state, boxesOf(), 'box')
  );
};
```

- [ ] **Step 4: Run tests — pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 5: Typecheck and lint**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/hiddenSingle.ts src/solver/techniques/hiddenSingle.test.ts
git commit -m "feat(solver): add hidden single technique detector"
```

---

## Task 4: Solver loop and technique registry (`src/solver/solve.ts` + `techniques/index.ts`)

**Files:**

- Create: `src/solver/techniques/index.ts`
- Create: `src/solver/solve.ts`
- Create: `src/solver/solve.test.ts`

The technique registry exports an ordered list (easiest first). The solver loop tries each detector; on the first that returns a step, it applies the step's placements (using `removeCandidateFromPeers` for each placement to update peer candidates), records the step, and restarts from the top. When no detector returns a step, the loop exits.

- [ ] **Step 1: Write `src/solver/techniques/index.ts`** (no test for this — it's a one-line list)

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';

export const ALL_TECHNIQUES: TechniqueDetector[] = [nakedSingle, hiddenSingle];
```

- [ ] **Step 2: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/solve.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { solve } from './solve';

// A puzzle solvable purely by naked + hidden singles.
// From Andrew Stuart's reference set ("Beginner" — naked/hidden singles only).
//   . . 3 | . 2 . | 6 . .
//   9 . . | 3 . 5 | . . 1
//   . . 1 | 8 . 6 | 4 . .
//   ------+-------+------
//   . . 8 | 1 . 2 | 9 . .
//   7 . . | . . . | . . 8
//   . . 6 | 7 . 8 | 2 . .
//   ------+-------+------
//   . . 2 | 6 . 9 | 5 . .
//   8 . . | 2 . 3 | . . 9
//   . . 5 | . 1 . | 3 . .
const EASY_PUZZLE: (Digit | null)[][] = [
  [null, null, 3, null, 2, null, 6, null, null],
  [9, null, null, 3, null, 5, null, null, 1],
  [null, null, 1, 8, null, 6, 4, null, null],
  [null, null, 8, 1, null, 2, 9, null, null],
  [7, null, null, null, null, null, null, null, 8],
  [null, null, 6, 7, null, 8, 2, null, null],
  [null, null, 2, 6, null, 9, 5, null, null],
  [8, null, null, 2, null, 3, null, null, 9],
  [null, null, 5, null, 1, null, 3, null, null],
];

const EASY_SOLUTION: Digit[][] = [
  [4, 8, 3, 9, 2, 1, 6, 5, 7],
  [9, 6, 7, 3, 4, 5, 8, 2, 1],
  [2, 5, 1, 8, 7, 6, 4, 9, 3],
  [5, 4, 8, 1, 3, 2, 9, 7, 6],
  [7, 2, 9, 5, 6, 4, 1, 3, 8],
  [1, 3, 6, 7, 9, 8, 2, 4, 5],
  [3, 7, 2, 6, 8, 9, 5, 1, 4],
  [8, 1, 4, 2, 5, 3, 7, 6, 9],
  [6, 9, 5, 4, 1, 7, 3, 8, 2],
];

describe('solve', () => {
  it('returns the original board with no steps when no technique applies (empty input)', () => {
    const result = solve(
      Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null as Digit | null)),
    );
    expect(result.steps).toHaveLength(0);
    expect(result.solved).toBe(false);
  });

  it('solves the curated easy puzzle using only easy techniques', () => {
    const result = solve(EASY_PUZZLE);
    expect(result.solved).toBe(true);
    expect(result.state.values).toEqual(EASY_SOLUTION);
    for (const step of result.steps) {
      expect(['nakedSingle', 'hiddenSingle']).toContain(step.technique);
    }
  });

  it('does not mutate the input grid', () => {
    const input = EASY_PUZZLE.map((row) => [...row]);
    const snapshot = EASY_PUZZLE.map((row) => [...row]);
    solve(input);
    expect(input).toEqual(snapshot);
  });

  it('records steps in the order they were applied', () => {
    const result = solve(EASY_PUZZLE);
    expect(result.steps.length).toBeGreaterThan(0);
    // each step has at least one placement (easy techniques always place)
    for (const step of result.steps) {
      expect(step.placements.length).toBeGreaterThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 3: Run the test — should fail (solve.ts missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 4: Implement `src/solver/solve.ts`**

```ts
import type { Digit } from '../types';
import { computeCandidates, removeCandidateFromPeers } from './candidates';
import { ALL_TECHNIQUES } from './techniques';
import type { SolverState, Step } from './types';

export type SolveResult = {
  state: SolverState;
  steps: Step[];
  solved: boolean;
};

function cloneValues(values: (Digit | null)[][]): (Digit | null)[][] {
  return values.map((row) => [...row]);
}

function isSolved(values: (Digit | null)[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r]![c] === null) return false;
    }
  }
  return true;
}

export function solve(initial: (Digit | null)[][]): SolveResult {
  let values = cloneValues(initial);
  let candidates = computeCandidates(values);
  const steps: Step[] = [];

  // Apply techniques until no further progress.
  // Each iteration restarts at the easiest technique to favor simpler explanations.
  for (let safety = 0; safety < 1000; safety++) {
    let progressed = false;
    for (const detector of ALL_TECHNIQUES) {
      const step = detector({ values, candidates });
      if (!step) continue;

      // Apply placements: write the value, then update candidates.
      for (const placement of step.placements) {
        values = cloneValues(values);
        values[placement.cell.row]![placement.cell.col] = placement.digit;
        candidates = removeCandidateFromPeers(candidates, placement.cell, placement.digit);
        // The placed cell itself has no candidates left.
        const newCellRow = candidates[placement.cell.row]!.slice();
        newCellRow[placement.cell.col] = new Set();
        const newCandidates = candidates.slice();
        newCandidates[placement.cell.row] = newCellRow;
        candidates = newCandidates;
      }

      // Apply eliminations (techniques may suggest pure eliminations later;
      // easy techniques here use this with empty arrays).
      for (const elim of step.eliminations) {
        const newRow = candidates[elim.cell.row]!.slice();
        const newSet = new Set(newRow[elim.cell.col]);
        newSet.delete(elim.digit);
        newRow[elim.cell.col] = newSet;
        const newCandidates = candidates.slice();
        newCandidates[elim.cell.row] = newRow;
        candidates = newCandidates;
      }

      steps.push(step);
      progressed = true;
      break; // restart from easiest technique
    }
    if (!progressed) break;
  }

  return {
    state: { values, candidates },
    steps,
    solved: isSolved(values),
  };
}
```

- [ ] **Step 5: Run tests — pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

If the curated easy puzzle does not solve, the test will fail with the partially-solved values. That usually means either (a) the puzzle requires a technique not yet implemented (not for THIS curated one — it's specifically chosen to need only easy techniques), or (b) a bug in the solver loop's state-update sequence. Debug by reducing the puzzle to a smaller hand-crafted scenario and re-running.

- [ ] **Step 6: Typecheck and lint**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint
```

- [ ] **Step 7: Commit** (all three files together — they're tightly coupled)

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/index.ts src/solver/solve.ts src/solver/solve.test.ts
git commit -m "feat(solver): add solver loop and technique registry"
```

---

## Acceptance Criteria (whole phase)

After all 4 tasks complete, verify:

- [ ] `npm test` passes (the count grows by ~20 from Phase 2).
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm run format:check` exits 0.
- [ ] `npm run build` succeeds.
- [ ] The curated easy puzzle in `solve.test.ts` solves to the expected SOLUTION, using only `nakedSingle` and `hiddenSingle` steps.
- [ ] Each technique detector has tests covering positive (technique applies) and negative (technique doesn't apply) cases.
- [ ] The git log shows 4 new commits, conventional messages.

**Out of scope for this phase:** medium techniques (Phase 4), hard techniques (Phase 5), expert techniques (Phase 6), generator (Phase 7+).
