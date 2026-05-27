# Phase 6: Expert Techniques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five expert-tier solver technique detectors (`swordfish`, `xyWing`, `xyzWing`, `uniqueRectangle`, `coloring`), extract a shared fish-pattern scanner from `xWing`, and verify the solver handles a curated expert puzzle.

**Architecture:** Each new detector is a pure `TechniqueDetector` returning the first applicable elimination-only step (placements stay empty; downstream singles will pick them up on the next solver pass). `swordfish` is built atop a shared `scanFish(degree)` helper that also subsumes the existing `xWing`. `xyWing` and `xyzWing` use the `peersOf` lookup from `units.ts` for chain construction. `uniqueRectangle` implements Type 1 only (3 corners with `{a,b}` floor pair, 1 roof corner with `{a,b,...extras}`, spanning exactly 2 boxes — eliminate `a,b` from the roof). `coloring` is simple 2-color singles-chains on bi-location digits, covering both color-trap and color-wrap eliminations.

**Tech Stack:** No new dependencies. Builds on Phase 2–5 primitives. Existing `cellsWithDigit` from `src/solver/techniques/shared.ts` is reused. Existing `peersOf` from `src/solver/units.ts` is reused (verified in Task 0).

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design notes — locked in before tasks:**

- **Elimination-only steps.** All Phase 6 detectors return steps with `placements: []` and a non-empty `eliminations` array. If a pattern exists but produces zero eliminations, the detector returns `null`.
- **Determinism.** Each detector scans in a fixed order (digits 1→9, rows before cols, ascending coordinates). Return the first applicable step, then exit.
- **Registry order after Phase 6 (easiest-first within tier):** `[nakedSingle, hiddenSingle, nakedPair, nakedTriple, hiddenPair, hiddenTriple, pointingPair, nakedQuad, hiddenQuad, boxLineReduction, xWing, swordfish, xyWing, xyzWing, uniqueRectangle, coloring]`. Each new technique is registered at the end of the task that adds it.
- **Test fixture discipline.** Detector tests must place the intended pattern in the FIRST-scanned unit/cell so an unrelated earlier-scan pattern can't fire first. Default to row 0 / column 0 / box 0. For each fixture, mentally walk through every (earlier-unit × every-digit) combination and verify no accidental pattern fires. See [[feedback-detector-test-fixtures]] in memory for context.
- **`xWing` refactor preserves behavior.** Task 1 rewrites `xWing.ts` as a thin wrapper over `scanFish(degree=2)`. All 5 existing `xWing.test.ts` cases must stay green with byte-identical step output (technique name, highlight set, elimination list, explanation string format).
- **No changes to `solve.ts`.** The solver loop at `src/solver/solve.ts:25-72` already correctly applies `step.eliminations`. Verify by reading the file before Task 1.
- **No Phase 5 cleanup in this phase.** Per design decision, items from `memory/project_sudoku_phase5.md` (hiddenQuad explanation assertion, pointingPair → `cellsWithDigit` migration, broader integration puzzle coverage) are deferred.
- **Out-of-scope variants (explicitly excluded):** jellyfish (degree-4 fish), UR Types 2–6, multi-coloring. The shared `scanFish` will support `degree=4` for free but no `jellyfish` detector is wired in.

---

## Task 0: Sanity check — verify baseline and `peersOf`

**Files:**

- Read: `src/solver/solve.ts`
- Read: `src/solver/units.ts`
- Read: `src/solver/techniques/xWing.ts`
- Read: `src/solver/techniques/index.ts`

This task does NOT modify any file. It confirms three things before Phase 6 work begins:

1. The solver loop already applies eliminations correctly (no `solve.ts` changes needed).
2. `peersOf(coord)` returns the 20 unique peer cells of a given coord (8 in row, 8 in column, 8 in box, with row/col/box overlaps deduped).
3. The current `xWing.ts` matches the structure Task 1 will refactor.

- [ ] **Step 1: Run the test suite to confirm baseline**

Run: `npm test -- --run`
Expected: 17 test files pass, 138 tests pass.

- [ ] **Step 2: Read `src/solver/solve.ts`** and confirm:

The loop at lines 30–63 iterates `ALL_TECHNIQUES`, calls each detector, and applies its `placements` and `eliminations` immutably. No changes required for Phase 6.

- [ ] **Step 3: Read `src/solver/units.ts`** and confirm `peersOf` signature:

```ts
export function peersOf(coord: CellCoord): CellCoord[];
```

Returns 20 cells (deduped union of row, column, and box, excluding `coord` itself). Used by xyWing/xyzWing/coloring/uniqueRectangle in later tasks.

- [ ] **Step 4: Add a quick assertion test** to `src/solver/units.test.ts` to lock in `peersOf` behavior (only if no equivalent assertion exists — read the file first).

Read `src/solver/units.test.ts`. If it already asserts `peersOf({row:0,col:0}).length === 20`, skip this step. Otherwise add:

```ts
it('peersOf returns 20 unique deduped peers for any cell', () => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const peers = peersOf({ row: r, col: c });
      expect(peers.length).toBe(20);
      const keys = new Set(peers.map((p) => `${p.row},${p.col}`));
      expect(keys.size).toBe(20);
      expect(keys.has(`${r},${c}`)).toBe(false);
    }
  }
});
```

Run: `npm test -- --run src/solver/units.test.ts`
Expected: PASS (test count grows by 1 if added).

- [ ] **Step 5: Commit if anything changed**

```bash
git add src/solver/units.test.ts
git commit -m "test(solver): lock peersOf invariants before Phase 6"
```

(Skip the commit if no file changed.)

---

## Task 1: Extract `scanFish` shared helper and refactor `xWing`

**Files:**

- Create: `src/solver/techniques/fish.ts`
- Create: `src/solver/techniques/fish.test.ts`
- Modify: `src/solver/techniques/xWing.ts` (rewrite as thin wrapper)

`scanFish(state, digit, degree, technique)` finds an N-fish on `digit`: `N` rows where the digit's column-set (in those rows) is contained within exactly `N` columns. The eliminations are the digit's other appearances in those columns (rows outside the fish set). Symmetric for the column-direction.

A "fish row" is a row where the digit's candidate-column count is between 2 and `degree` (inclusive). A degenerate row with exactly 1 candidate column is excluded — it would already be solved by a single, and including it bloats combinations without changing eliminations.

