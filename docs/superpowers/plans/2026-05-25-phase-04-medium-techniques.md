# Phase 4: Medium Techniques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five medium-tier technique detectors (`nakedPair`, `nakedTriple`, `hiddenPair`, `hiddenTriple`, `pointingPair`) to the solver, wire each into the `ALL_TECHNIQUES` registry, and verify the solver now handles a curated medium puzzle end-to-end.

**Architecture:** Each medium technique is a pure `TechniqueDetector` — a function `(state: SolverState) => Step | null`. Unlike Phase 3 techniques (which produce `placements`), Phase 4 techniques produce `eliminations` only. The existing solver loop in `src/solver/solve.ts` already applies `step.eliminations` to the candidate grid (see `solve.ts:50-58`), so no loop changes are needed. Detectors scan units in deterministic order (rows 0..8, then cols 0..8, then boxes 0..8) and return the first applicable step.

**Tech Stack:** No new dependencies. Builds on Phase 2 primitives (`src/types.ts`, `src/solver/units.ts`, `src/solver/candidates.ts`) and the Phase 3 solver core (`src/solver/types.ts`, `src/solver/solve.ts`, `src/solver/techniques/index.ts`).

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design notes — locked in before tasks:**

- **Elimination-only steps:** All five Phase 4 detectors return steps with `placements: []` and a non-empty `eliminations` array. If the technique's pattern exists but produces zero eliminations (e.g. a naked pair where peer cells don't actually have those digits as candidates), the detector returns `null` to avoid wasted work and infinite loops.
- **Determinism:** scan rows, then columns, then boxes — index 0..8 within each kind. Within a unit, scan combinations in ascending order (pairs `(i,j)` with `i<j`; triples `(i,j,k)` with `i<j<k`; digits `1..9`). Return the **first** step found, then exit.
- **Highlights:** include the cells that participate in the pattern (the pair/triple cells, or the pointing pair's box cells). The user's eye should jump to the locked candidates first.
- **Pure functions, no mutation.** Detectors read `state` without modifying it. The solver loop produces new state from the returned `Step`.
- **Registry order — easiest-first within tier:** `[nakedSingle, hiddenSingle, nakedPair, nakedTriple, hiddenPair, hiddenTriple, pointingPair]`. Each technique task appends itself to `ALL_TECHNIQUES` so each commit leaves the solver runnable.
- **Combinations are inline.** With `n ≤ 9` per unit, nested `for` loops over pairs/triples are fast enough. No shared `combinations(arr, k)` helper — YAGNI.
- **No changes to `solve.ts`.** Verify this by reading `src/solver/solve.ts:50-58` before starting Task 2 — the elimination application is already there.

---

## Task 1: Freeze module-level unit constants in `units.ts`

Defensive cleanup carried forward from the Phase 3 reviewer: `ROWS`, `COLS`, `BOXES` in `src/solver/units.ts` are shared module-level arrays. Phase 4 detectors will iterate them heavily; an accidental `.push()` or in-place sort by a future technique would silently corrupt shared state. Freezing prevents that class of bug.

**Files:**

- Modify: `src/solver/units.ts:10-28`

- [ ] **Step 1: Read `src/solver/units.ts`** to confirm the current `ROWS`, `COLS`, `BOXES` definitions match the block below. (The plan was written against the version of the file with `const ROWS: CellCoord[][] = Array.from(...)`, etc. at lines 10-28.)

- [ ] **Step 2: Apply the freeze** — replace the three `const` blocks for `ROWS`, `COLS`, `BOXES` so each top-level array and each inner array is frozen.

In `src/solver/units.ts`, change:

```ts
const ROWS: CellCoord[][] = Array.from({ length: SIZE }, (_, row) =>
  Array.from({ length: SIZE }, (_, col) => ({ row, col })),
);

const COLS: CellCoord[][] = Array.from({ length: SIZE }, (_, col) =>
  Array.from({ length: SIZE }, (_, row) => ({ row, col })),
);

const BOXES: CellCoord[][] = Array.from({ length: SIZE }, (_, b) => {
  const rowStart = Math.floor(b / BOX) * BOX;
  const colStart = (b % BOX) * BOX;
  const cells: CellCoord[] = [];
  for (let dr = 0; dr < BOX; dr++) {
    for (let dc = 0; dc < BOX; dc++) {
      cells.push({ row: rowStart + dr, col: colStart + dc });
    }
  }
  return cells;
});
```

to:

```ts
const ROWS: ReadonlyArray<ReadonlyArray<CellCoord>> = Object.freeze(
  Array.from({ length: SIZE }, (_, row) =>
    Object.freeze(Array.from({ length: SIZE }, (_, col) => ({ row, col }))),
  ),
);

const COLS: ReadonlyArray<ReadonlyArray<CellCoord>> = Object.freeze(
  Array.from({ length: SIZE }, (_, col) =>
    Object.freeze(Array.from({ length: SIZE }, (_, row) => ({ row, col }))),
  ),
);

const BOXES: ReadonlyArray<ReadonlyArray<CellCoord>> = Object.freeze(
  Array.from({ length: SIZE }, (_, b) => {
    const rowStart = Math.floor(b / BOX) * BOX;
    const colStart = (b % BOX) * BOX;
    const cells: CellCoord[] = [];
    for (let dr = 0; dr < BOX; dr++) {
      for (let dc = 0; dc < BOX; dc++) {
        cells.push({ row: rowStart + dr, col: colStart + dc });
      }
    }
    return Object.freeze(cells);
  }),
);
```

- [ ] **Step 3: Adjust the public accessors' return types** to expose the read-only structure to callers, so any future mutation attempt fails to typecheck.

In `src/solver/units.ts`, change:

```ts
export function rowsOf(): CellCoord[][] {
  return ROWS;
}

export function colsOf(): CellCoord[][] {
  return COLS;
}

export function boxesOf(): CellCoord[][] {
  return BOXES;
}
```

to:

```ts
export function rowsOf(): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return ROWS;
}

export function colsOf(): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return COLS;
}

export function boxesOf(): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return BOXES;
}
```

Also update `unitsContaining` similarly:

```ts
export function unitsContaining(coord: CellCoord): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return [ROWS[coord.row]!, COLS[coord.col]!, BOXES[boxIndexOf(coord)]!];
}
```

- [ ] **Step 4: Run typecheck — will likely surface call sites that destructure or sort these arrays**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck
```

Existing call sites (`hiddenSingle.ts`, `candidates.ts`) iterate these arrays with `for...of` or pass them as `CellCoord[][]`. The `Readonly` types are covariant with iteration but not with mutation. If a call site fails to typecheck, the right fix is to widen its parameter type to `ReadonlyArray<ReadonlyArray<CellCoord>>` (or its iterable equivalent), **not** to cast away the readonly. If a fix is needed, apply it now in the same commit.

Expected affected sites (verify by reading these and adjust if typecheck complains):

- `src/solver/techniques/hiddenSingle.ts` — `scanUnits` parameter `units: CellCoord[][]` may need to widen.
- `src/solver/candidates.ts` — `unitsContaining` callers in `computeCandidates`.

If `for (const cell of unit)` iteration is what's used, no signature change is needed there since `ReadonlyArray<T>` is iterable. If a function signature explicitly takes `CellCoord[][]`, change it to `ReadonlyArray<ReadonlyArray<CellCoord>>`.

- [ ] **Step 5: Run the full test suite**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

All 69 existing tests should still pass.

- [ ] **Step 6: Lint and format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run lint && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add docs/superpowers/plans/2026-05-25-phase-04-medium-techniques.md src/solver/units.ts src/solver/techniques/hiddenSingle.ts src/solver/candidates.ts
git commit -m "refactor(solver): freeze shared unit constants to prevent mutation"
```

(Adjust the `git add` list — include only the files actually modified. The plan file is included so it lands in the same first commit per Phase 3 lesson learned.)

---

## Task 2: Naked Pair detector (`src/solver/techniques/nakedPair.ts`)

**Files:**

- Create: `src/solver/techniques/nakedPair.ts`
- Create: `src/solver/techniques/nakedPair.test.ts`
- Modify: `src/solver/techniques/index.ts`

A **naked pair** is two cells in a single unit (row, column, or box) whose candidate sets are both _exactly_ the same two-element set `{a, b}`. Because those two cells must take values `a` and `b` between them, neither `a` nor `b` can appear in any other cell of that unit. The detector emits an `eliminations` step removing `a` and `b` from all other cells in the unit.

If the pair pattern exists but no other cells in the unit have `a` or `b` as candidates, return `null` (no eliminations → not a useful step).

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/nakedPair.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedPair } from './nakedPair';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

