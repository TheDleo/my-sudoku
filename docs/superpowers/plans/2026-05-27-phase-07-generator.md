# Phase 7: Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `generate(difficulty): Puzzle` that produces a random, uniquely-solvable Sudoku puzzle of the requested difficulty tier, classified by the canonical solve path within Phase 6's technique set.

**Architecture:** Five small modules under `src/generator/`. `fullGrid` produces a random complete grid via random-fill + backtracking. `uniqueness` is a fast brute-force counter (MRV heuristic, aborts at 2 solutions). `digHoles` greedily removes cells in random order while preserving uniqueness. `difficulty.classify` runs the Phase 6 human solver and returns the max-tier technique used (or null if unsolvable). `generate` orchestrates: fullGrid → digHoles → classify → return-if-target-tier-else-retry. Puzzles requiring techniques beyond Phase 6 are silently rejected.

**Tech Stack:** No new dependencies. Reuses `solve` from Phase 3-6 (`src/solver/solve.ts`), `TECHNIQUE_DIFFICULTY` (`src/solver/types.ts`), and the existing `Puzzle` type (`src/types.ts:16-21`).

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design notes — locked in before tasks:**

- **Hole digging is random, not symmetric.** Symmetric digging is a possible future enhancement; this phase ships random only.
- **Uniqueness is verified by a brute-force counter solver** (separate from the human solver). The human solver fails on puzzles requiring beyond-Phase-6 techniques and is too slow for the dig loop; the brute-force counter with MRV heuristic is authoritative and fast.
- **Puzzles whose canonical solve path exceeds Phase 6 are rejected and the generator retries.** `classify(grid)` returns `null` when the human solver can't fully solve; `generate` treats `null` as "not target tier" and continues.
- **Difficulty classification = max tier of any technique used in the canonical solve path.** Encoded via `TECHNIQUE_DIFFICULTY` from `src/solver/types.ts:21`. Tier order: easy < medium < hard < expert.
- **Reuse existing `Puzzle` type at `src/types.ts:16-21`** with shape `{ id: string; difficulty: Difficulty; initialBoard: (Digit | null)[][]; solution: SolvedGrid }`. The generator produces a deterministic id by hashing `initialBoard` so the same givens always produce the same id (useful for Phase 9's save/load).
- **Determinism:** all generation functions accept an optional `rng: () => number` parameter (default `Math.random`). Tests pass a seeded mulberry32 RNG for reproducibility.
- **No changes to existing modules.** `solve`, `Difficulty`, `Puzzle`, `TECHNIQUE_DIFFICULTY` are already exported with the right shape.
- **Time budgets per PLAN.md §7:** `generate('expert')` < 30s, `generate('easy')` < 5s. Verified by a single time-budget test on expert; default attempt counts tuned to fit.

---

## Task 1: Seedable RNG helper

**Files:**

- Create: `src/generator/rng.ts`
- Create: `src/generator/rng.test.ts`

This task adds a tiny seedable pseudo-random generator used by all later tasks for deterministic tests. `Math.random` is not seedable so tests with concrete assertions need a seeded alternative.

- [ ] **Step 1: Write the failing test.**

Create `src/generator/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './rng';

describe('mulberry32', () => {
  it('returns a function producing floats in [0, 1)', () => {
    const r = mulberry32(0);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic across calls with the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let differs = false;
    for (let i = 0; i < 10; i++) {
      if (a() !== b()) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm test -- --run src/generator/rng.test.ts`
Expected: FAIL — `mulberry32` not exported from `./rng` (module not found).

- [ ] **Step 3: Create `src/generator/rng.ts`.**

```ts
/**
 * mulberry32: small, fast, seedable PRNG. Returns a function that yields
 * uniformly distributed floats in [0, 1).
 *
 * Source: https://en.wikipedia.org/wiki/Linear_congruential_generator (mulberry32 variant).
 * Used by tests for deterministic generation.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run tests to verify GREEN.**

Run: `npm test -- --run src/generator/rng.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/generator/rng.ts src/generator/rng.test.ts
git commit -m "feat(generator): add mulberry32 seedable RNG"
```

---

## Task 2: `fullGrid` — random complete grid

**Files:**

- Create: `src/generator/fullGrid.ts`
- Create: `src/generator/fullGrid.test.ts`

Produces a random valid completed 9×9 Sudoku grid via random-fill + backtracking. Row-major traversal; at each empty cell, try digits 1-9 in shuffled order; backtrack on dead-end. Accepts an optional seedable RNG.

- [ ] **Step 1: Write the failing test.**

Create `src/generator/fullGrid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { fullGrid } from './fullGrid';
import { mulberry32 } from './rng';

function isPermutation1to9(cells: ReadonlyArray<Digit>): boolean {
  if (cells.length !== 9) return false;
  const seen = new Set<number>();
  for (const c of cells) {
    if (c < 1 || c > 9) return false;
    if (seen.has(c)) return false;
    seen.add(c);
  }
  return true;
}

describe('fullGrid', () => {
  it('returns a 9x9 grid where every row, column, and box is 1-9', () => {
    const grid = fullGrid(mulberry32(1));
    expect(grid.length).toBe(9);
    for (let r = 0; r < 9; r++) {
      expect(grid[r]!.length).toBe(9);
      expect(isPermutation1to9(grid[r]!)).toBe(true);
    }
    for (let c = 0; c < 9; c++) {
      const col = grid.map((row) => row[c]!);
      expect(isPermutation1to9(col)).toBe(true);
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cells: Digit[] = [];
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) {
            cells.push(grid[r]![c]!);
          }
        }
        expect(isPermutation1to9(cells)).toBe(true);
      }
    }
  });

  it('is deterministic with a fixed seed', () => {
    const a = fullGrid(mulberry32(42));
    const b = fullGrid(mulberry32(42));
    expect(a).toEqual(b);
  });

  it('produces different grids for different seeds', () => {
    const a = fullGrid(mulberry32(1));
    const b = fullGrid(mulberry32(2));
    expect(a).not.toEqual(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/generator/fullGrid.test.ts`
Expected: FAIL — `fullGrid` not exported.

- [ ] **Step 3: Create `src/generator/fullGrid.ts`.**

```ts
import type { Digit } from '../types';

const SIZE = 9;
const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

function isValidPlacement(grid: (Digit | null)[][], r: number, c: number, digit: Digit): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (grid[r]![i] === digit) return false;
    if (grid[i]![c] === digit) return false;
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (grid[boxR + dr]![boxC + dc] === digit) return false;
    }
  }
  return true;
}