- [ ] **Step 1: Write `src/solver/techniques/fish.test.ts` first (RED).**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { scanFish } from './fish';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('scanFish', () => {
  it('returns null on an empty board for any degree', () => {
    expect(scanFish(emptyState(), 5, 2, 'xWing')).toBeNull();
    expect(scanFish(emptyState(), 5, 3, 'swordfish')).toBeNull();
  });

  it('degree=2 finds a row-pattern X-Wing', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    state.candidates[3]![0] = new Set<Digit>([5, 2]);
    state.candidates[3]![4] = new Set<Digit>([5, 8]);
    for (const r of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([5, 1]);
      state.candidates[r]![4] = new Set<Digit>([5, 2]);
      state.candidates[r]![3] = new Set<Digit>([5, 7]);
    }
    const step = scanFish(state, 5, 2, 'xWing');
    expect(step?.technique).toBe('xWing');
    expect(step?.eliminations.length).toBe(14);
  });

  it('degree=3 finds a row-pattern Swordfish', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Three rows where digit 4 appears in columns drawn from {0, 3, 6}.
    // Row 0: cols 0 and 3. Row 1: cols 3 and 6. Row 2: cols 0 and 6.
    state.candidates[0]![0] = new Set<Digit>([4, 1]);
    state.candidates[0]![3] = new Set<Digit>([4, 2]);
    state.candidates[1]![3] = new Set<Digit>([4, 5]);
    state.candidates[1]![6] = new Set<Digit>([4, 8]);
    state.candidates[2]![0] = new Set<Digit>([4, 9]);
    state.candidates[2]![6] = new Set<Digit>([4, 7]);
    // Outside rows 0-2: digit 4 in columns 0, 3, 6 is eliminable.
    // Outside-row cells get a "noise" column too so they aren't pattern rows.
    for (const r of [3, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([4, 1]);
      state.candidates[r]![3] = new Set<Digit>([4, 2]);
      state.candidates[r]![6] = new Set<Digit>([4, 5]);
      state.candidates[r]![8] = new Set<Digit>([4, 7]);
    }
    const step = scanFish(state, 4, 3, 'swordfish');
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('swordfish');
    // 3 columns × 6 outside rows = 18 elimination opportunities.
    expect(step?.eliminations.length).toBe(18);
    expect(step?.highlights.length).toBe(6);
  });

  it('degree=2 returns null when only one row has the digit in two cells', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    expect(scanFish(state, 5, 2, 'xWing')).toBeNull();
  });

  it('degree=2 returns null when matching pattern produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5]);
    state.candidates[0]![4] = new Set<Digit>([5]);
    state.candidates[3]![0] = new Set<Digit>([5]);
    state.candidates[3]![4] = new Set<Digit>([5]);
    expect(scanFish(state, 5, 2, 'xWing')).toBeNull();
  });

  it('finds a column-direction fish (transpose of row case)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([6, 7]);
    state.candidates[4]![0] = new Set<Digit>([6, 8]);
    state.candidates[0]![5] = new Set<Digit>([6, 1]);
    state.candidates[4]![5] = new Set<Digit>([6, 2]);
    for (const r of [1, 2, 3, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([6, 1]);
      state.candidates[r]![5] = new Set<Digit>([6, 2]);
      state.candidates[r]![3] = new Set<Digit>([6, 7]);
    }
    const step = scanFish(state, 6, 2, 'xWing');
    expect(step?.technique).toBe('xWing');
    expect(step?.eliminations.length).toBe(14);
  });
});
```

- [ ] **Step 2: Run tests to verify RED.**

Run: `npm test -- --run src/solver/techniques/fish.test.ts`
Expected: FAIL — `scanFish` not exported from `./fish` (module not found).

- [ ] **Step 3: Create `src/solver/techniques/fish.ts`** with the implementation:

```ts
import type { CellCoord, Digit } from '../../types';
import type { Elimination, SolverState, Step, TechniqueName } from '../types';

const SIZE = 9;

function colsOfDigitInRow(state: SolverState, row: number, digit: Digit): number[] {
  const out: number[] = [];
  for (let c = 0; c < SIZE; c++) {
    if (state.values[row]![c] !== null) continue;
    if (state.candidates[row]![c]!.has(digit)) out.push(c);
  }
  return out;
}

function rowsOfDigitInCol(state: SolverState, col: number, digit: Digit): number[] {
  const out: number[] = [];
  for (let r = 0; r < SIZE; r++) {
    if (state.values[r]![col] !== null) continue;
    if (state.candidates[r]![col]!.has(digit)) out.push(r);
  }
  return out;
}

/** Enumerate ascending-index combinations of `indices` taken `k` at a time. */
function* combinations(indices: number[], k: number): Generator<number[]> {
  const n = indices.length;
  if (k > n || k <= 0) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map((i) => indices[i]!);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]!++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1]! + 1;
  }
}

function scanRowFish(
  state: SolverState,
  digit: Digit,
  degree: number,
  technique: TechniqueName,
): Step | null {
  // Candidate rows: 2..degree cols carrying the digit.
  const rowCols = new Map<number, number[]>();
  for (let r = 0; r < SIZE; r++) {
    const cols = colsOfDigitInRow(state, r, digit);
    if (cols.length >= 2 && cols.length <= degree) rowCols.set(r, cols);
  }
  const candidateRows = Array.from(rowCols.keys()).sort((a, b) => a - b);
  for (const rows of combinations(candidateRows, degree)) {
    const unionCols = new Set<number>();
    for (const r of rows) for (const c of rowCols.get(r)!) unionCols.add(c);
    if (unionCols.size !== degree) continue;

    const fishRowSet = new Set(rows);
    const cols = Array.from(unionCols).sort((a, b) => a - b);
    const eliminations: Elimination[] = [];
    for (const c of cols) {
      for (let r = 0; r < SIZE; r++) {
        if (fishRowSet.has(r)) continue;
        if (state.values[r]![c] !== null) continue;
        if (state.candidates[r]![c]!.has(digit)) {
          eliminations.push({ cell: { row: r, col: c }, digit });
        }
      }
    }
    if (eliminations.length === 0) continue;

    const highlights: CellCoord[] = [];
    for (const r of rows) for (const c of rowCols.get(r)!) highlights.push({ row: r, col: c });

    return {
      technique,
      highlights,
      placements: [],
      eliminations,
      explanation:
        technique === 'xWing'
          ? `Digit ${digit} forms an X-Wing on rows ${rows.map((x) => x + 1).join(' and ')} in columns ${cols.map((x) => x + 1).join(' and ')}; it can be eliminated from those columns in other rows.`
          : `Digit ${digit} forms a ${technique} on rows ${rows.map((x) => x + 1).join(', ')} in columns ${cols.map((x) => x + 1).join(', ')}; it can be eliminated from those columns in other rows.`,
    };
  }
  return null;
}

function scanColFish(
  state: SolverState,
  digit: Digit,
  degree: number,
  technique: TechniqueName,
): Step | null {
  const colRows = new Map<number, number[]>();
  for (let c = 0; c < SIZE; c++) {
    const rows = rowsOfDigitInCol(state, c, digit);
    if (rows.length >= 2 && rows.length <= degree) colRows.set(c, rows);
  }
  const candidateCols = Array.from(colRows.keys()).sort((a, b) => a - b);
  for (const cols of combinations(candidateCols, degree)) {
    const unionRows = new Set<number>();
    for (const c of cols) for (const r of colRows.get(c)!) unionRows.add(r);
    if (unionRows.size !== degree) continue;

    const fishColSet = new Set(cols);
    const rows = Array.from(unionRows).sort((a, b) => a - b);
    const eliminations: Elimination[] = [];
    for (const r of rows) {
      for (let c = 0; c < SIZE; c++) {
        if (fishColSet.has(c)) continue;
        if (state.values[r]![c] !== null) continue;
        if (state.candidates[r]![c]!.has(digit)) {
          eliminations.push({ cell: { row: r, col: c }, digit });
        }
      }
    }
    if (eliminations.length === 0) continue;

    const highlights: CellCoord[] = [];
    for (const c of cols) for (const r of colRows.get(c)!) highlights.push({ row: r, col: c });

    return {
      technique,
      highlights,
      placements: [],
      eliminations,
      explanation:
        technique === 'xWing'
          ? `Digit ${digit} forms an X-Wing on columns ${cols.map((x) => x + 1).join(' and ')} in rows ${rows.map((x) => x + 1).join(' and ')}; it can be eliminated from those rows in other columns.`
          : `Digit ${digit} forms a ${technique} on columns ${cols.map((x) => x + 1).join(', ')} in rows ${rows.map((x) => x + 1).join(', ')}; it can be eliminated from those rows in other columns.`,
    };
  }
  return null;
}

export function scanFish(
  state: SolverState,
  digit: Digit,
  degree: number,
  technique: TechniqueName,
): Step | null {
  return (
    scanRowFish(state, digit, degree, technique) ?? scanColFish(state, digit, degree, technique)
  );
}
```

- [ ] **Step 4: Run fish tests to verify GREEN.**

Run: `npm test -- --run src/solver/techniques/fish.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Rewrite `src/solver/techniques/xWing.ts`** as a thin wrapper:

```ts
import type { Digit } from '../../types';
import type { SolverState, Step, TechniqueDetector } from '../types';
import { scanFish } from './fish';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const xWing: TechniqueDetector = (state: SolverState): Step | null => {
  for (const digit of DIGITS) {
    const step = scanFish(state, digit, 2, 'xWing');
    if (step) return step;
  }
  return null;
};
```

- [ ] **Step 6: Run the full suite to verify xWing parity.**

Run: `npm test -- --run`
Expected: All 138 + new fish tests pass. The 5 xWing.test.ts cases must remain green (the refactor must not regress behavior).

If an xWing test fails: read the failure, compare with the new `scanFish` output, and adjust `fish.ts` until xWing.test.ts is byte-equivalent. Do NOT modify xWing.test.ts.

- [ ] **Step 7: Commit.**