describe('nakedPair', () => {
  it('returns null on an empty board', () => {
    expect(nakedPair(emptyState())).toBeNull();
  });

  it('finds a naked pair in a row and emits eliminations', () => {
    const state = emptyState();
    // Row 0: cells (0,0) and (0,1) both have candidates {3, 7}. Other cells in row 0 still have full ALL.
    state.candidates[0]![0] = new Set<Digit>([3, 7]);
    state.candidates[0]![1] = new Set<Digit>([3, 7]);
    // Box 0 also contains (0,0) and (0,1) — the detector may find row OR box first; both are valid.
    // We pin to row by clearing 3,7 from box-internal column-2/row-1/row-2 cells too, so the BOX is no
    // longer a valid naked pair (rest of box has no 3 or 7 to eliminate). But row is still valid because
    // other row cells (0,2)..(0,8) still have 3,7.
    for (let c = 2; c < 3; c++) state.candidates[0]![c]!.delete(3);
    for (let c = 2; c < 3; c++) state.candidates[0]![c]!.delete(7);
    // Actually simpler: clear 3,7 from cells (1,0), (1,1), (1,2), (2,0), (2,1), (2,2) so box has no
    // eliminations to make, leaving only the row eliminations to fire.
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
      [0, 2], // also clear (0,2) for box; row eliminations still fire on (0,3)..(0,8)
    ] as const) {
      state.candidates[r]![c]!.delete(3);
      state.candidates[r]![c]!.delete(7);
    }
    // Column 0 also has (0,0); we cleared (1,0) and (2,0). Cells (3,0)..(8,0) still have 3,7, so a
    // column naked pair would also be valid if (any other col cell had {3,7}). They don't — only
    // (0,0) has {3,7} in col 0. So no column naked pair. Only row 0 naked pair fires.

    const step = nakedPair(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedPair');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toContainEqual({ row: 0, col: 0 });
    expect(step?.highlights).toContainEqual({ row: 0, col: 1 });

    // Eliminations: digit 3 and 7 removed from (0,3)..(0,8) — 6 cells × 2 digits = 12 eliminations.
    // (0,2) had 3 and 7 already removed above so no elimination there.
    expect(step?.eliminations.length).toBe(12);
    for (let c = 3; c <= 8; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 3 });
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 7 });
    }
  });

  it('finds a naked pair in a column', () => {
    const state = emptyState();
    // Make rows 0 and 1 each have NO naked pair so column scanning is reached.
    // Strategy: pick a unique digit not present in other cells of row/column.
    // Simpler: clear candidates so row 0 cells have unique singletons, etc. Use a focused setup.
    // Approach: set up (3,5) and (6,5) with {2,8}; other column-5 cells have only digit 4 as
    // candidate (singletons would be naked singles, BUT this is a unit test for nakedPair only, called
    // in isolation — naked singles aren't part of this test).
    // Actually: simpler — clear ALL candidates everywhere except the column we care about. Then no
    // row or box has a naked pair, but column 5 does.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    // Now reinstate column 5: cells (3,5) and (6,5) have {2,8}; cells (0,5),(1,5),(2,5),(4,5),(5,5),
    // (7,5),(8,5) have {2,8,4} (so 2 and 8 are eliminable from them).
    state.candidates[3]![5] = new Set<Digit>([2, 8]);
    state.candidates[6]![5] = new Set<Digit>([2, 8]);
    for (const r of [0, 1, 2, 4, 5, 7, 8]) {
      state.candidates[r]![5] = new Set<Digit>([2, 4, 8]);
    }

    const step = nakedPair(state);
    expect(step?.technique).toBe('nakedPair');
    expect(step?.eliminations.length).toBe(14); // 7 other cells × 2 digits
    expect(step?.highlights).toContainEqual({ row: 3, col: 5 });
    expect(step?.highlights).toContainEqual({ row: 6, col: 5 });
  });

  it('finds a naked pair in a box', () => {
    const state = emptyState();
    // Clear everything; set up box 4 (rows 3-5, cols 3-5).
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[3]![3] = new Set<Digit>([1, 9]);
    state.candidates[3]![4] = new Set<Digit>([1, 9]);
    // Other cells in box 4 have {1,9,5} so they're affected.
    for (const [r, c] of [
      [3, 5],
      [4, 3],
      [4, 4],
      [4, 5],
      [5, 3],
      [5, 4],
      [5, 5],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 5, 9]);
    }

    const step = nakedPair(state);
    expect(step?.technique).toBe('nakedPair');
    // The detector scans rows first. Row 3 contains (3,3) and (3,4) with {1,9}. Other row-3 cells
    // (3,0)..(3,2) and (3,6)..(3,8) have empty candidate sets (we cleared them), so no row eliminations.
    // Detector continues to columns, then boxes. Box 4 produces eliminations on (3,5),(4,3),(4,4),
    // (4,5),(5,3),(5,4),(5,5) = 7 cells × 2 digits = 14 eliminations.
    expect(step?.eliminations.length).toBe(14);
  });

  it('returns null when the pair exists but produces no eliminations', () => {
    const state = emptyState();
    // Clear everything; set up an isolated naked pair with no other affected cells.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 5]);
    // All other cells in row 0, col 0, col 1, and box 0 have empty candidate sets — no eliminations.
    expect(nakedPair(state)).toBeNull();
  });

  it('does not match a single cell with two candidates (requires two cells)', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    // No second cell with {2,5} — not a pair.
    expect(nakedPair(state)).toBeNull();
  });

  it('does not match two cells with different two-element sets', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 6]);
    expect(nakedPair(state)).toBeNull();
  });

  it('skips placed cells', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.values[0]![0] = 4; // (0,0) is placed
    state.candidates[0]![0] = new Set<Digit>(); // placed cell has empty candidates
    // (0,1) and (0,2) form a real naked pair {2,5}; (0,3)..(0,8) have {2,5,7}.
    state.candidates[0]![1] = new Set<Digit>([2, 5]);
    state.candidates[0]![2] = new Set<Digit>([2, 5]);
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([2, 5, 7]);
    }

    const step = nakedPair(state);
    expect(step?.eliminations.length).toBe(12); // 6 cells × 2 digits
    // (0,0) is placed — no eliminations on it.
    expect(step?.eliminations.every((e) => !(e.cell.row === 0 && e.cell.col === 0))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/nakedPair.ts`**

```ts
import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type UnitKind = 'row' | 'column' | 'box';

function setsEqual(a: Set<Digit>, b: Set<Digit>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function scanForNakedPair(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    // Collect empty cells in this unit with exactly 2 candidates.
    const pairCandidates: { coord: CellCoord; set: Set<Digit> }[] = [];
    for (const coord of unit) {
      if (state.values[coord.row]![coord.col] !== null) continue;
      const set = state.candidates[coord.row]![coord.col]!;
      if (set.size === 2) pairCandidates.push({ coord, set });
    }
    // Try every pair (i, j) with i < j.
    for (let i = 0; i < pairCandidates.length; i++) {
      for (let j = i + 1; j < pairCandidates.length; j++) {
        const a = pairCandidates[i]!;
        const b = pairCandidates[j]!;
        if (!setsEqual(a.set, b.set)) continue;

        // Compute eliminations: remove the two digits from all other empty cells of the unit.
        const digits = Array.from(a.set);
        const eliminations: Elimination[] = [];
        for (const coord of unit) {
          if (coord.row === a.coord.row && coord.col === a.coord.col) continue;
          if (coord.row === b.coord.row && coord.col === b.coord.col) continue;
          if (state.values[coord.row]![coord.col] !== null) continue;
          const cellSet = state.candidates[coord.row]![coord.col]!;
          for (const digit of digits) {
            if (cellSet.has(digit)) {
              eliminations.push({ cell: coord, digit });
            }
          }
        }
        if (eliminations.length === 0) continue; // pattern exists but no effect; keep looking

        const sortedDigits = digits.slice().sort((x, y) => x - y);
        return {
          technique: 'nakedPair',
          highlights: [a.coord, b.coord],
          placements: [],
          eliminations,
          explanation: `Cells (${a.coord.row + 1}, ${a.coord.col + 1}) and (${b.coord.row + 1}, ${b.coord.col + 1}) in ${kind} ${u + 1} must contain ${sortedDigits[0]} and ${sortedDigits[1]}, eliminating those digits from the rest of the ${kind}.`,
        };
      }
    }
  }
  return null;
}

export const nakedPair: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForNakedPair(state, rowsOf(), 'row') ??
    scanForNakedPair(state, colsOf(), 'column') ??
    scanForNakedPair(state, boxesOf(), 'box')
  );
};
```

- [ ] **Step 4: Add `nakedPair` to the registry** — edit `src/solver/techniques/index.ts`:

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';

export const ALL_TECHNIQUES: TechniqueDetector[] = [nakedSingle, hiddenSingle, nakedPair];
```