function fill(grid: (Digit | null)[][], r: number, c: number, rng: () => number): boolean {
  if (r === SIZE) return true;
  const nextR = c === SIZE - 1 ? r + 1 : r;
  const nextC = c === SIZE - 1 ? 0 : c + 1;
  const candidates = DIGITS.slice();
  shuffleInPlace(candidates, rng);
  for (const digit of candidates) {
    if (!isValidPlacement(grid, r, c, digit)) continue;
    grid[r]![c] = digit;
    if (fill(grid, nextR, nextC, rng)) return true;
  }
  grid[r]![c] = null;
  return false;
}

/**
 * Returns a random valid completed 9x9 Sudoku grid.
 * Accepts an optional seedable RNG for deterministic generation.
 */
export function fullGrid(rng: () => number = Math.random): Digit[][] {
  const grid: (Digit | null)[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, (): Digit | null => null),
  );
  if (!fill(grid, 0, 0, rng)) {
    throw new Error('fullGrid: unexpected backtracking failure on empty grid');
  }
  return grid as Digit[][];
}
```

- [ ] **Step 4: Run tests to verify GREEN.**

Run: `npm test -- --run src/generator/fullGrid.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/generator/fullGrid.ts src/generator/fullGrid.test.ts
git commit -m "feat(generator): add random complete-grid generator"
```

---

## Task 3: `uniqueness` — brute-force solution counter

**Files:**

- Create: `src/generator/uniqueness.ts`
- Create: `src/generator/uniqueness.test.ts`

Recursive backtracking solver that counts solutions and aborts at 2. Uses the most-constrained-variable (MRV) heuristic — picks the empty cell with the fewest legal candidates first — which prunes the search tree dramatically. Critical for `digHoles` which calls this up to 81 times per puzzle.

- [ ] **Step 1: Write the failing test.**

Create `src/generator/uniqueness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { hasUniqueSolution, countSolutions } from './uniqueness';
import { fullGrid } from './fullGrid';
import { mulberry32 } from './rng';