```bash
git add src/solver/techniques/fish.ts src/solver/techniques/fish.test.ts src/solver/techniques/xWing.ts
git commit -m "refactor(solver): extract scanFish helper, rewrite xWing as degree-2 fish"
```

---

## Task 2: Swordfish detector

**Files:**

- Create: `src/solver/techniques/swordfish.ts`
- Create: `src/solver/techniques/swordfish.test.ts`
- Modify: `src/solver/techniques/index.ts` (append `swordfish` to `ALL_TECHNIQUES`)

Swordfish is a 3-row (or 3-column) fish. The shared `scanFish` already implements it; this task is mostly the wrapper, the registry change, and a focused test file proving swordfish-specific behavior.

- [ ] **Step 1: Write `src/solver/techniques/swordfish.test.ts` first (RED).**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { swordfish } from './swordfish';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('swordfish', () => {
  it('returns null on an empty board', () => {
    expect(swordfish(emptyState())).toBeNull();
  });

  it('finds a row-pattern swordfish on digit 4', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Rows 0/1/2 collectively span cols {0,3,6} for digit 4.
    state.candidates[0]![0] = new Set<Digit>([4, 1]);
    state.candidates[0]![3] = new Set<Digit>([4, 2]);
    state.candidates[1]![3] = new Set<Digit>([4, 5]);
    state.candidates[1]![6] = new Set<Digit>([4, 8]);
    state.candidates[2]![0] = new Set<Digit>([4, 9]);
    state.candidates[2]![6] = new Set<Digit>([4, 7]);
    // Outside rows: digit 4 in cols 0, 3, 6 is eliminable. Add a 4th column so
    // outside rows don't themselves become pattern rows.
    for (const r of [3, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([4, 1]);
      state.candidates[r]![3] = new Set<Digit>([4, 2]);
      state.candidates[r]![6] = new Set<Digit>([4, 5]);
      state.candidates[r]![8] = new Set<Digit>([4, 7]);
    }
    const step = swordfish(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('swordfish');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations.length).toBe(18);
    // The explanation should reference the three rows and three columns.
    expect(step?.explanation).toContain('rows 1, 2, 3');
    expect(step?.explanation).toContain('columns 1, 4, 7');
  });

  it('does not match when the union covers more than 3 columns', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 1]);
    state.candidates[0]![3] = new Set<Digit>([4, 2]);
    state.candidates[1]![3] = new Set<Digit>([4, 5]);
    state.candidates[1]![6] = new Set<Digit>([4, 8]);
    state.candidates[2]![0] = new Set<Digit>([4, 9]);
    state.candidates[2]![7] = new Set<Digit>([4, 7]); // col 7 breaks the 3-col union
    expect(swordfish(state)).toBeNull();
  });

  it('does not double-fire as an xWing', () => {
    // A pattern that satisfies xWing should NOT be reported by swordfish.
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    state.candidates[3]![0] = new Set<Digit>([5, 2]);
    state.candidates[3]![4] = new Set<Digit>([5, 8]);
    for (const r of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([5, 1]);
      state.candidates[r]![4] = new Set<Digit>([5, 2]);
      state.candidates[r]![3] = new Set<Digit>([5, 7]);
    }
    expect(swordfish(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify RED.**

Run: `npm test -- --run src/solver/techniques/swordfish.test.ts`
Expected: FAIL — `swordfish` not exported.

- [ ] **Step 3: Create `src/solver/techniques/swordfish.ts`.**

```ts
import type { Digit } from '../../types';
import type { SolverState, Step, TechniqueDetector } from '../types';
import { scanFish } from './fish';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const swordfish: TechniqueDetector = (state: SolverState): Step | null => {
  for (const digit of DIGITS) {
    const step = scanFish(state, digit, 3, 'swordfish');
    if (step) return step;
  }
  return null;
};
```

- [ ] **Step 4: Update `src/solver/techniques/index.ts`** — add the import and append to `ALL_TECHNIQUES`:

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';
import { hiddenPair } from './hiddenPair';
import { hiddenTriple } from './hiddenTriple';
import { pointingPair } from './pointingPair';
import { nakedQuad } from './nakedQuad';
import { hiddenQuad } from './hiddenQuad';
import { boxLineReduction } from './boxLineReduction';
import { xWing } from './xWing';
import { swordfish } from './swordfish';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
  hiddenTriple,
  pointingPair,
  nakedQuad,
  hiddenQuad,
  boxLineReduction,
  xWing,
  swordfish,
];
```

- [ ] **Step 5: Run the full suite.**

Run: `npm test -- --run`
Expected: All tests pass; swordfish.test.ts contributes 4 new tests.

- [ ] **Step 6: Commit.**

```bash
git add src/solver/techniques/swordfish.ts src/solver/techniques/swordfish.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add swordfish detector"
```

---

## Task 3: xyWing detector

**Files:**

- Create: `src/solver/techniques/xyWing.ts`
- Create: `src/solver/techniques/xyWing.test.ts`
- Modify: `src/solver/techniques/index.ts` (append `xyWing`)

**Y-Wing algorithm:**

A Y-Wing is a 3-cell chain: a bi-value **pivot** cell with candidates `{X, Y}`, plus two bi-value **wings** that are peers of the pivot, with candidates `{X, Z}` and `{Y, Z}` respectively. The shared digit between the wings (`Z`) can be eliminated from any cell that is a peer of BOTH wings (excluding the pivot and the wings themselves).

**Scan order:**

1. Iterate each empty cell with exactly 2 candidates as the pivot.
2. For each pair `(X, Y)` of pivot candidates, look at the pivot's peers that are bi-value and contain exactly one of `{X, Y}` plus a third digit `Z` not in `{X, Y}`. Two such peers — one carrying `X` and one carrying `Y`, both sharing the same `Z` — form the wings.
3. Compute eliminations: cells that are peers of BOTH wings, are not the pivot, and currently have `Z` as a candidate.
4. Return the first wing pair that yields non-empty eliminations.

**Determinism:** iterate pivots in row-major order, wings sorted by `(row, col)`. Try `(X, Y)` orderings consistently — since `X` and `Y` are symmetric, just iterate the two pivot candidates in sorted order and assign the first as `X`, second as `Y`; the wing labelled "X-wing" must contain `X`.

- [ ] **Step 1: Write `src/solver/techniques/xyWing.test.ts` first (RED).**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { xyWing } from './xyWing';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('xyWing', () => {
  it('returns null on an empty board', () => {
    expect(xyWing(emptyState())).toBeNull();
  });

  it('finds a Y-Wing with pivot in box 0, wings in row and column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Pivot at (0,0) = {1,2}.
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    // Wing in same row (peer): (0,5) = {1,3}.
    state.candidates[0]![5] = new Set<Digit>([1, 3]);
    // Wing in same column (peer): (5,0) = {2,3}.
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    // Cell (5,5) sees BOTH wings (row 5 and col 5). Contains 3 as candidate.
    state.candidates[5]![5] = new Set<Digit>([3, 7]);
    const step = xyWing(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('xyWing');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations).toContainEqual({ cell: { row: 5, col: 5 }, digit: 3 });
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 5 },
        { row: 5, col: 0 },
      ]),
    );
    expect(step?.explanation).toContain('3');
  });

  it('does not fire when no cell sees both wings', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Same pivot/wing config as above, but no cell with Z=3 visible to both wings.
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![5] = new Set<Digit>([1, 3]);
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    // (5,5) does NOT have digit 3 as a candidate.
    state.candidates[5]![5] = new Set<Digit>([4, 7]);
    expect(xyWing(state)).toBeNull();
  });

  it('does not fire when pivot is tri-value (would be xyzWing territory)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 3]); // not bi-value
    state.candidates[0]![5] = new Set<Digit>([1, 3]);
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    state.candidates[5]![5] = new Set<Digit>([3, 7]);
    expect(xyWing(state)).toBeNull();
  });

  it('does not fire when a wing is not bi-value', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![5] = new Set<Digit>([1, 3, 9]); // tri-value wing
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    state.candidates[5]![5] = new Set<Digit>([3, 7]);
    expect(xyWing(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify RED.**

Run: `npm test -- --run src/solver/techniques/xyWing.test.ts`
Expected: FAIL — `xyWing` not exported.

- [ ] **Step 3: Create `src/solver/techniques/xyWing.ts`.**

```ts
import type { CellCoord, Digit } from '../../types';
import { peersOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type BiValue = { coord: CellCoord; digits: [Digit, Digit] };

function biValueCells(state: SolverState): BiValue[] {
  const out: BiValue[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const cand = state.candidates[r]![c]!;
      if (cand.size !== 2) continue;
      const sorted = Array.from(cand).sort((a, b) => a - b) as [Digit, Digit];
      out.push({ coord: { row: r, col: c }, digits: sorted });
    }
  }
  return out;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

export const xyWing: TechniqueDetector = (state: SolverState): Step | null => {
  const bivals = biValueCells(state);
  const byKey = new Map<string, BiValue>();
  for (const b of bivals) byKey.set(`${b.coord.row},${b.coord.col}`, b);

  for (const pivot of bivals) {
    const [X, Y] = pivot.digits;
    // Find bi-value peers of pivot.
    const peers = peersOf(pivot.coord);
    const peerBivals: BiValue[] = [];
    for (const p of peers) {
      const bv = byKey.get(`${p.row},${p.col}`);
      if (bv) peerBivals.push(bv);
    }
    // Look for wing pair (wingX with {X,Z}, wingY with {Y,Z}) where Z is the same.
    for (const wingX of peerBivals) {
      const wxDigits = wingX.digits;
      // wingX must contain X but not Y.
      let z: Digit | null = null;
      if (wxDigits[0] === X && wxDigits[1] !== Y) z = wxDigits[1];
      else if (wxDigits[1] === X && wxDigits[0] !== Y) z = wxDigits[0];
      if (z === null) continue;
      const Z = z;
      for (const wingY of peerBivals) {
        if (sameCell(wingY.coord, wingX.coord)) continue;
        const wyDigits = wingY.digits;
        // wingY must contain Y and Z, not X.
        const hasY = wyDigits[0] === Y || wyDigits[1] === Y;
        const hasZ = wyDigits[0] === Z || wyDigits[1] === Z;
        const hasX = wyDigits[0] === X || wyDigits[1] === X;
        if (!hasY || !hasZ || hasX) continue;
        // Compute eliminations: cells that are peers of BOTH wings, currently hold Z.
        const elimCells: CellCoord[] = [];
        const wxPeers = peersOf(wingX.coord);
        const wxPeerKeys = new Set(wxPeers.map((p) => `${p.row},${p.col}`));
        const wyPeers = peersOf(wingY.coord);
        for (const p of wyPeers) {
          if (!wxPeerKeys.has(`${p.row},${p.col}`)) continue;
          if (sameCell(p, pivot.coord)) continue;
          if (sameCell(p, wingX.coord) || sameCell(p, wingY.coord)) continue;
          if (state.values[p.row]![p.col] !== null) continue;
          if (state.candidates[p.row]![p.col]!.has(Z)) elimCells.push(p);
        }
        if (elimCells.length === 0) continue;
        const eliminations: Elimination[] = elimCells.map((cell) => ({ cell, digit: Z }));
        return {
          technique: 'xyWing',
          highlights: [pivot.coord, wingX.coord, wingY.coord],
          placements: [],
          eliminations,
          explanation: `Y-Wing: pivot (${pivot.coord.row + 1}, ${pivot.coord.col + 1}) with {${X},${Y}}, wings (${wingX.coord.row + 1}, ${wingX.coord.col + 1}) with {${X},${Z}} and (${wingY.coord.row + 1}, ${wingY.coord.col + 1}) with {${Y},${Z}} — digit ${Z} can be eliminated from cells seeing both wings.`,
        };
      }
    }
  }
  return null;
};
```

- [ ] **Step 4: Update `src/solver/techniques/index.ts`** — add the import and append `xyWing` after `swordfish`:

```ts
import { xyWing } from './xyWing';

// ... in ALL_TECHNIQUES, after swordfish:
  swordfish,
  xyWing,
```

(Add the import line near the others; add `xyWing,` to the array immediately after `swordfish,`.)

- [ ] **Step 5: Run the full suite.**

Run: `npm test -- --run`
Expected: All previous tests pass; xyWing.test.ts contributes 4 new tests, all PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/solver/techniques/xyWing.ts src/solver/techniques/xyWing.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add xyWing (Y-Wing) detector"
```

---

## Task 4: xyzWing detector

**Files:**

- Create: `src/solver/techniques/xyzWing.ts`
- Create: `src/solver/techniques/xyzWing.test.ts`
- Modify: `src/solver/techniques/index.ts` (append `xyzWing`)

**XYZ-Wing algorithm:**

Like Y-Wing, but the pivot is **tri-value** `{X, Y, Z}` (not bi-value), and the two wings are bi-value `{X, Z}` and `{Y, Z}`. Because the pivot itself contributes a copy of `Z`, eliminations of `Z` must see the pivot AND both wings (one extra constraint vs. Y-Wing).

**Scan:**

1. Iterate each empty tri-value cell as pivot.
2. For each pair of pivot candidates `(X, Y)` (3 pairs total: `(X,Y)`, `(X,Z)`, `(Y,Z)` of the tri-value), the third digit is `Z`.
3. Look for bi-value peers `{X, Z}` and `{Y, Z}`. Same algorithm shape as xyWing.
4. Eliminations of `Z` must be peers of pivot AND both wings (the intersection of all three peer sets).

- [ ] **Step 1: Write `src/solver/techniques/xyzWing.test.ts` first (RED).**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { xyzWing } from './xyzWing';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('xyzWing', () => {
  it('returns null on an empty board', () => {
    expect(xyzWing(emptyState())).toBeNull();
  });

  it('finds an XYZ-Wing: pivot {1,2,3}, wings {1,3} and {2,3} in the same box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Pivot at (0,0) = {1,2,3}.
    state.candidates[0]![0] = new Set<Digit>([1, 2, 3]);
    // Wing in same row: (0,1) = {1,3}.
    state.candidates[0]![1] = new Set<Digit>([1, 3]);
    // Wing in same column: (1,0) = {2,3}.
    state.candidates[1]![0] = new Set<Digit>([2, 3]);
    // Cell (1,1) sees pivot (box 0), wing (0,1) (col 1), wing (1,0) (row 1). Has digit 3.
    state.candidates[1]![1] = new Set<Digit>([3, 7]);
    const step = xyzWing(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('xyzWing');
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 1 }, digit: 3 });
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ]),
    );
  });

  it('does not fire when pivot is bi-value (Y-Wing territory)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]); // bi-value, not tri
    state.candidates[0]![1] = new Set<Digit>([1, 3]);
    state.candidates[1]![0] = new Set<Digit>([2, 3]);
    state.candidates[1]![1] = new Set<Digit>([3, 7]);
    expect(xyzWing(state)).toBeNull();
  });

  it('does not fire when no cell sees the pivot AND both wings', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Pivot (4,4) — center of board.
    state.candidates[4]![4] = new Set<Digit>([1, 2, 3]);
    // Wing in row 4: (4,0) = {1,3}.
    state.candidates[4]![0] = new Set<Digit>([1, 3]);
    // Wing in col 4: (0,4) = {2,3}.
    state.candidates[0]![4] = new Set<Digit>([2, 3]);
    // No cell sees pivot AND both wings simultaneously (wings are far apart, only pivot bridges them).
    // (0,0) sees wing (0,4)? Yes (row 0). Sees wing (4,0)? Yes (col 0). Sees pivot (4,4)? No.
    // So no valid common-peer cell exists with digit 3 except possibly the wings themselves.
    state.candidates[0]![0] = new Set<Digit>([3, 7]);
    expect(xyzWing(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify RED.**

Run: `npm test -- --run src/solver/techniques/xyzWing.test.ts`
Expected: FAIL — `xyzWing` not exported.

- [ ] **Step 3: Create `src/solver/techniques/xyzWing.ts`.**

```ts
import type { CellCoord, Digit } from '../../types';
import { peersOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type BiValue = { coord: CellCoord; digits: [Digit, Digit] };

function biValueCells(state: SolverState): BiValue[] {
  const out: BiValue[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const cand = state.candidates[r]![c]!;
      if (cand.size !== 2) continue;
      const sorted = Array.from(cand).sort((a, b) => a - b) as [Digit, Digit];
      out.push({ coord: { row: r, col: c }, digits: sorted });
    }
  }
  return out;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

export const xyzWing: TechniqueDetector = (state: SolverState): Step | null => {
  const bivals = biValueCells(state);
  const byKey = new Map<string, BiValue>();
  for (const b of bivals) byKey.set(`${b.coord.row},${b.coord.col}`, b);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const pivotCand = state.candidates[r]![c]!;
      if (pivotCand.size !== 3) continue;
      const pivotCoord: CellCoord = { row: r, col: c };
      const pivotDigits = Array.from(pivotCand).sort((a, b) => a - b) as [Digit, Digit, Digit];

      // Look at bi-value peers of pivot.
      const peers = peersOf(pivotCoord);
      const peerBivals: BiValue[] = [];
      for (const p of peers) {
        const bv = byKey.get(`${p.row},${p.col}`);
        if (bv) peerBivals.push(bv);
      }

      // For each choice of Z (the shared "wing" digit), the wings are {X,Z} and {Y,Z}.
      for (const Z of pivotDigits) {
        const others = pivotDigits.filter((d) => d !== Z) as [Digit, Digit];
        const [X, Y] = others;
        // Find a wing carrying {X, Z}.
        const wingXCandidates = peerBivals.filter(
          (b) =>
            (b.digits[0] === X && b.digits[1] === Z) || (b.digits[0] === Z && b.digits[1] === X),
        );
        const wingYCandidates = peerBivals.filter(
          (b) =>
            (b.digits[0] === Y && b.digits[1] === Z) || (b.digits[0] === Z && b.digits[1] === Y),
        );
        for (const wingX of wingXCandidates) {
          for (const wingY of wingYCandidates) {
            if (sameCell(wingX.coord, wingY.coord)) continue;
            // Eliminations of Z: cells that are peers of pivot AND wingX AND wingY,
            // not equal to any of them, currently holding Z.
            const pivotPeerKeys = new Set(peers.map((p) => `${p.row},${p.col}`));
            const wxPeerKeys = new Set(peersOf(wingX.coord).map((p) => `${p.row},${p.col}`));
            const wyPeers = peersOf(wingY.coord);
            const elimCells: CellCoord[] = [];
            for (const p of wyPeers) {
              const key = `${p.row},${p.col}`;
              if (!pivotPeerKeys.has(key)) continue;
              if (!wxPeerKeys.has(key)) continue;
              if (sameCell(p, pivotCoord)) continue;
              if (sameCell(p, wingX.coord) || sameCell(p, wingY.coord)) continue;
              if (state.values[p.row]![p.col] !== null) continue;
              if (state.candidates[p.row]![p.col]!.has(Z)) elimCells.push(p);
            }
            if (elimCells.length === 0) continue;
            const eliminations: Elimination[] = elimCells.map((cell) => ({ cell, digit: Z }));
            return {
              technique: 'xyzWing',
              highlights: [pivotCoord, wingX.coord, wingY.coord],
              placements: [],
              eliminations,
              explanation: `XYZ-Wing: pivot (${pivotCoord.row + 1}, ${pivotCoord.col + 1}) with {${X},${Y},${Z}}, wings (${wingX.coord.row + 1}, ${wingX.coord.col + 1}) with {${X},${Z}} and (${wingY.coord.row + 1}, ${wingY.coord.col + 1}) with {${Y},${Z}} — digit ${Z} can be eliminated from cells seeing pivot and both wings.`,
            };
          }
        }
      }
    }
  }
  return null;
};
```

- [ ] **Step 4: Update `src/solver/techniques/index.ts`** — add import and append `xyzWing` after `xyWing`:

```ts
import { xyzWing } from './xyzWing';

// ... in ALL_TECHNIQUES, after xyWing:
  xyWing,
  xyzWing,
```

- [ ] **Step 5: Run the full suite.**

Run: `npm test -- --run`
Expected: All previous tests pass; xyzWing.test.ts contributes 4 new tests, all PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/solver/techniques/xyzWing.ts src/solver/techniques/xyzWing.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add xyzWing detector"
```

---

## Task 5: uniqueRectangle (Type 1) detector

**Files:**

- Create: `src/solver/techniques/uniqueRectangle.ts`
- Create: `src/solver/techniques/uniqueRectangle.test.ts`
- Modify: `src/solver/techniques/index.ts` (append `uniqueRectangle`)

**UR Type 1 algorithm:**

1. Enumerate rectangle corner-sets: pick rows `r1 < r2` and cols `c1 < c2`. The 4 corners are `(r1,c1), (r1,c2), (r2,c1), (r2,c2)`.
2. The rectangle must span EXACTLY 2 boxes (the uniqueness argument fails otherwise — when corners are in 4 different boxes the swap may resolve via box constraint).
3. Find rectangles where 3 of the 4 corners have candidates equal to `{a, b}` (set equality on a bi-value set) and the 4th ("roof") has candidates that are a strict superset of `{a, b}` (size ≥ 3, both `a` and `b` present).
4. Eliminate `a` and `b` from the roof.

**Spanning-2-boxes check:** the rectangle spans 2 boxes iff `floor(r1/3) === floor(r2/3)` (same band) XOR `floor(c1/3) === floor(c2/3)` (same stack) is false — i.e. rows share a band OR cols share a stack. Actually the correct condition is: the 4 corners occupy exactly 2 boxes when the rows share a band AND the cols don't share a stack, OR vice versa. If both share, it's 1 box (impossible for 4 distinct corners). If neither shares, it's 4 boxes. So:

```ts
function spansTwoBoxes(r1: number, r2: number, c1: number, c2: number): boolean {
  const sameBand = Math.floor(r1 / 3) === Math.floor(r2 / 3);
  const sameStack = Math.floor(c1 / 3) === Math.floor(c2 / 3);
  return sameBand !== sameStack;
}
```

- [ ] **Step 1: Write `src/solver/techniques/uniqueRectangle.test.ts` first (RED).**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { uniqueRectangle } from './uniqueRectangle';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('uniqueRectangle (Type 1)', () => {
  it('returns null on an empty board', () => {
    expect(uniqueRectangle(emptyState())).toBeNull();
  });

  it('finds a UR Type 1 spanning 2 boxes (rows share band, cols differ stack)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Rectangle corners (0,0), (0,4), (1,0), (1,4). Rows 0,1 share band 0; cols 0,4 are in different stacks.
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[1]![0] = new Set<Digit>([4, 7]);
    state.candidates[1]![4] = new Set<Digit>([4, 7, 9]); // roof
    const step = uniqueRectangle(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('uniqueRectangle');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 4 }, digit: 4 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 4 }, digit: 7 });
    expect(step?.eliminations.length).toBe(2);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 4 },
        { row: 1, col: 0 },
        { row: 1, col: 4 },
      ]),
    );
  });

  it('returns null when rectangle spans 4 boxes (no shared band or stack)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Corners (0,0), (0,4), (4,0), (4,4) — rows 0/4 differ in band, cols 0/4 differ in stack → 4 boxes.
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[4]![0] = new Set<Digit>([4, 7]);
    state.candidates[4]![4] = new Set<Digit>([4, 7, 9]);
    expect(uniqueRectangle(state)).toBeNull();
  });

  it('returns null when all four corners are exactly {a,b} (no roof; deadly pattern, not Type 1)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[1]![0] = new Set<Digit>([4, 7]);
    state.candidates[1]![4] = new Set<Digit>([4, 7]);
    expect(uniqueRectangle(state)).toBeNull();
  });

  it('returns null when roof has only 2 candidates equal to {a,b}', () => {
    // Same setup as the matching test but roof reduced to {4,7} — this is the "all four equal" case.
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[1]![0] = new Set<Digit>([4, 7]);
    state.candidates[1]![4] = new Set<Digit>([4, 7]);
    expect(uniqueRectangle(state)).toBeNull();
  });

  it('finds a UR Type 1 with cols sharing stack instead of rows sharing band', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Corners (0,0), (4,0), (0,1), (4,1). Cols 0,1 same stack; rows 0,4 different bands.
    state.candidates[0]![0] = new Set<Digit>([2, 8]);
    state.candidates[4]![0] = new Set<Digit>([2, 8]);
    state.candidates[0]![1] = new Set<Digit>([2, 8]);
    state.candidates[4]![1] = new Set<Digit>([2, 8, 5]);
    const step = uniqueRectangle(state);
    expect(step?.technique).toBe('uniqueRectangle');
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 1 }, digit: 2 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 1 }, digit: 8 });
  });
});
```

- [ ] **Step 2: Run to verify RED.**

Run: `npm test -- --run src/solver/techniques/uniqueRectangle.test.ts`
Expected: FAIL — `uniqueRectangle` not exported.

- [ ] **Step 3: Create `src/solver/techniques/uniqueRectangle.ts`.**

```ts
import type { CellCoord, Digit } from '../../types';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

const SIZE = 9;

function spansTwoBoxes(r1: number, r2: number, c1: number, c2: number): boolean {
  const sameBand = Math.floor(r1 / 3) === Math.floor(r2 / 3);
  const sameStack = Math.floor(c1 / 3) === Math.floor(c2 / 3);
  return sameBand !== sameStack;
}

function setEquals(a: Set<Digit>, b: ReadonlyArray<Digit>): boolean {
  if (a.size !== b.length) return false;
  for (const d of b) if (!a.has(d)) return false;
  return true;
}

function setHasBoth(s: Set<Digit>, a: Digit, b: Digit): boolean {
  return s.has(a) && s.has(b);
}

export const uniqueRectangle: TechniqueDetector = (state: SolverState): Step | null => {
  // Iterate row pairs and column pairs.
  for (let r1 = 0; r1 < SIZE; r1++) {
    for (let r2 = r1 + 1; r2 < SIZE; r2++) {
      for (let c1 = 0; c1 < SIZE; c1++) {
        for (let c2 = c1 + 1; c2 < SIZE; c2++) {
          if (!spansTwoBoxes(r1, r2, c1, c2)) continue;
          const corners: CellCoord[] = [
            { row: r1, col: c1 },
            { row: r1, col: c2 },
            { row: r2, col: c1 },
            { row: r2, col: c2 },
          ];
          // Skip rectangles touching a placed-value cell — Type 1 only applies to all-empty corners.
          let anyValued = false;
          for (const k of corners) {
            if (state.values[k.row]![k.col] !== null) {
              anyValued = true;
              break;
            }
          }
          if (anyValued) continue;
          // Find all bi-value corners and check if 3 share the same {a,b}.
          const cornerCands = corners.map((k) => state.candidates[k.row]![k.col]!);
          // For each corner as candidate "roof", check the other three are bi-value with the same {a,b}
          // that is a subset of the roof.
          for (let roofIdx = 0; roofIdx < 4; roofIdx++) {
            const roofCand = cornerCands[roofIdx]!;
            if (roofCand.size < 3) continue;
            const otherIdx = [0, 1, 2, 3].filter((i) => i !== roofIdx);
            const floor0 = cornerCands[otherIdx[0]!]!;
            const floor1 = cornerCands[otherIdx[1]!]!;
            const floor2 = cornerCands[otherIdx[2]!]!;
            if (floor0.size !== 2) continue;
            const floorDigits = Array.from(floor0).sort((a, b) => a - b) as [Digit, Digit];
            const [a, b] = floorDigits;
            if (!setEquals(floor1, floorDigits)) continue;
            if (!setEquals(floor2, floorDigits)) continue;
            if (!setHasBoth(roofCand, a, b)) continue;
            // Roof must have at least one extra digit beyond {a,b}.
            if (roofCand.size < 3) continue;
            const roofCoord = corners[roofIdx]!;
            const eliminations: Elimination[] = [
              { cell: roofCoord, digit: a },
              { cell: roofCoord, digit: b },
            ];
            return {
              technique: 'uniqueRectangle',
              highlights: corners,
              placements: [],
              eliminations,
              explanation: `Unique Rectangle (Type 1): cells (${corners[0]!.row + 1}, ${corners[0]!.col + 1}), (${corners[1]!.row + 1}, ${corners[1]!.col + 1}), (${corners[2]!.row + 1}, ${corners[2]!.col + 1}), (${corners[3]!.row + 1}, ${corners[3]!.col + 1}) form a rectangle in 2 boxes; three corners have {${a},${b}}, so the fourth (roof at (${roofCoord.row + 1}, ${roofCoord.col + 1})) cannot be ${a} or ${b}.`,
            };
          }
        }
      }
    }
  }
  return null;
};
```

- [ ] **Step 4: Update `src/solver/techniques/index.ts`** — add import and append `uniqueRectangle` after `xyzWing`:

```ts
import { uniqueRectangle } from './uniqueRectangle';

// ... in ALL_TECHNIQUES, after xyzWing:
  xyzWing,
  uniqueRectangle,
```

- [ ] **Step 5: Run the full suite.**

Run: `npm test -- --run`
Expected: All previous tests pass; uniqueRectangle.test.ts contributes 5 new tests, all PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/solver/techniques/uniqueRectangle.ts src/solver/techniques/uniqueRectangle.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add uniqueRectangle Type 1 detector"
```

---

## Task 6: coloring (simple) detector

**Files:**

- Create: `src/solver/techniques/coloring.ts`
- Create: `src/solver/techniques/coloring.test.ts`
- Modify: `src/solver/techniques/index.ts` (append `coloring` — final detector in registry)

**Simple coloring algorithm:**

For each digit `d` (1..9):

1. **Build the conjugate-pair graph.** For each unit (27 total: 9 rows + 9 cols + 9 boxes), if `d` has exactly 2 candidate cells in that unit, add an edge between those two cells. Nodes are coordinates of cells where `d` is a candidate.
2. **Find connected components.** Use BFS/DFS.
3. **2-color each component.** Assign starting node color A; flip across each edge.
4. **Wrap check (intra-color contradiction):** for each unit (row/col/box), check if any color contains two of its nodes within the same unit. If color A has two nodes sharing a unit, color A is impossible → eliminate `d` from every A-colored node.
5. **Trap check (extra-color visibility):** for each cell `x` carrying `d` and NOT in the component, if `x` has a peer of color A AND a peer of color B (in this component), eliminate `d` from `x`.

Return the first component that produces non-empty eliminations.

**Determinism:** iterate digits 1→9, components in BFS-discovery order (start node = lowest-key uncolored node).

- [ ] **Step 1: Write `src/solver/techniques/coloring.test.ts` first (RED).**

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { coloring } from './coloring';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('coloring (simple)', () => {
  it('returns null on an empty board', () => {
    expect(coloring(emptyState())).toBeNull();
  });

  it('returns null when no conjugate pairs exist for any digit', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Just a single cell with candidate 5 — no conjugate pair anywhere.
    state.candidates[0]![0] = new Set<Digit>([5]);
    expect(coloring(state)).toBeNull();
  });

  it('color trap: chain creates a cell visible to both colors → eliminate', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 5;
    // Build a chain for digit 5:
    //   Row 0: only (0,0) and (0,8) carry 5  → edge (0,0)–(0,8).
    //   Col 8: only (0,8) and (8,8) carry 5  → edge (0,8)–(8,8).
    //   Row 8: only (8,8) and (8,0) carry 5  → edge (8,8)–(8,0).
    // After 2-coloring: (0,0)=A, (0,8)=B, (8,8)=A, (8,0)=B.
    // Cell (0,0) is color A, (8,0) is color B. Any cell that sees both → eliminate 5.
    // Cell (4,0) is in col 0; it sees (0,0) [col 0] and (8,0) [col 0]? Both are in col 0. So (4,0) sees both colors via col 0.
    // But wait — (4,0) is in the same column as both, and the col 0 has only the two endpoints of color A and B?
    // We need to ensure (4,0) is NOT part of a conjugate pair for digit 5 in col 0. Let me set col 0 to have THREE
    // cells with 5: (0,0), (8,0), (4,0). Then col 0 is NOT a conjugate pair (3 cells), so no edge along col 0.
    state.candidates[0]![0] = new Set<Digit>([d]);
    state.candidates[0]![8] = new Set<Digit>([d]);
    state.candidates[8]![8] = new Set<Digit>([d]);
    state.candidates[8]![0] = new Set<Digit>([d]);
    state.candidates[4]![0] = new Set<Digit>([d, 1]); // sees both color A (0,0) and color B (8,0) via col 0
    // Verify edges: row 0 conjugate (only (0,0) and (0,8) have d) — YES.
    // Col 8 conjugate ((0,8) and (8,8)) — YES.
    // Row 8 conjugate ((8,8) and (8,0)) — YES.
    // Col 0 has THREE cells with d: (0,0), (8,0), (4,0). NOT conjugate; no edge along col 0.
    // Box 0 contains (0,0) only (since (0,8), (8,8), (8,0), (4,0) are in other boxes). Not conjugate. Box 2 contains (0,8) only. Etc.
    const step = coloring(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('coloring');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 0 }, digit: d });
  });

  it('color wrap: two same-colored cells share a unit → eliminate that color', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 7;
    // Construct a 4-node path with a wrap: build the path A–B–A–B then add an edge that
    // forces two A's into a shared unit.
    //   Row 0: only (0,0) and (0,4) carry d → edge. (0,0)=A, (0,4)=B.
    //   Col 4: only (0,4) and (3,4) carry d → edge. (3,4)=A.
    //   Row 3: only (3,4) and (3,0) carry d → edge. (3,0)=B.
    //   Col 0: only (0,0) and (3,0) carry d → edge. Already-colored: (0,0)=A connected to (3,0)=B.
    //          Consistent (parity OK), no wrap yet.
    // For a wrap, force a same-color shared unit via box 0:
    //   Box 0: only (0,0) and (2,2) carry d → edge. (2,2)=B.
    //   Box 6: only (3,0) and (5,2) carry d → edge. (5,2)=A. A-colored: (0,0), (3,4), (5,2).
    //   We need any two A's in the same unit. (3,4) and (5,2) share box? 3,4 is in box 4 (rows 3-5, cols 3-5);
    //   (5,2) is in box 6 (rows 3-5, cols 0-2). Not same box. Different row and col. No wrap.
    // Wrap construction on a synthetic state is fiddly. The integration test in Task 7 covers wrap
    // organically. For this unit test, verify wrap detection via a hand-crafted minimal wrap by directly
    // calling the detector on a state with a known parity violation:
    //   Row 0: (0,0)–(0,4) edge → (0,0)=A, (0,4)=B.
    //   Box 1: (0,4)–(1,3) edge → (1,3)=A.
    //   Row 1: (1,3)–(1,0) edge → (1,0)=B.
    //   Col 0: (0,0)–(1,0) edge → already colored: (0,0)=A, (1,0)=B. Consistent. No wrap.
    // Construct a true odd-cycle wrap via 5 nodes: A–B–A–B–A forming a cycle of length 5 (impossible in
    // simple graph) or any wrap = same-color in same unit at graph distance 2.
    //   Box 0 contains (0,0)=A and (1,1) if (0,0)–(1,1) is an edge (box 0 conjugate of two cells): (1,1)=B.
    //   Row 1 conjugate: (1,1)–(1,4) → (1,4)=A. Now A-colored: (0,0), (1,4). Same row? No. Same col? No.
    //   Same box? (0,0) in box 0, (1,4) in box 1. No.
    //   Col 4 conjugate: (1,4)–(2,4) → wait (2,4) is new, but we want to land an A in same unit as another A.
    //   Try col 0 conjugate: (1,1) and (1,5) — not col 0. Try col 1: only (1,1) carries d? then no edge.
    // Wrap fixtures are nontrivial. Use a direct state-construction that we mathematically know wraps:
    //   Set d=7 candidates at exactly these cells: (0,0), (0,4), (4,4), (4,0), (4,2).
    //     Row 0: 2 cells → edge (0,0)–(0,4). (0,0)=A, (0,4)=B.
    //     Col 4: 2 cells → edge (0,4)–(4,4). (4,4)=A.
    //     Row 4: 3 cells (4,0)(4,2)(4,4) → NOT conjugate; no edge along row 4.
    //     Col 0: 2 cells → edge (0,0)–(4,0). (4,0)=B.
    //     Col 2: 1 cell. No edge.
    //     Box 0: 1 cell (0,0). Box 1: 1 cell (0,4). Box 3: 2 cells (4,0)(4,2)? Box 3 = rows 3-5, cols 0-2.
    //       So (4,0) and (4,2) both in box 3 → edge. (4,2)=A.
    //   A-colored: (0,0), (4,4), (4,2). Any pair in same unit?
    //     (4,4) and (4,2): same row (4). YES. WRAP fires → A is eliminated.
    state.candidates[0]![0] = new Set<Digit>([d]);
    state.candidates[0]![4] = new Set<Digit>([d]);
    state.candidates[4]![4] = new Set<Digit>([d]);
    state.candidates[4]![0] = new Set<Digit>([d]);
    state.candidates[4]![2] = new Set<Digit>([d]);
    const step = coloring(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('coloring');
    // A-colored cells eliminated: (0,0), (4,4), (4,2).
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: d });
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 4 }, digit: d });
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 2 }, digit: d });
    expect(step?.eliminations.length).toBe(3);
  });

  it('does not fire when the chain is fully contained (no outside cells with d)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 5;
    // Single conjugate pair, no outside d candidates. No trap, no wrap, no elimination.
    state.candidates[0]![0] = new Set<Digit>([d]);
    state.candidates[0]![4] = new Set<Digit>([d]);
    expect(coloring(state)).toBeNull();
  });

  it('does not double-fire on a 2-node component alone', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 3;
    state.candidates[0]![0] = new Set<Digit>([d, 5]);
    state.candidates[0]![1] = new Set<Digit>([d, 7]);
    // Outside cells with d but no edges to color them → no eliminations possible from 2-node component.
    state.candidates[5]![5] = new Set<Digit>([d, 9]);
    expect(coloring(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify RED.**

Run: `npm test -- --run src/solver/techniques/coloring.test.ts`
Expected: FAIL — `coloring` not exported.

- [ ] **Step 3: Create `src/solver/techniques/coloring.ts`.**

```ts
import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf, peersOf, unitsContaining } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function key(c: CellCoord): string {
  return `${c.row},${c.col}`;
}

function scanDigit(state: SolverState, digit: Digit): Step | null {
  // 1. Collect all candidate cells for digit.
  const candidateCells: CellCoord[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      if (state.candidates[r]![c]!.has(digit)) candidateCells.push({ row: r, col: c });
    }
  }
  if (candidateCells.length < 2) return null;

  // 2. Build adjacency from conjugate pairs (units where digit has exactly 2 candidates).
  const adj = new Map<string, CellCoord[]>();
  for (const cell of candidateCells) adj.set(key(cell), []);
  const allUnits: ReadonlyArray<ReadonlyArray<CellCoord>> = [
    ...rowsOf(),
    ...colsOf(),
    ...boxesOf(),
  ];
  for (const unit of allUnits) {
    const inUnit = cellsWithDigit(state, unit, digit);
    if (inUnit.length !== 2) continue;
    const [a, b] = inUnit;
    adj.get(key(a!))!.push(b!);
    adj.get(key(b!))!.push(a!);
  }

  // 3. BFS components, 2-color them.
  const colorByKey = new Map<string, 0 | 1>();
  const componentByKey = new Map<string, number>();
  const components: CellCoord[][] = [];
  for (const start of candidateCells) {
    if (colorByKey.has(key(start))) continue;
    if (adj.get(key(start))!.length === 0) continue; // isolated node — no chain
    const queue: CellCoord[] = [start];
    colorByKey.set(key(start), 0);
    const componentIdx = components.length;
    componentByKey.set(key(start), componentIdx);
    const comp: CellCoord[] = [start];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curColor = colorByKey.get(key(cur))!;
      for (const nb of adj.get(key(cur))!) {
        if (colorByKey.has(key(nb))) continue;
        colorByKey.set(key(nb), (curColor === 0 ? 1 : 0) as 0 | 1);
        componentByKey.set(key(nb), componentIdx);
        comp.push(nb);
        queue.push(nb);
      }
    }
    components.push(comp);
  }

  // 4. For each component, check wrap then trap.
  for (let i = 0; i < components.length; i++) {
    const comp = components[i]!;
    if (comp.length < 2) continue;
    const colorA: CellCoord[] = [];
    const colorB: CellCoord[] = [];
    for (const cell of comp) {
      const col = colorByKey.get(key(cell))!;
      if (col === 0) colorA.push(cell);
      else colorB.push(cell);
    }

    // Wrap: same-color cells share a unit.
    const wrappedColor = wrapColor(colorA, colorB);
    if (wrappedColor !== null) {
      const losingCells = wrappedColor === 0 ? colorA : colorB;
      const eliminations: Elimination[] = losingCells.map((cell) => ({ cell, digit }));
      return {
        technique: 'coloring',
        highlights: comp,
        placements: [],
        eliminations,
        explanation: `Coloring: digit ${digit} has a chain where one color repeats inside a unit; that color is eliminated from ${losingCells.length} cells.`,
      };
    }

    // Trap: outside cells visible to both colors.
    const compKeys = new Set(comp.map(key));
    const elimCells: CellCoord[] = [];
    for (const outside of candidateCells) {
      if (compKeys.has(key(outside))) continue;
      const peers = peersOf(outside);
      let seenA = false;
      let seenB = false;
      for (const p of peers) {
        const pk = key(p);
        const c = colorByKey.get(pk);
        if (c === undefined) continue;
        if (componentByKey.get(pk) !== i) continue;
        if (c === 0) seenA = true;
        else seenB = true;
        if (seenA && seenB) break;
      }
      if (seenA && seenB) elimCells.push(outside);
    }
    if (elimCells.length > 0) {
      const eliminations: Elimination[] = elimCells.map((cell) => ({ cell, digit }));
      return {
        technique: 'coloring',
        highlights: comp,
        placements: [],
        eliminations,
        explanation: `Coloring: digit ${digit} forms a 2-colored chain; ${elimCells.length} outside cell(s) see both colors and cannot be ${digit}.`,
      };
    }
  }
  return null;
}