- [ ] **Step 5: Run tests — all pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 6: Typecheck, lint, format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/nakedPair.ts src/solver/techniques/nakedPair.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add naked pair technique detector"
```

---

## Task 3: Naked Triple detector (`src/solver/techniques/nakedTriple.ts`)

**Files:**

- Create: `src/solver/techniques/nakedTriple.ts`
- Create: `src/solver/techniques/nakedTriple.test.ts`
- Modify: `src/solver/techniques/index.ts`

A **naked triple** is three cells in a single unit whose candidate sets **union** to exactly three digits `{a, b, c}`. Each of the three cells must have candidates that are a subset of `{a, b, c}` with size 2 or 3 (a candidate set of size 1 would be a naked single — Phase 3 — and should not be picked up here). The three cells must collectively contain `a`, `b`, `c` (in some assignment), so those three digits can be eliminated from every other cell in the unit.

Valid shape combinations: `{a,b}+{b,c}+{a,c}`, `{a,b}+{a,b,c}+{a,c}`, `{a,b,c}+{a,b,c}+{a,b,c}`, etc. — the rule is `union.size === 3` and each cell's set size is 2 or 3.

If no eliminations result, return `null`.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/nakedTriple.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedTriple } from './nakedTriple';

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

describe('nakedTriple', () => {
  it('returns null on an empty board', () => {
    expect(nakedTriple(emptyState())).toBeNull();
  });

  it('finds a naked triple {3,4,8}+{3,4}+{4,8} in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Row 0: three cells form a naked triple.
    state.candidates[0]![0] = new Set<Digit>([3, 4, 8]);
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([4, 8]);
    // Other row cells contain 3, 4, or 8 plus other digits — eliminations should fire.
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([3, 4, 8, 1, 2]);
    }
    const step = nakedTriple(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedTriple');
    expect(step?.placements).toEqual([]);
    // 6 other row cells × 3 digits = 18 eliminations.
    expect(step?.eliminations.length).toBe(18);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    );
  });

  it('finds a naked triple with all three cells {a,b,c} (full triple)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 5, 9]);
    state.candidates[0]![1] = new Set<Digit>([1, 5, 9]);
    state.candidates[0]![2] = new Set<Digit>([1, 5, 9]);
    state.candidates[0]![3] = new Set<Digit>([1, 5, 9, 2]); // one digit eliminable
    const step = nakedTriple(state);
    expect(step).not.toBeNull();
    expect(step?.eliminations.length).toBe(3); // 1 cell × 3 digits
  });

  it('finds a naked triple in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[2]![4] = new Set<Digit>([2, 6]);
    state.candidates[5]![4] = new Set<Digit>([2, 7]);
    state.candidates[8]![4] = new Set<Digit>([6, 7]);
    for (const r of [0, 1, 3, 4, 6, 7]) {
      state.candidates[r]![4] = new Set<Digit>([2, 6, 7, 1]);
    }
    const step = nakedTriple(state);
    expect(step?.technique).toBe('nakedTriple');
    expect(step?.eliminations.length).toBe(18); // 6 cells × 3 digits
  });

  it('finds a naked triple in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 8 spans rows 6-8, cols 6-8.
    state.candidates[6]![6] = new Set<Digit>([4, 5]);
    state.candidates[7]![7] = new Set<Digit>([5, 9]);
    state.candidates[8]![8] = new Set<Digit>([4, 9]);
    for (const [r, c] of [
      [6, 7],
      [6, 8],
      [7, 6],
      [7, 8],
      [8, 6],
      [8, 7],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([4, 5, 9, 2]);
    }
    const step = nakedTriple(state);
    expect(step?.technique).toBe('nakedTriple');
    // 6 cells × 3 digits.
    expect(step?.eliminations.length).toBe(18);
  });

  it('does not match three cells whose union exceeds 3 digits', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]); // union {1,2,3,4} — not a triple
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5]);
    }
    expect(nakedTriple(state)).toBeNull();
  });

  it('does not match when a cell has only one candidate (that would be a naked single)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([3]); // size 1 — excluded
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([4]); // size 1 — excluded
    expect(nakedTriple(state)).toBeNull();
  });

  it('returns null when the triple exists but produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([3, 4, 8]);
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([4, 8]);
    // All other cells in row 0, col 0..2, and box 0 have empty candidate sets — no eliminations.
    expect(nakedTriple(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/nakedTriple.ts`**