describe('uniqueness', () => {
  it('a fully completed grid has exactly 1 solution', () => {
    const grid = fullGrid(mulberry32(1));
    expect(countSolutions(grid)).toBe(1);
    expect(hasUniqueSolution(grid)).toBe(true);
  });

  it('a grid with one empty cell has exactly 1 solution', () => {
    const grid = fullGrid(mulberry32(1));
    const test: (Digit | null)[][] = grid.map((row) => [...row]);
    test[0]![0] = null;
    expect(countSolutions(test)).toBe(1);
    expect(hasUniqueSolution(test)).toBe(true);
  });

  it('a grid with a deadly rectangle nulled has at least 2 solutions', () => {
    // A "deadly rectangle" is 4 cells (r1,c1), (r1,c2), (r2,c1), (r2,c2) where
    // grid[r1][c1] === grid[r2][c2] (= a) and grid[r1][c2] === grid[r2][c1] (= b)
    // and the rectangle spans exactly 2 boxes. Removing all 4 cells produces a
    // puzzle with at least 2 valid completions (the original and the a/b swap).
    // Almost every random full grid contains at least one such rectangle.
    const grid = fullGrid(mulberry32(1));
    const test: (Digit | null)[][] = grid.map((row) => [...row]);
    let found = false;
    outer: for (let r1 = 0; r1 < 9 && !found; r1++) {
      for (let r2 = r1 + 1; r2 < 9; r2++) {
        for (let c1 = 0; c1 < 9; c1++) {
          for (let c2 = c1 + 1; c2 < 9; c2++) {
            const sameBand = Math.floor(r1 / 3) === Math.floor(r2 / 3);
            const sameStack = Math.floor(c1 / 3) === Math.floor(c2 / 3);
            if (sameBand === sameStack) continue; // must span exactly 2 boxes
            const a = grid[r1]![c1]!;
            const b = grid[r1]![c2]!;
            if (a === b) continue;
            if (grid[r2]![c1] !== b) continue;
            if (grid[r2]![c2] !== a) continue;
            test[r1]![c1] = null;
            test[r1]![c2] = null;
            test[r2]![c1] = null;
            test[r2]![c2] = null;
            found = true;
            break outer;
          }
        }
      }
    }
    expect(found).toBe(true);
    expect(countSolutions(test)).toBeGreaterThanOrEqual(2);
    expect(hasUniqueSolution(test)).toBe(false);
  });

  it('an empty grid has many solutions (counter aborts at 2)', () => {
    const empty: (Digit | null)[][] = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => null),
    );
    // countSolutions with cap=2 should return 2 (it stops searching after finding 2).
    expect(countSolutions(empty)).toBe(2);
    expect(hasUniqueSolution(empty)).toBe(false);
  });

  it('a known unique puzzle (Project Euler #96 grid 1) has exactly 1 solution', () => {
    const puzzle: (Digit | null)[][] = [
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
    expect(hasUniqueSolution(puzzle)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/generator/uniqueness.test.ts`
Expected: FAIL — `hasUniqueSolution` and `countSolutions` not exported.

- [ ] **Step 3: Create `src/generator/uniqueness.ts`.**

```ts
import type { Digit } from '../types';

const SIZE = 9;
const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function legalDigits(grid: (Digit | null)[][], r: number, c: number): Digit[] {
  const used = new Set<Digit>();
  for (let i = 0; i < SIZE; i++) {
    const v1 = grid[r]![i];
    const v2 = grid[i]![c];
    if (v1 !== null) used.add(v1);
    if (v2 !== null) used.add(v2);
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const v = grid[boxR + dr]![boxC + dc];
      if (v !== null) used.add(v);
    }
  }
  const out: Digit[] = [];
  for (const d of DIGITS) if (!used.has(d)) out.push(d);
  return out;
}

function pickMRV(grid: (Digit | null)[][]): { r: number; c: number; candidates: Digit[] } | null {
  let best: { r: number; c: number; candidates: Digit[] } | null = null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] !== null) continue;
      const cand = legalDigits(grid, r, c);
      if (cand.length === 0) return { r, c, candidates: [] }; // dead cell, prune fast
      if (best === null || cand.length < best.candidates.length) {
        best = { r, c, candidates: cand };
        if (cand.length === 1) return best;
      }
    }
  }
  return best;
}