function wrapColor(colorA: CellCoord[], colorB: CellCoord[]): 0 | 1 | null {
  if (sameColorSharesUnit(colorA)) return 0;
  if (sameColorSharesUnit(colorB)) return 1;
  return null;
}

function sameColorSharesUnit(cells: CellCoord[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i]!;
      const b = cells[j]!;
      const aUnits = unitsContaining(a);
      for (const u of aUnits) {
        if (u.some((k) => k.row === b.row && k.col === b.col)) return true;
      }
    }
  }
  return false;
}

export const coloring: TechniqueDetector = (state: SolverState): Step | null => {
  for (const digit of DIGITS) {
    const step = scanDigit(state, digit);
    if (step) return step;
  }
  return null;
};
```

- [ ] **Step 4: Update `src/solver/techniques/index.ts`** — add import and append `coloring` LAST in the registry:

```ts
import { coloring } from './coloring';

// Final ALL_TECHNIQUES array:
export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
  hiddenTriple,
  pointingPair,
  nakedQuad,
  hiddenQuad,
  boxLineReduction,
  xWing,
  swordfish,
  xyWing,
  xyzWing,
  uniqueRectangle,
  coloring,
];
```

- [ ] **Step 5: Run the full suite.**

Run: `npm test -- --run`
Expected: All previous tests pass; coloring.test.ts contributes 5 tests, all PASS.

If the color-trap test fails: walk through the constructed fixture by hand. Set `console.log` of `adj` and `colorByKey` in `coloring.ts` to debug, then remove the logs.

- [ ] **Step 6: Commit.**

```bash
git add src/solver/techniques/coloring.ts src/solver/techniques/coloring.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add simple coloring detector with trap and wrap"
```

---

## Task 7: Expert-puzzle integration test and acceptance

**Files:**

- Modify: `src/solver/solve.test.ts` (append an expert-tier integration test)

Add an expert-tier puzzle that solves end-to-end and engages at least one Phase 6 technique. Several candidate puzzles exist publicly that are known to require X-Wing / Swordfish / XY-Wing / Unique Rectangle. We'll use one from HoDoKu's published expert examples; if it doesn't engage a Phase 6 technique in our solver's ordering, fall back to the next candidate.

- [ ] **Step 1: Pick a candidate expert puzzle** and write the integration test. Add to the end of `src/solver/solve.test.ts`:

```ts
// --- Phase 6 expert-puzzle integration test ---