```ts
import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type UnitKind = 'row' | 'column' | 'box';

function scanForNakedTriple(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    // Empty cells with 2 or 3 candidates. (Cells with 1 candidate are naked singles.)
    const tripleCandidates: { coord: CellCoord; set: Set<Digit> }[] = [];
    for (const coord of unit) {
      if (state.values[coord.row]![coord.col] !== null) continue;
      const set = state.candidates[coord.row]![coord.col]!;
      if (set.size === 2 || set.size === 3) tripleCandidates.push({ coord, set });
    }
    if (tripleCandidates.length < 3) continue;

    for (let i = 0; i < tripleCandidates.length; i++) {
      for (let j = i + 1; j < tripleCandidates.length; j++) {
        for (let k = j + 1; k < tripleCandidates.length; k++) {
          const a = tripleCandidates[i]!;
          const b = tripleCandidates[j]!;
          const c = tripleCandidates[k]!;
          const union = new Set<Digit>();
          for (const d of a.set) union.add(d);
          for (const d of b.set) union.add(d);
          for (const d of c.set) union.add(d);
          if (union.size !== 3) continue;

          const digits = Array.from(union);
          const eliminations: Elimination[] = [];
          for (const coord of unit) {
            if (coord.row === a.coord.row && coord.col === a.coord.col) continue;
            if (coord.row === b.coord.row && coord.col === b.coord.col) continue;
            if (coord.row === c.coord.row && coord.col === c.coord.col) continue;
            if (state.values[coord.row]![coord.col] !== null) continue;
            const cellSet = state.candidates[coord.row]![coord.col]!;
            for (const digit of digits) {
              if (cellSet.has(digit)) eliminations.push({ cell: coord, digit });
            }
          }
          if (eliminations.length === 0) continue;

          const sortedDigits = digits.slice().sort((x, y) => x - y);
          return {
            technique: 'nakedTriple',
            highlights: [a.coord, b.coord, c.coord],
            placements: [],
            eliminations,
            explanation: `Three cells in ${kind} ${u + 1} must contain ${sortedDigits.join(', ')}, eliminating those digits from the rest of the ${kind}.`,
          };
        }
      }
    }
  }
  return null;
}

export const nakedTriple: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForNakedTriple(state, rowsOf(), 'row') ??
    scanForNakedTriple(state, colsOf(), 'column') ??
    scanForNakedTriple(state, boxesOf(), 'box')
  );
};
```

- [ ] **Step 4: Add `nakedTriple` to the registry** — edit `src/solver/techniques/index.ts`:

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
];
```

- [ ] **Step 5: Run tests — all pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 6: Typecheck, lint, format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/nakedTriple.ts src/solver/techniques/nakedTriple.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add naked triple technique detector"
```

---

## Task 4: Hidden Pair detector (`src/solver/techniques/hiddenPair.ts`)

**Files:**

- Create: `src/solver/techniques/hiddenPair.ts`
- Create: `src/solver/techniques/hiddenPair.test.ts`
- Modify: `src/solver/techniques/index.ts`

A **hidden pair** is two digits `a, b` that appear as candidates in _exactly_ the same two cells of a unit (and nowhere else in that unit). Because `a` and `b` must go in those two cells (in some order), every _other_ candidate in those two cells can be eliminated.

Differs from naked pair: the two cells may have more than 2 candidates each; the constraint is that the two digits are confined to those two cells of the unit.

If the pair pattern exists but those two cells already only contain `{a,b}` (nothing else to eliminate), return `null` — that's already a naked pair, not a useful hidden pair step.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/hiddenPair.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenPair } from './hiddenPair';

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