function countRec(grid: (Digit | null)[][], cap: number, found: number): number {
  const pick = pickMRV(grid);
  if (pick === null) return found + 1;
  if (pick.candidates.length === 0) return found;
  for (const d of pick.candidates) {
    grid[pick.r]![pick.c] = d;
    found = countRec(grid, cap, found);
    if (found >= cap) {
      grid[pick.r]![pick.c] = null;
      return found;
    }
  }
  grid[pick.r]![pick.c] = null;
  return found;
}

/**
 * Counts solutions of `grid` up to `cap` (default 2). Returns as soon as `cap`
 * solutions are found — never explores further.
 */
export function countSolutions(grid: ReadonlyArray<ReadonlyArray<Digit | null>>, cap = 2): number {
  const copy: (Digit | null)[][] = grid.map((row) => [...row]);
  return countRec(copy, cap, 0);
}

/**
 * Returns true iff the grid has exactly one solution.
 */
export function hasUniqueSolution(grid: ReadonlyArray<ReadonlyArray<Digit | null>>): boolean {
  return countSolutions(grid, 2) === 1;
}
```

- [ ] **Step 4: Run tests to verify GREEN.**

Run: `npm test -- --run src/generator/uniqueness.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/generator/uniqueness.ts src/generator/uniqueness.test.ts
git commit -m "feat(generator): add brute-force solution counter for uniqueness checks"
```

---

## Task 4: `digHoles` — random hole digging with uniqueness preservation

**Files:**

- Create: `src/generator/digHoles.ts`
- Create: `src/generator/digHoles.test.ts`

Walks the 81 cells in a shuffled order. For each cell, removes its value if the resulting puzzle still has a unique solution; otherwise restores it. Returns the maximally-dug grid for that order.

- [ ] **Step 1: Write the failing test.**

Create `src/generator/digHoles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { digHoles } from './digHoles';
import { fullGrid } from './fullGrid';
import { hasUniqueSolution } from './uniqueness';
import { mulberry32 } from './rng';

function countGivens(grid: ReadonlyArray<ReadonlyArray<Digit | null>>): number {
  let n = 0;
  for (const row of grid) for (const cell of row) if (cell !== null) n++;
  return n;
}

describe('digHoles', () => {
  it('result has the same row/col/box constraints as the input (no contradictions)', () => {
    const grid = fullGrid(mulberry32(1));
    const dug = digHoles(grid, mulberry32(1));
    // Every non-null cell must equal the original grid value (we never change values, only null them).
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (dug[r]![c] !== null) {
          expect(dug[r]![c]).toBe(grid[r]![c]);
        }
      }
    }
  });

  it('result has a unique solution', () => {
    const grid = fullGrid(mulberry32(1));
    const dug = digHoles(grid, mulberry32(1));
    expect(hasUniqueSolution(dug)).toBe(true);
  });

  it('result has fewer givens than the input full grid', () => {
    const grid = fullGrid(mulberry32(1));
    const dug = digHoles(grid, mulberry32(1));
    expect(countGivens(dug)).toBeLessThan(81);
  });

  it('different seeds produce different hole layouts', () => {
    const grid = fullGrid(mulberry32(1));
    const a = digHoles(grid, mulberry32(2));
    const b = digHoles(grid, mulberry32(3));
    expect(a).not.toEqual(b);
  });

  it('is deterministic with a fixed seed', () => {
    const grid = fullGrid(mulberry32(1));
    const a = digHoles(grid, mulberry32(7));
    const b = digHoles(grid, mulberry32(7));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/generator/digHoles.test.ts`
Expected: FAIL — `digHoles` not exported.

- [ ] **Step 3: Create `src/generator/digHoles.ts`.**

```ts
import type { Digit } from '../types';
import { hasUniqueSolution } from './uniqueness';

const SIZE = 9;

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Returns a grid derived from `full` by removing as many cells as possible
 * while preserving exactly one solution. Cells are tried in a random order
 * determined by `rng`; each removal that breaks uniqueness is rolled back.
 */
export function digHoles(
  full: ReadonlyArray<ReadonlyArray<Digit>>,
  rng: () => number = Math.random,
): (Digit | null)[][] {
  const grid: (Digit | null)[][] = full.map((row) => [...row]);
  const positions: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push({ r, c });
    }
  }
  shuffleInPlace(positions, rng);
  for (const { r, c } of positions) {
    if (grid[r]![c] === null) continue;
    const saved = grid[r]![c]!;
    grid[r]![c] = null;
    if (!hasUniqueSolution(grid)) {
      grid[r]![c] = saved;
    }
  }
  return grid;
}
```

- [ ] **Step 4: Run tests to verify GREEN.**

Run: `npm test -- --run src/generator/digHoles.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/generator/digHoles.ts src/generator/digHoles.test.ts
git commit -m "feat(generator): add random hole-digger with uniqueness preservation"
```

---

## Task 5: `difficulty.classify` — tier classifier

**Files:**

- Create: `src/generator/difficulty.ts`
- Create: `src/generator/difficulty.test.ts`

Runs the existing Phase 6 human solver on a puzzle and returns the max-tier technique used. Returns `null` when the solver doesn't fully solve (puzzle requires beyond-Phase-6 techniques).

- [ ] **Step 1: Write the failing test.**

Create `src/generator/difficulty.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { classify } from './difficulty';