const EXPERT_TECHNIQUES = [
  'swordfish',
  'xyWing',
  'xyzWing',
  'uniqueRectangle',
  'coloring',
] as const;

// Expert-tier candidate puzzle. Known to require X-Wing + Swordfish + XY-Wing
// to solve via human techniques. Source: HoDoKu expert example set.
const EXPERT_PUZZLE: (Digit | null)[][] = [
  [null, null, 3, null, null, null, null, null, null],
  [4, null, null, null, 8, null, null, 3, 6],
  [null, null, 8, null, null, null, 1, null, null],
  [null, 4, null, null, 6, null, null, 7, 3],
  [null, null, null, 9, null, null, null, null, null],
  [null, null, null, null, null, 2, null, null, 5],
  [null, null, 4, null, 7, null, null, 6, 8],
  [6, null, null, null, null, null, null, null, null],
  [7, null, null, 6, null, null, 5, null, null],
];

describe('solve — expert puzzle integration', () => {
  it('solves the curated expert puzzle to a valid completed grid', () => {
    const result = solve(EXPERT_PUZZLE);
    expect(result.solved).toBe(true);
    expect(isValidCompleteGrid(result.state.values)).toBe(true);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const given = EXPERT_PUZZLE[r]![c];
        if (given !== null) expect(result.state.values[r]![c]).toBe(given);
      }
    }
  });

  it('uses at least one Phase 6 expert technique on the expert puzzle', () => {
    const result = solve(EXPERT_PUZZLE);
    const usedTechniques = new Set(result.steps.map((s) => s.technique));
    const usedExpert = EXPERT_TECHNIQUES.some((t) => usedTechniques.has(t));
    expect(usedExpert).toBe(true);
  });
});
```

- [ ] **Step 2: Run the integration test.**

Run: `npm test -- --run src/solver/solve.test.ts`
Expected: Both new tests PASS.

If `solved` is false: the puzzle requires techniques outside Phase 6 (or has a bug). Try a different candidate puzzle. Below are 2 fallback candidates if the first fails — replace `EXPERT_PUZZLE` and re-run:

**Fallback A** (known to need XY-Wing):

```ts
const EXPERT_PUZZLE: (Digit | null)[][] = [
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
```

If Fallback A still doesn't solve, the issue is likely a bug in one of the new detectors. Read `result.steps` to see how far the solver got, then construct a unit test for the missed step. As a last resort, find a fresh expert-tier puzzle from HoDoKu, SudokuWiki, or the Project Euler problem 96 set.

If the puzzle solves but the second assertion fails (no Phase 6 technique used), it means the earlier Phase 1–5 techniques alone were enough — pick a harder puzzle.

- [ ] **Step 3: Run the full suite as final acceptance.**

Run: `npm test -- --run && npm run typecheck`
Expected: All test files pass (~169 tests total). Typecheck clean.

- [ ] **Step 4: Commit.**

```bash
git add src/solver/solve.test.ts
git commit -m "test(solver): add expert puzzle integration test for Phase 6"
```

---

## Acceptance criteria (final)

- [ ] `npm test -- --run` — all tests pass.
- [ ] `npm run typecheck` — no errors.
- [ ] `ALL_TECHNIQUES` registry ends with: `..., xWing, swordfish, xyWing, xyzWing, uniqueRectangle, coloring`.
- [ ] One curated expert puzzle solves end-to-end and engages at least one Phase 6 technique.
- [ ] No regressions in earlier-phase tests (5 xWing tests in particular must remain green after the fish refactor).
- [ ] No changes to `solve.ts`.
- [ ] No Phase 5 cleanup items completed (explicitly deferred).