describe('hiddenPair', () => {
  it('returns null on an empty board (every digit is candidate everywhere)', () => {
    expect(hiddenPair(emptyState())).toBeNull();
  });

  it('finds a hidden pair in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Row 0: digits 4 and 7 appear only in cells (0,0) and (0,3); those cells have extra candidates.
    state.candidates[0]![0] = new Set<Digit>([4, 7, 2, 9]);
    state.candidates[0]![3] = new Set<Digit>([4, 7, 1, 5]);
    // Other row cells have other digits but not 4 or 7.
    for (const c of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8, 9]);
    }
    const step = hiddenPair(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 3 },
      ]),
    );
    // Eliminations: from (0,0) remove 2 and 9; from (0,3) remove 1 and 5.
    expect(step?.eliminations.length).toBe(4);
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 2 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 9 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 3 }, digit: 1 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 3 }, digit: 5 });
  });

  it('finds a hidden pair in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Column 5: digits 2 and 6 appear only in (1,5) and (7,5).
    state.candidates[1]![5] = new Set<Digit>([2, 6, 9]);
    state.candidates[7]![5] = new Set<Digit>([2, 6, 4]);
    for (const r of [0, 2, 3, 4, 5, 6, 8]) {
      state.candidates[r]![5] = new Set<Digit>([3, 5, 7, 8]);
    }
    const step = hiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.eliminations.length).toBe(2); // {9} from (1,5), {4} from (7,5)
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 5 }, digit: 9 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 7, col: 5 }, digit: 4 });
  });

  it('finds a hidden pair in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0 spans rows 0-2, cols 0-2. Digits 1 and 8 only in (0,0) and (2,2).
    state.candidates[0]![0] = new Set<Digit>([1, 8, 3, 5]);
    state.candidates[2]![2] = new Set<Digit>([1, 8, 7]);
    for (const [r, c] of [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([2, 4, 6, 9]);
    }
    const step = hiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.eliminations.length).toBe(3); // {3,5} from (0,0), {7} from (2,2)
  });

  it('returns null when the pair exists but cells have only those two digits (already a naked pair)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![3] = new Set<Digit>([4, 7]);
    // No extra candidates in the pair cells — nothing to eliminate. Don't emit a hidden pair step.
    expect(hiddenPair(state)).toBeNull();
  });

  it('does not match when a digit appears in a third cell of the unit', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7, 2]);
    state.candidates[0]![3] = new Set<Digit>([4, 7, 1]);
    state.candidates[0]![5] = new Set<Digit>([4]); // 4 also lives at (0,5) — not a hidden pair
    expect(hiddenPair(state)).toBeNull();
  });

  it('skips placed cells when counting digit occurrences', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.values[0]![0] = 5; // placed
    state.candidates[0]![0] = new Set<Digit>();
    // Real hidden pair on 4,7 between (0,1) and (0,3) with extras.
    state.candidates[0]![1] = new Set<Digit>([4, 7, 2]);
    state.candidates[0]![3] = new Set<Digit>([4, 7, 1]);
    for (const c of [2, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([3, 6, 8, 9]);
    }
    const step = hiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.eliminations.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/hiddenPair.ts`**

```ts
import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type UnitKind = 'row' | 'column' | 'box';

function cellsWithDigit(
  state: SolverState,
  unit: ReadonlyArray<CellCoord>,
  digit: Digit,
): CellCoord[] {
  const out: CellCoord[] = [];
  for (const coord of unit) {
    if (state.values[coord.row]![coord.col] !== null) continue;
    if (state.candidates[coord.row]![coord.col]!.has(digit)) out.push(coord);
  }
  return out;
}

function sameTwoCells(a: CellCoord[], b: CellCoord[]): boolean {
  if (a.length !== 2 || b.length !== 2) return false;
  // Compare as sorted (row,col) tuples.
  const key = (cs: CellCoord[]) =>
    cs
      .map((c) => `${c.row},${c.col}`)
      .sort()
      .join('|');
  return key(a) === key(b);
}

function scanForHiddenPair(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    // For each pair of digits (d1 < d2), check if both occur in exactly the same two cells.
    for (let i = 0; i < DIGITS.length; i++) {
      const d1 = DIGITS[i]!;
      const cells1 = cellsWithDigit(state, unit, d1);
      if (cells1.length !== 2) continue;
      for (let j = i + 1; j < DIGITS.length; j++) {
        const d2 = DIGITS[j]!;
        const cells2 = cellsWithDigit(state, unit, d2);
        if (!sameTwoCells(cells1, cells2)) continue;

        // The two cells must hold d1 and d2. Eliminate every OTHER digit from those cells.
        const [a, b] = cells1 as [CellCoord, CellCoord];
        const eliminations: Elimination[] = [];
        for (const coord of [a, b]) {
          const cellSet = state.candidates[coord.row]![coord.col]!;
          for (const d of cellSet) {
            if (d !== d1 && d !== d2) eliminations.push({ cell: coord, digit: d });
          }
        }
        if (eliminations.length === 0) continue; // already a naked pair — no hidden-pair step needed

        return {
          technique: 'hiddenPair',
          highlights: [a, b],
          placements: [],
          eliminations,
          explanation: `In ${kind} ${u + 1}, digits ${d1} and ${d2} can only go in cells (${a.row + 1}, ${a.col + 1}) and (${b.row + 1}, ${b.col + 1}); other candidates can be removed from those cells.`,
        };
      }
    }
  }
  return null;
}

export const hiddenPair: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForHiddenPair(state, rowsOf(), 'row') ??
    scanForHiddenPair(state, colsOf(), 'column') ??
    scanForHiddenPair(state, boxesOf(), 'box')
  );
};
```

- [ ] **Step 4: Add `hiddenPair` to the registry**:

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';
import { hiddenPair } from './hiddenPair';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
];
```

- [ ] **Step 5: Run tests — all pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 6: Typecheck, lint, format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/hiddenPair.ts src/solver/techniques/hiddenPair.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add hidden pair technique detector"
```

---

## Task 5: Hidden Triple detector (`src/solver/techniques/hiddenTriple.ts`)

**Files:**

- Create: `src/solver/techniques/hiddenTriple.ts`
- Create: `src/solver/techniques/hiddenTriple.test.ts`
- Modify: `src/solver/techniques/index.ts`

A **hidden triple** is three digits `{a, b, c}` whose candidate positions within a unit are confined to the same three cells. Each digit must appear in 2 or 3 of those cells (a digit appearing in only 1 is a hidden single — Phase 3). The three cells must collectively be the union of `a`, `b`, `c`'s candidate positions, and that union has size exactly 3. Every _other_ candidate in those three cells can be eliminated.

If no eliminations result, return `null`.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/hiddenTriple.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenTriple } from './hiddenTriple';

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

describe('hiddenTriple', () => {
  it('returns null on an empty board', () => {
    expect(hiddenTriple(emptyState())).toBeNull();
  });

  it('finds a hidden triple in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Row 0: digits 2, 5, 8 confined to cells (0,0), (0,2), (0,5) — each cell has extra candidates.
    state.candidates[0]![0] = new Set<Digit>([2, 5, 8, 1]); // extra: 1
    state.candidates[0]![2] = new Set<Digit>([2, 5, 9, 8]); // extra: 9 (and includes 2, 5, 8)
    state.candidates[0]![5] = new Set<Digit>([5, 8, 3]); // extra: 3
    // Other cells in row 0 have only candidates other than 2, 5, 8.
    for (const c of [1, 3, 4, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 3, 4, 6, 7, 9]);
    }
    const step = hiddenTriple(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenTriple');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
        { row: 0, col: 5 },
      ]),
    );
    // Eliminations: 1 from (0,0); 9 from (0,2); 3 from (0,5). Total 3.
    expect(step?.eliminations.length).toBe(3);
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 1 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 2 }, digit: 9 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 5 }, digit: 3 });
  });

  it('finds a hidden triple in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[1]![4] = new Set<Digit>([3, 6, 9, 2]);
    state.candidates[4]![4] = new Set<Digit>([3, 6, 1]);
    state.candidates[7]![4] = new Set<Digit>([6, 9, 5]);
    for (const r of [0, 2, 3, 5, 6, 8]) {
      state.candidates[r]![4] = new Set<Digit>([1, 2, 4, 5, 7, 8]);
    }
    const step = hiddenTriple(state);
    expect(step?.technique).toBe('hiddenTriple');
    // Eliminations: 2 from (1,4); 1 from (4,4); 5 from (7,4). Total 3.
    expect(step?.eliminations.length).toBe(3);
  });

  it('finds a hidden triple in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 4 spans rows 3-5, cols 3-5.
    state.candidates[3]![3] = new Set<Digit>([1, 4, 7, 2]);
    state.candidates[4]![4] = new Set<Digit>([1, 4, 8]);
    state.candidates[5]![5] = new Set<Digit>([4, 7, 3]);
    for (const [r, c] of [
      [3, 4],
      [3, 5],
      [4, 3],
      [4, 5],
      [5, 3],
      [5, 4],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([2, 3, 5, 6, 8, 9]);
    }
    const step = hiddenTriple(state);
    expect(step?.technique).toBe('hiddenTriple');
    expect(step?.eliminations.length).toBe(3); // 2, 8, 3 removed from one cell each
  });

  it('returns null when the cells already contain only the triple digits (no eliminations)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    state.candidates[0]![2] = new Set<Digit>([2, 8]);
    state.candidates[0]![5] = new Set<Digit>([5, 8]);
    // No extras — already a naked triple, hidden-triple step would be redundant.
    for (const c of [1, 3, 4, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 3, 4, 6, 7, 9]);
    }
    expect(hiddenTriple(state)).toBeNull();
  });

  it('does not match when a digit appears in a fourth cell', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([2, 5, 8, 1]);
    state.candidates[0]![2] = new Set<Digit>([2, 5, 9]);
    state.candidates[0]![5] = new Set<Digit>([5, 8, 3]);
    state.candidates[0]![7] = new Set<Digit>([2]); // 2 also lives at a fourth cell
    expect(hiddenTriple(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/hiddenTriple.ts`**