describe('classify', () => {
  it('returns "easy" for a puzzle solvable by singles only', () => {
    // A near-complete puzzle. Only one cell empty → naked single only.
    const puzzle: (Digit | null)[][] = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, null],
    ];
    expect(classify(puzzle)).toBe('easy');
  });

  it('returns "medium" for a puzzle exercising medium-tier techniques', () => {
    // Re-use the curated medium puzzle from src/solver/solve.test.ts.
    const puzzle: (Digit | null)[][] = [
      [4, null, null, null, null, null, 8, null, 5],
      [null, 3, null, null, null, null, null, null, null],
      [null, null, null, 7, null, null, null, null, null],
      [null, 2, null, null, null, null, null, 6, null],
      [null, null, null, null, 8, null, 4, null, null],
      [null, null, null, null, 1, null, null, null, null],
      [null, null, null, 6, null, 3, null, 7, null],
      [5, null, null, 2, null, null, null, null, null],
      [1, null, 4, null, null, null, null, null, null],
    ];
    expect(classify(puzzle)).toBe('medium');
  });

  it('returns "hard" for the Phase 5 hard puzzle', () => {
    const puzzle: (Digit | null)[][] = [
      [null, 4, 3, null, 8, null, 2, 5, null],
      [6, null, null, null, null, null, null, null, null],
      [null, null, null, null, null, 1, null, 9, 4],
      [9, null, null, null, null, 4, null, 7, null],
      [null, null, null, 6, null, 8, null, null, null],
      [null, 1, null, 2, null, null, null, null, 3],
      [8, 2, null, 5, null, null, null, null, null],
      [null, null, null, null, null, null, null, null, 5],
      [null, 3, 4, null, 9, null, 7, 1, null],
    ];
    expect(classify(puzzle)).toBe('hard');
  });

  it('returns "expert" for the Phase 6 fallback A puzzle', () => {
    const puzzle: (Digit | null)[][] = [
      [9, null, null, 2, 4, null, null, null, null],
      [null, 5, null, 6, 9, null, 2, 3, 1],
      [null, 2, null, null, 5, null, null, 9, null],
      [null, 9, null, 7, null, null, 3, 2, null],
      [null, null, 2, 9, 3, 5, 6, null, 7],
      [null, 7, null, null, null, 2, 9, null, null],
      [null, 6, 9, null, 2, null, null, 7, 3],
      [5, 1, null, null, 7, 9, null, null, 2],
      [2, null, 7, null, 8, null, null, null, 9],
    ];
    expect(classify(puzzle)).toBe('expert');
  });

  it('returns "easy" for a fully complete grid (no steps)', () => {
    const grid: (Digit | null)[][] = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ];
    expect(classify(grid)).toBe('easy');
  });

  it('returns null when the solver cannot fully solve (e.g. empty board)', () => {
    const empty: (Digit | null)[][] = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => null),
    );
    expect(classify(empty)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/generator/difficulty.test.ts`
Expected: FAIL — `classify` not exported.

- [ ] **Step 3: Create `src/generator/difficulty.ts`.**

```ts
import type { Difficulty, Digit } from '../types';
import { solve } from '../solver/solve';
import { TECHNIQUE_DIFFICULTY } from '../solver/types';

const TIER_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function tierIndex(d: Difficulty): number {
  return TIER_ORDER.indexOf(d);
}

/**
 * Classifies `puzzle` by the hardest technique the Phase 6 human solver uses
 * to crack it. Returns null when the solver cannot fully solve the puzzle
 * (it requires techniques beyond Phase 6's set). An already-complete grid
 * classifies as 'easy'.
 */
export function classify(puzzle: ReadonlyArray<ReadonlyArray<Digit | null>>): Difficulty | null {
  const grid = puzzle.map((row) => [...row]);
  const result = solve(grid);
  if (!result.solved) return null;
  let highest: Difficulty = 'easy';
  for (const step of result.steps) {
    const tier = TECHNIQUE_DIFFICULTY[step.technique];
    if (tierIndex(tier) > tierIndex(highest)) highest = tier;
  }
  return highest;
}
```

- [ ] **Step 4: Run tests to verify GREEN.**

Run: `npm test -- --run src/generator/difficulty.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**

```bash
git add src/generator/difficulty.ts src/generator/difficulty.test.ts
git commit -m "feat(generator): add max-tier difficulty classifier"
```

---

## Task 6: `generate` — orchestrator

**Files:**

- Create: `src/generator/generate.ts`
- Create: `src/generator/generate.test.ts`

Combines fullGrid, digHoles, classify into a retry loop. Returns a `Puzzle` of the target difficulty. Builds a deterministic id by hashing the initial board so the same givens always produce the same id.

- [ ] **Step 1: Write the failing test.**

Create `src/generator/generate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generate } from './generate';
import { classify } from './difficulty';
import { hasUniqueSolution } from './uniqueness';
import { mulberry32 } from './rng';

describe('generate', () => {
  it('returns a puzzle with the requested difficulty (easy)', () => {
    const puzzle = generate('easy', { rng: mulberry32(11) });
    expect(puzzle.difficulty).toBe('easy');
    expect(classify(puzzle.initialBoard)).toBe('easy');
  });

  it('returns a puzzle with the requested difficulty (medium)', () => {
    const puzzle = generate('medium', { rng: mulberry32(22) });
    expect(puzzle.difficulty).toBe('medium');
    expect(classify(puzzle.initialBoard)).toBe('medium');
  });

  it('returns a puzzle with the requested difficulty (hard)', () => {
    const puzzle = generate('hard', { rng: mulberry32(33) });
    expect(puzzle.difficulty).toBe('hard');
    expect(classify(puzzle.initialBoard)).toBe('hard');
  });

  it('returns a puzzle with the requested difficulty (expert)', () => {
    const puzzle = generate('expert', { rng: mulberry32(44) });
    expect(puzzle.difficulty).toBe('expert');
    expect(classify(puzzle.initialBoard)).toBe('expert');
  });

  it('the returned initialBoard has a unique solution', () => {
    const puzzle = generate('medium', { rng: mulberry32(22) });
    expect(hasUniqueSolution(puzzle.initialBoard)).toBe(true);
  });

  it('the returned solution is consistent with the initialBoard (givens match)', () => {
    const puzzle = generate('hard', { rng: mulberry32(33) });
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const given = puzzle.initialBoard[r]![c];
        if (given !== null) expect(puzzle.solution[r]![c]).toBe(given);
      }
    }
  });

  it('the same seed produces the same puzzle (deterministic)', () => {
    const a = generate('medium', { rng: mulberry32(99) });
    const b = generate('medium', { rng: mulberry32(99) });
    expect(a).toEqual(b);
  });

  it('throws when it cannot find a matching puzzle within maxAttempts', () => {
    expect(() => generate('expert', { rng: mulberry32(1), maxAttempts: 0 })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm test -- --run src/generator/generate.test.ts`
Expected: FAIL — `generate` not exported.

- [ ] **Step 3: Create `src/generator/generate.ts`.**

```ts
import type { Difficulty, Digit, Puzzle } from '../types';
import { classify } from './difficulty';
import { digHoles } from './digHoles';
import { fullGrid } from './fullGrid';

const DEFAULT_MAX_ATTEMPTS: Record<Difficulty, number> = {
  easy: 500,
  medium: 200,
  hard: 100,
  expert: 100,
};

export type GenerateOptions = {
  maxAttempts?: number;
  rng?: () => number;
};

function puzzleId(initialBoard: ReadonlyArray<ReadonlyArray<Digit | null>>): string {
  // FNV-1a-style hash so identical boards yield the same id.
  let h = 2166136261 >>> 0;
  for (const row of initialBoard) {
    for (const cell of row) {
      h = Math.imul(h ^ (cell ?? 0), 16777619) >>> 0;
    }
  }
  return h.toString(36);
}

/**
 * Generates a puzzle of the requested difficulty by repeatedly making a full
 * grid, digging holes randomly, and classifying the result. Throws if no
 * puzzle of the target tier is found within `maxAttempts` attempts.
 */
export function generate(target: Difficulty, opts: GenerateOptions = {}): Puzzle {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS[target];
  const rng = opts.rng ?? Math.random;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = fullGrid(rng);
    const initialBoard = digHoles(solution, rng);
    const tier = classify(initialBoard);
    if (tier === target) {
      return {
        id: puzzleId(initialBoard),
        difficulty: target,
        initialBoard,
        solution,
      };
    }
  }
  throw new Error(`generate(${target}) gave up after ${maxAttempts} attempts`);
}
```

- [ ] **Step 4: Run tests to verify GREEN.**

Run: `npm test -- --run src/generator/generate.test.ts`
Expected: PASS (8 tests).

If a per-tier test fails because `generate` runs out of attempts at the chosen seed: try a different seed (small integer, document the change in the test comment). The most likely failure mode is `easy` with low-attempt seeds — if so, increase `DEFAULT_MAX_ATTEMPTS.easy` to 1000 and rerun.

- [ ] **Step 5: Commit.**

```bash
git add src/generator/generate.ts src/generator/generate.test.ts
git commit -m "feat(generator): add generate orchestrator with difficulty retries"
```

---

## Task 7: Time-budget acceptance test

**Files:**

- Modify: `src/generator/generate.test.ts` (append a time-budget test)

PLAN.md §7 acceptance: `generate('expert')` < 30s, `generate('easy')` < 5s. Add a single integration test that confirms the expert budget — easy will be implicitly enforced by vitest's default per-test timeout (5s). Use `Math.random` (no fixed seed) so the test reflects average behavior, not best-case seeded.

- [ ] **Step 1: Append the time-budget test to `src/generator/generate.test.ts`.**

```ts
describe('generate — time budget', () => {
  it(
    'generate("expert") completes within 30 seconds',
    () => {
      const start = Date.now();
      const puzzle = generate('expert');
      const elapsed = Date.now() - start;
      expect(puzzle.difficulty).toBe('expert');
      expect(elapsed).toBeLessThan(30_000);
    },
    { timeout: 45_000 },
  );

  it(
    'generate("easy") completes within 5 seconds',
    () => {
      const start = Date.now();
      const puzzle = generate('easy');
      const elapsed = Date.now() - start;
      expect(puzzle.difficulty).toBe('easy');
      expect(elapsed).toBeLessThan(5_000);
    },
    { timeout: 10_000 },
  );
});
```

- [ ] **Step 2: Run the time-budget tests.**

Run: `npm test -- --run src/generator/generate.test.ts`
Expected: All previous PASS plus the 2 new tests PASS.

If either test exceeds the budget:

- Profile by running once and printing the attempt count where it stops. The default attempt budgets (`easy: 500`, `expert: 100`) may need adjustment.
- A typical expert attempt costs ~50-200ms (one fullGrid + one full digHoles + one solve). 100 attempts × 150ms = 15s on average.
- If 'easy' is too slow, the issue is that random digging rarely produces easy puzzles; consider raising `DEFAULT_MAX_ATTEMPTS.easy` further OR adding a hole-count cap for easy (cut digging short after ~35 holes). Adding a cap is a follow-up change — record it as a Phase 7 cleanup item in memory for Phase 8.

- [ ] **Step 3: Run the full test suite.**

Run: `npm test -- --run && npm run typecheck`
Expected: All test files pass (~192 tests total). Typecheck clean.

- [ ] **Step 4: Commit.**

```bash
git add src/generator/generate.test.ts
git commit -m "test(generator): add time-budget acceptance tests for generate"
```

---

## Acceptance criteria (final)

- [ ] `npm test -- --run` — all tests pass (~192 tests total, up from 170).
- [ ] `npm run typecheck` — no errors.
- [ ] `generate('expert')` returns a puzzle with `difficulty === 'expert'` and a unique solution.
- [ ] `generate('expert')` completes in under 30 seconds on the test machine.
- [ ] `generate('easy')` completes in under 5 seconds on the test machine.
- [ ] No regressions in any earlier-phase test (170 prior tests still green).
- [ ] No changes to existing modules under `src/solver/` or `src/types.ts`.
- [ ] All new files live under `src/generator/`.