```ts
import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type UnitKind = 'row' | 'column' | 'box';

function cellsWithDigit(
  state: SolverState,
  unit: ReadonlyArray<CellCoord>,
  digit: Digit,
): CellCoord[] {
  const out: CellCoord[] = [];
  for (const coord of unit) {
    if (state.values[coord.row]![coord.col] !== null) continue;
    if (state.candidates[coord.row]![coord.col]!.has(digit)) out.push(coord);
  }
  return out;
}

function coordKey(c: CellCoord): string {
  return `${c.row},${c.col}`;
}

function scanForHiddenTriple(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;

    // Precompute digit → cells for this unit.
    const digitCells = new Map<Digit, CellCoord[]>();
    for (const digit of DIGITS) {
      const cells = cellsWithDigit(state, unit, digit);
      if (cells.length >= 2 && cells.length <= 3) digitCells.set(digit, cells);
    }
    const candidateDigits = Array.from(digitCells.keys());
    if (candidateDigits.length < 3) continue;

    for (let i = 0; i < candidateDigits.length; i++) {
      for (let j = i + 1; j < candidateDigits.length; j++) {
        for (let k = j + 1; k < candidateDigits.length; k++) {
          const d1 = candidateDigits[i]!;
          const d2 = candidateDigits[j]!;
          const d3 = candidateDigits[k]!;
          const cellSet = new Set<string>();
          for (const c of digitCells.get(d1)!) cellSet.add(coordKey(c));
          for (const c of digitCells.get(d2)!) cellSet.add(coordKey(c));
          for (const c of digitCells.get(d3)!) cellSet.add(coordKey(c));
          if (cellSet.size !== 3) continue;

          const cellsInTriple: CellCoord[] = [];
          for (const key of cellSet) {
            const [r, c] = key.split(',').map(Number) as [number, number];
            cellsInTriple.push({ row: r, col: c });
          }
          cellsInTriple.sort((a, b) => a.row - b.row || a.col - b.col);

          const eliminations: Elimination[] = [];
          for (const coord of cellsInTriple) {
            const cellCands = state.candidates[coord.row]![coord.col]!;
            for (const d of cellCands) {
              if (d !== d1 && d !== d2 && d !== d3) eliminations.push({ cell: coord, digit: d });
            }
          }
          if (eliminations.length === 0) continue; // naked triple; not useful here

          const sortedDigits = [d1, d2, d3].sort((x, y) => x - y);
          return {
            technique: 'hiddenTriple',
            highlights: cellsInTriple,
            placements: [],
            eliminations,
            explanation: `In ${kind} ${u + 1}, digits ${sortedDigits.join(', ')} can only go in three cells; other candidates can be removed from those cells.`,
          };
        }
      }
    }
  }
  return null;
}

export const hiddenTriple: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForHiddenTriple(state, rowsOf(), 'row') ??
    scanForHiddenTriple(state, colsOf(), 'column') ??
    scanForHiddenTriple(state, boxesOf(), 'box')
  );
};
```

- [ ] **Step 4: Add `hiddenTriple` to the registry**:

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';
import { hiddenPair } from './hiddenPair';
import { hiddenTriple } from './hiddenTriple';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
  hiddenTriple,
];
```

- [ ] **Step 5: Run tests — all pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 6: Typecheck, lint, format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/hiddenTriple.ts src/solver/techniques/hiddenTriple.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add hidden triple technique detector"
```

---

## Task 6: Pointing Pair detector (`src/solver/techniques/pointingPair.ts`)

**Files:**

- Create: `src/solver/techniques/pointingPair.ts`
- Create: `src/solver/techniques/pointingPair.test.ts`
- Modify: `src/solver/techniques/index.ts`

A **pointing pair** (locked candidates type 1) applies when a digit's candidate cells _within a box_ are confined to a single row or column. Because that digit must go somewhere in the box, and all its candidates in the box lie in one line, the digit can be eliminated from the rest of that line _outside_ the box.

The detector scans boxes 0..8. For each box and each digit 1..9:

- Collect the empty cells in the box that have that digit as a candidate.
- If 2 or 3 cells (a single cell is a hidden single — Phase 3 handles it) and they all share a row → eliminate the digit from the rest of that row outside the box.
- If 2 or 3 cells and they all share a column → eliminate from the rest of that column outside the box.
- Otherwise skip.

If no eliminations result, return `null`.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/techniques/pointingPair.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { pointingPair } from './pointingPair';

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

describe('pointingPair', () => {
  it('returns null on an empty board', () => {
    expect(pointingPair(emptyState())).toBeNull();
  });

  it('finds a pointing pair confined to a row within a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0 (rows 0-2, cols 0-2): digit 4 is a candidate only in (0,0) and (0,1).
    // Other cells in box 0 do not have 4. Cells in row 0 outside the box (cols 3-8) have 4.
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![1] = new Set<Digit>([4, 9]);
    for (const [r, c] of [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8]); // no 4
    }
    // Row 0 cells outside box 0: have 4.
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([4, 1, 2]);
    }

    const step = pointingPair(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('pointingPair');
    expect(step?.placements).toEqual([]);
    // 6 cells in row 0 outside box 0 × 1 digit = 6 eliminations.
    expect(step?.eliminations.length).toBe(6);
    for (let c = 3; c < 9; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 4 });
    }
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    );
  });

  it('finds a pointing pair confined to a column within a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 4 (rows 3-5, cols 3-5): digit 7 only at (3,4) and (4,4) — both in column 4.
    state.candidates[3]![4] = new Set<Digit>([7, 2]);
    state.candidates[4]![4] = new Set<Digit>([7, 5]);
    for (const [r, c] of [
      [3, 3],
      [3, 5],
      [4, 3],
      [4, 5],
      [5, 3],
      [5, 4],
      [5, 5],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8, 9]); // no 7
    }
    // Column 4 cells outside box 4: have 7.
    for (const r of [0, 1, 2, 6, 7, 8]) {
      state.candidates[r]![4] = new Set<Digit>([7, 1]);
    }

    const step = pointingPair(state);
    expect(step?.technique).toBe('pointingPair');
    expect(step?.eliminations.length).toBe(6); // 6 cells × 1 digit
    for (const r of [0, 1, 2, 6, 7, 8]) {
      expect(step?.eliminations).toContainEqual({ cell: { row: r, col: 4 }, digit: 7 });
    }
  });

  it('finds a pointing triple (three cells confined to one row)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0: digit 9 at (0,0), (0,1), (0,2) — all row 0.
    for (const c of [0, 1, 2]) {
      state.candidates[0]![c] = new Set<Digit>([9, 1]);
    }
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 4, 5, 6, 7, 8]); // no 9
    }
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([9, 2]);
    }

    const step = pointingPair(state);
    expect(step?.eliminations.length).toBe(6);
    for (let c = 3; c < 9; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 9 });
    }
  });

  it('returns null when the digit candidates span multiple rows AND columns in the box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Digit 3 at (0,0) and (1,1) — different rows and different columns.
    state.candidates[0]![0] = new Set<Digit>([3, 4]);
    state.candidates[1]![1] = new Set<Digit>([3, 5]);
    for (const [r, c] of [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 6, 7, 8, 9]);
    }
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([3, 1]);
    }
    expect(pointingPair(state)).toBeNull();
  });

  it('returns null when only one cell in the box has the digit (that is a hidden single)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 2]);
    for (const [r, c] of [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 4, 6, 7, 8, 9]); // no 5
    }
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([5, 1]);
    }
    expect(pointingPair(state)).toBeNull();
  });

  it('returns null when pointing pattern exists but produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4]);
    state.candidates[0]![1] = new Set<Digit>([4]);
    // Other row-0 cells don't have 4 — nothing to eliminate.
    for (let c = 2; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 5, 6, 7, 8, 9]);
    }
    expect(pointingPair(state)).toBeNull();
  });

  it('skips placed cells when counting digit occurrences in the box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.values[1]![1] = 4; // placed
    state.candidates[1]![1] = new Set<Digit>();
    // Box 0: 4 only at (0,0) and (0,2) — both row 0.
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![2] = new Set<Digit>([4, 8]);
    for (const [r, c] of [
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 7, 8, 9]); // no 4
    }
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([4, 1]);
    }
    const step = pointingPair(state);
    expect(step?.eliminations.length).toBe(6);
  });
});
```

- [ ] **Step 2: Run the test — should fail (module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 3: Implement `src/solver/techniques/pointingPair.ts`**

```ts
import type { CellCoord, Digit } from '../../types';
import { boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function inBox(coord: CellCoord, box: ReadonlyArray<CellCoord>): boolean {
  for (const c of box) {
    if (c.row === coord.row && c.col === coord.col) return true;
  }
  return false;
}

export const pointingPair: TechniqueDetector = (state: SolverState): Step | null => {
  const boxes = boxesOf();
  for (let b = 0; b < boxes.length; b++) {
    const box = boxes[b]!;
    for (const digit of DIGITS) {
      const cells: CellCoord[] = [];
      for (const coord of box) {
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) cells.push(coord);
      }
      if (cells.length < 2 || cells.length > 3) continue;

      const allSameRow = cells.every((c) => c.row === cells[0]!.row);
      const allSameCol = cells.every((c) => c.col === cells[0]!.col);

      let lineKind: 'row' | 'column' | null = null;
      let lineIndex = -1;
      if (allSameRow) {
        lineKind = 'row';
        lineIndex = cells[0]!.row;
      } else if (allSameCol) {
        lineKind = 'column';
        lineIndex = cells[0]!.col;
      } else {
        continue;
      }

      // Collect cells in the line, outside the box, that still have the digit.
      const eliminations: Elimination[] = [];
      for (let i = 0; i < 9; i++) {
        const coord: CellCoord =
          lineKind === 'row' ? { row: lineIndex, col: i } : { row: i, col: lineIndex };
        if (inBox(coord, box)) continue;
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) {
          eliminations.push({ cell: coord, digit });
        }
      }
      if (eliminations.length === 0) continue;

      return {
        technique: 'pointingPair',
        highlights: cells,
        placements: [],
        eliminations,
        explanation: `In box ${b + 1}, digit ${digit} is confined to ${lineKind} ${lineIndex + 1}; it can be eliminated from the rest of that ${lineKind}.`,
      };
    }
  }
  return null;
};
```

- [ ] **Step 4: Add `pointingPair` to the registry**:

```ts
import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';
import { hiddenPair } from './hiddenPair';
import { hiddenTriple } from './hiddenTriple';
import { pointingPair } from './pointingPair';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
  hiddenTriple,
  pointingPair,
];
```

- [ ] **Step 5: Run tests — all pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

- [ ] **Step 6: Typecheck, lint, format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/techniques/pointingPair.ts src/solver/techniques/pointingPair.test.ts src/solver/techniques/index.ts
git commit -m "feat(solver): add pointing pair technique detector"
```

---

## Task 7: Integration test on a curated medium puzzle

**Files:**

- Modify: `src/solver/solve.test.ts`

This task closes the coverage gap from Phase 3 where the easy puzzle solved using only naked singles. We add a curated medium puzzle that requires at least one Phase 4 technique to solve fully, and we assert (a) it solves to a valid completed grid and (b) at least one step uses a medium-tier technique.

To keep the assertion robust without committing to a hand-computed solution, the test uses an `isValidCompleteGrid` helper that checks every row, column, and box contains each digit 1..9 exactly once. The givens are verified to match the puzzle's initial state.

**Primary puzzle (well-known medium puzzle that uses hidden/naked pairs):**

```
. 6 . | 1 . 4 | . 5 .
. . 8 | 3 . 5 | 6 . .
2 . . | . . . | . . 1
------+-------+------
8 . . | 4 . 7 | . . 6
. . 6 | . . . | 3 . .
7 . . | 9 . 1 | . . 4
------+-------+------
5 . . | . . . | . . 2
. . 7 | 2 . 6 | 9 . .
. 4 . | 5 . 8 | . 7 .
```

This puzzle is from a widely-published "naked-pair" tutorial set. If the implementer finds that this specific puzzle does NOT fully solve with Phase 4 techniques, the **fallback procedure** is:

1. Confirm `result.solved === false` and inspect `result.state.values` to see how far the solver got.
2. Substitute one of these alternates (each documented as solvable with techniques up to medium tier):

   **Alternate A** (Sudoku.com.au beginner naked-pair example):

   ```
   4 . . | . . . | 9 3 .
   . . . | . . 1 | . . 5
   . 7 . | . . 6 | . 8 2
   ------+-------+------
   . . . | . 9 . | 2 5 .
   . 5 . | . . 8 | . . 6
   . . 3 | 7 . 2 | . . .
   ------+-------+------
   . . 1 | . 4 . | . 7 .
   . . . | 6 . . | . . .
   . 4 . | . . . | . . 8
   ```

   **Alternate B** (a simpler medium puzzle):

   ```
   . . . | 7 . . | . . .
   1 . . | . . . | . 2 .
   . . . | . 3 . | . . 4
   ------+-------+------
   . . . | . . . | 5 . .
   . 6 . | . 7 . | . . 8
   . . . | 9 . . | . . .
   ------+-------+------
   . . 8 | . 1 . | . 2 .
   . 3 . | . . . | . . .
   . . 9 | . . . | . . 5
   ```

3. If none solves with only Phase 4 techniques, the right move is to keep the primary puzzle's test but soften assertion (b) to `result.steps.length > 0` and add a comment documenting the gap. This indicates Phase 5 hard-tier techniques are needed for fuller coverage.

- [ ] **Step 1: Append the new test block to `src/solver/solve.test.ts`**

Append the following block at the end of `src/solver/solve.test.ts`, inside (or alongside) the existing `describe('solve', ...)` — read the file first to decide where it fits cleanly. The block adds two test cases plus one helper.

```ts
// --- Phase 4 medium-puzzle integration test ---

import type { TechniqueName } from './types';

function isValidCompleteGrid(values: (Digit | null)[][]): boolean {
  // Every cell filled.
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r]![c] === null) return false;
    }
  }
  // Every row 1..9.
  for (let r = 0; r < 9; r++) {
    const seen = new Set<Digit>();
    for (let c = 0; c < 9; c++) seen.add(values[r]![c] as Digit);
    if (seen.size !== 9) return false;
  }
  // Every column 1..9.
  for (let c = 0; c < 9; c++) {
    const seen = new Set<Digit>();
    for (let r = 0; r < 9; r++) seen.add(values[r]![c] as Digit);
    if (seen.size !== 9) return false;
  }
  // Every box 1..9.
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Set<Digit>();
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          seen.add(values[br * 3 + dr]![bc * 3 + dc] as Digit);
        }
      }
      if (seen.size !== 9) return false;
    }
  }
  return true;
}

const MEDIUM_TECHNIQUES: TechniqueName[] = [
  'nakedPair',
  'nakedTriple',
  'hiddenPair',
  'hiddenTriple',
  'pointingPair',
];

const MEDIUM_PUZZLE: (Digit | null)[][] = [
  [null, 6, null, 1, null, 4, null, 5, null],
  [null, null, 8, 3, null, 5, 6, null, null],
  [2, null, null, null, null, null, null, null, 1],
  [8, null, null, 4, null, 7, null, null, 6],
  [null, null, 6, null, null, null, 3, null, null],
  [7, null, null, 9, null, 1, null, null, 4],
  [5, null, null, null, null, null, null, null, 2],
  [null, null, 7, 2, null, 6, 9, null, null],
  [null, 4, null, 5, null, 8, null, 7, null],
];

describe('solve — medium puzzle integration', () => {
  it('solves the curated medium puzzle to a valid completed grid', () => {
    const result = solve(MEDIUM_PUZZLE);
    expect(result.solved).toBe(true);
    expect(isValidCompleteGrid(result.state.values)).toBe(true);
    // Givens preserved.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const given = MEDIUM_PUZZLE[r]![c];
        if (given !== null) expect(result.state.values[r]![c]).toBe(given);
      }
    }
  });

  it('uses at least one Phase 4 technique on the medium puzzle', () => {
    const result = solve(MEDIUM_PUZZLE);
    const usedTechniques = new Set(result.steps.map((s) => s.technique));
    const usedMedium = MEDIUM_TECHNIQUES.some((t) => usedTechniques.has(t));
    expect(usedMedium).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests** — both new ones should pass.

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

If the primary puzzle does NOT solve completely (the first new test fails), apply the fallback procedure described above the test block. Pick Alternate A first, then Alternate B if needed.

- [ ] **Step 3: Typecheck, lint, format**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck && npm run lint && npm run format:check
```

- [ ] **Step 4: Run the e2e and build gates** to confirm nothing further downstream broke.

```bash
cd /Users/dmartin/source/my-sudoku
npm run build
```

(If a Playwright run is already wired into CI, it will run there — skip locally unless something looks suspicious.)

- [ ] **Step 5: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/solver/solve.test.ts
git commit -m "test(solver): add medium puzzle integration test for Phase 4 techniques"
```

---

## Acceptance Criteria (whole phase)

After all 7 tasks complete, verify:

- [ ] `npm test` passes; test count has grown by ~35+ from Phase 3 (5 detectors × ~5 tests + 2 integration tests).
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm run format:check` exits 0.
- [ ] `npm run build` succeeds.
- [ ] `ALL_TECHNIQUES` in `src/solver/techniques/index.ts` lists, in order: `[nakedSingle, hiddenSingle, nakedPair, nakedTriple, hiddenPair, hiddenTriple, pointingPair]`.
- [ ] The curated medium puzzle in `solve.test.ts` solves to a valid completed grid AND `result.steps` contains at least one Phase 4 technique.
- [ ] Each Phase 4 technique detector has tests covering positive (technique applies with eliminations), negative (pattern doesn't exist), and edge (pattern exists but no eliminations) cases.
- [ ] `ROWS`, `COLS`, `BOXES` in `src/solver/units.ts` are frozen and exposed as `ReadonlyArray<ReadonlyArray<CellCoord>>`.
- [ ] Git log shows 7 new commits with conventional messages.

**Out of scope for this phase:**

- Hard techniques (Phase 5: `nakedQuad`, `hiddenQuad`, `xWing`, `boxLineReduction`).
- Expert techniques (Phase 6).
- Generator (Phase 7+).
- UI work (Phase 9+).

---

## Self-review checklist (for plan author)

- ☑ Each task names exact file paths and complete code, not summaries.
- ☑ Each technique task adds its detector to `ALL_TECHNIQUES` so each commit leaves the solver runnable.
- ☑ All five Phase 4 techniques covered: nakedPair, nakedTriple, hiddenPair, hiddenTriple, pointingPair.
- ☑ Detectors return `null` (not a no-op step) when the pattern produces zero eliminations — prevents infinite loops in the solver.
- ☑ Tests cover positive, negative, and no-elimination edge cases for each technique.
- ☑ No changes to `solve.ts` — the existing loop in `solve.ts:50-58` already handles `step.eliminations`.
- ☑ Integration test in Task 7 verifies medium-tier engagement without requiring a hand-computed solution.
- ☑ Defensive cleanup (frozen unit constants) included as Task 1.
- ☑ No placeholders, TBDs, or "implement appropriately" hand-waves.
