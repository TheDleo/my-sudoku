# Phase 2: Domain Types and Pure Helpers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Foundational pure code — types and the small set of pure helper functions that every later phase will lean on. All TDD, no UI surface.

**Architecture:** Two layers. (1) `src/types.ts` holds the cross-cutting primitives: `Digit`, `CellCoord`, `Difficulty`, `Cell`, `Board`, `SolvedGrid`, `Puzzle`. These are imported everywhere. (2) `src/solver/` begins with two pure modules: `units.ts` (row/column/box/peer accessors over coordinates only — no board state) and `candidates.ts` (compute and update sudoku candidate sets given board values).

**Tech Stack:** No new dependencies. Uses Vitest + the existing TypeScript strict config.

**Working directory:** `/Users/dmartin/source/my-sudoku`

**Design notes — locked in before tasks:**

- Coordinates are zero-indexed. `row: 0..8`, `col: 0..8`. Box index 0..8 maps left-to-right, top-to-bottom: box 0 is the top-left 3×3, box 8 is the bottom-right.
- `box(coord)` for coord (r, c) = `Math.floor(r / 3) * 3 + Math.floor(c / 3)`.
- A cell's **peers** are all other cells in its row, column, or box. Self is excluded. There are always exactly 20 peers per cell (8 row + 8 col + 4 remaining box cells, total 20; row/col share the cell itself, box overlaps with row and col but those overlaps are deduplicated).
- `removeCandidateFromPeers` takes the **candidates grid only** (not a `SolverState` — that type is introduced in Phase 3). Signature: `removeCandidateFromPeers(candidates: Set<Digit>[][], coord: CellCoord, digit: Digit): Set<Digit>[][]`. Returns a NEW grid (immutable). The input grid is not mutated.
- `computeCandidates` produces an empty `Set<Digit>` for cells that already have a value (no candidates needed when the cell is filled).
- All helpers operate on plain data, never on React or Zustand types.
- TDD discipline: every helper is test-first. Hand-craft the test input, write the assertion, watch it fail, implement, watch it pass.

---

## Task 1: Cross-cutting types (`src/types.ts`)

**Files:**

- Create: `src/types.ts`
- Create: `src/types.test.ts`

**Note on type testing approach:** `expectTypeOf` is intentionally not used here. Under strict mode, `expectTypeOf(d).toEqualTypeOf<Digit>()` where `d: Digit = 5` collapses because TS narrows `d` to the literal `5` despite the annotation. The pattern we use instead: explicit type annotations on fixtures (`const x: T = ...`) ARE the compile-time check — if a type is wrong, the file won't compile — and runtime assertions confirm the structure is usable.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/types.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit, CellCoord, Difficulty, Cell, Board, SolvedGrid, Puzzle } from './types';

describe('types', () => {
  it('Digit accepts all nine sudoku digits', () => {
    const digits: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(digits).toHaveLength(9);
  });

  it('CellCoord has row and col as numbers', () => {
    const c: CellCoord = { row: 3, col: 7 };
    expect(c.row).toBe(3);
    expect(c.col).toBe(7);
  });

  it('Difficulty accepts the four tier strings', () => {
    const tiers: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
    expect(tiers).toEqual(['easy', 'medium', 'hard', 'expert']);
  });

  it('Cell holds an optional value and a Set of pencil marks', () => {
    const empty: Cell = { value: null, pencilMarks: new Set<Digit>() };
    expect(empty.value).toBeNull();
    expect(empty.pencilMarks.size).toBe(0);

    const filled: Cell = { value: 7, pencilMarks: new Set<Digit>([1, 2, 3]) };
    expect(filled.value).toBe(7);
    expect(filled.pencilMarks.has(2)).toBe(true);
    expect(filled.pencilMarks.size).toBe(3);
  });

  it('Board is a 9x9 nested Cell array', () => {
    const empty: Cell = { value: null, pencilMarks: new Set<Digit>() };
    const board: Board = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => empty));
    expect(board).toHaveLength(9);
    expect(board[0]).toHaveLength(9);
  });

  it('SolvedGrid is a 9x9 Digit grid', () => {
    const solved: SolvedGrid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, (): Digit => 1),
    );
    expect(solved).toHaveLength(9);
    expect(solved[0]).toHaveLength(9);
    expect(solved[0]?.[0]).toBe(1);
  });

  it('Puzzle holds id, difficulty, initialBoard, and solution', () => {
    const solved: SolvedGrid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, (): Digit => 1),
    );
    const initial: (Digit | null)[][] = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, (): Digit | null => null),
    );
    const p: Puzzle = {
      id: 'p-001',
      difficulty: 'easy',
      initialBoard: initial,
      solution: solved,
    };
    expect(p.id).toBe('p-001');
    expect(p.difficulty).toBe('easy');
    expect(p.initialBoard).toBe(initial);
    expect(p.solution).toBe(solved);
  });
});
```

- [ ] **Step 2: Run the test (should fail — file doesn't exist)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

Expected: failure due to missing `./types` module.

- [ ] **Step 3: Implement `src/types.ts`**

```ts
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CellCoord = { row: number; col: number };

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Cell = {
  value: Digit | null;
  pencilMarks: Set<Digit>;
};

export type Board = Cell[][];

export type SolvedGrid = Digit[][];

export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  initialBoard: (Digit | null)[][];
  solution: SolvedGrid;
};
```

- [ ] **Step 4: Run tests — should pass**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

Expected: all type tests pass (including the App smoke test from Phase 1).

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/dmartin/source/my-sudoku
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/dmartin/source/my-sudoku
git add src/types.ts src/types.test.ts
git commit -m "feat(types): add cross-cutting domain types"
```

---

## Task 2: Unit accessors (`src/solver/units.ts` — rows, cols, boxes)

**Files:**

- Create: `src/solver/units.ts`
- Create: `src/solver/units.test.ts`

These three functions return coordinate-only views: they don't touch board state. They are deterministic constants of the 9×9 sudoku geometry, computed once.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/units.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { rowsOf, colsOf, boxesOf, boxIndexOf } from './units';

describe('rowsOf', () => {
  it('returns 9 rows', () => {
    expect(rowsOf()).toHaveLength(9);
  });

  it('each row has 9 cells', () => {
    for (const row of rowsOf()) {
      expect(row).toHaveLength(9);
    }
  });

  it('row 0 contains coords (0,0)..(0,8) in order', () => {
    const row0 = rowsOf()[0];
    expect(row0).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 0, col: 5 },
      { row: 0, col: 6 },
      { row: 0, col: 7 },
      { row: 0, col: 8 },
    ]);
  });

  it('row 8 contains coords (8,0)..(8,8)', () => {
    const row8 = rowsOf()[8];
    expect(row8?.[0]).toEqual({ row: 8, col: 0 });
    expect(row8?.[8]).toEqual({ row: 8, col: 8 });
  });
});

describe('colsOf', () => {
  it('returns 9 columns', () => {
    expect(colsOf()).toHaveLength(9);
  });

  it('col 0 contains coords (0,0)..(8,0)', () => {
    const col0 = colsOf()[0];
    expect(col0).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
      { row: 4, col: 0 },
      { row: 5, col: 0 },
      { row: 6, col: 0 },
      { row: 7, col: 0 },
      { row: 8, col: 0 },
    ]);
  });

  it('col 4 contains all cells in column 4', () => {
    const col4 = colsOf()[4];
    expect(col4).toHaveLength(9);
    expect(col4?.every((c) => c.col === 4)).toBe(true);
  });
});

describe('boxesOf', () => {
  it('returns 9 boxes', () => {
    expect(boxesOf()).toHaveLength(9);
  });

  it('each box has 9 cells', () => {
    for (const box of boxesOf()) {
      expect(box).toHaveLength(9);
    }
  });

  it('box 0 is the top-left 3x3', () => {
    expect(boxesOf()[0]).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it('box 4 is the center 3x3 (rows 3-5, cols 3-5)', () => {
    const box4 = boxesOf()[4];
    expect(box4).toContainEqual({ row: 3, col: 3 });
    expect(box4).toContainEqual({ row: 4, col: 4 });
    expect(box4).toContainEqual({ row: 5, col: 5 });
    expect(box4).toHaveLength(9);
    expect(box4?.every((c) => c.row >= 3 && c.row <= 5 && c.col >= 3 && c.col <= 5)).toBe(true);
  });

  it('box 8 is the bottom-right 3x3', () => {
    const box8 = boxesOf()[8];
    expect(box8?.[0]).toEqual({ row: 6, col: 6 });
    expect(box8?.[8]).toEqual({ row: 8, col: 8 });
  });
});

describe('boxIndexOf', () => {
  it('maps (0,0) to box 0', () => {
    expect(boxIndexOf({ row: 0, col: 0 })).toBe(0);
  });
  it('maps (2,2) to box 0', () => {
    expect(boxIndexOf({ row: 2, col: 2 })).toBe(0);
  });
  it('maps (0,3) to box 1', () => {
    expect(boxIndexOf({ row: 0, col: 3 })).toBe(1);
  });
  it('maps (3,0) to box 3', () => {
    expect(boxIndexOf({ row: 3, col: 0 })).toBe(3);
  });
  it('maps (4,4) to box 4', () => {
    expect(boxIndexOf({ row: 4, col: 4 })).toBe(4);
  });
  it('maps (8,8) to box 8', () => {
    expect(boxIndexOf({ row: 8, col: 8 })).toBe(8);
  });
});
```

- [ ] **Step 2: Run the test (should fail — file doesn't exist)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

Expected: failure due to missing module.

- [ ] **Step 3: Implement `src/solver/units.ts`**

```ts
import type { CellCoord } from '../types';

const SIZE = 9;
const BOX = 3;

export function boxIndexOf(coord: CellCoord): number {
  return Math.floor(coord.row / BOX) * BOX + Math.floor(coord.col / BOX);
}

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

- [ ] **Step 4: Run tests — all pass**

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
git add src/solver/units.ts src/solver/units.test.ts
git commit -m "feat(solver): add row/col/box unit accessors"
```

---

## Task 3: Peer accessors (`src/solver/units.ts` — peersOf, unitsContaining)

**Files:**

- Modify: `src/solver/units.ts`
- Modify: `src/solver/units.test.ts`

This task builds on Task 2's accessors. It adds two more exports to the same module: `peersOf` (the 20 peers of a cell) and `unitsContaining` (the row, column, and box that contain a given cell).

- [ ] **Step 1: Add failing tests to `src/solver/units.test.ts`** — append the following describe blocks at the end of the file:

```ts
describe('peersOf', () => {
  it('returns exactly 20 peers for any cell', () => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(peersOf({ row: r, col: c })).toHaveLength(20);
      }
    }
  });

  it('excludes the cell itself', () => {
    const peers = peersOf({ row: 4, col: 4 });
    expect(peers).not.toContainEqual({ row: 4, col: 4 });
  });

  it('includes all other cells in the same row', () => {
    const peers = peersOf({ row: 0, col: 0 });
    for (let c = 1; c < 9; c++) {
      expect(peers).toContainEqual({ row: 0, col: c });
    }
  });

  it('includes all other cells in the same column', () => {
    const peers = peersOf({ row: 0, col: 0 });
    for (let r = 1; r < 9; r++) {
      expect(peers).toContainEqual({ row: r, col: 0 });
    }
  });

  it('includes the remaining cells in the same box (not already in row/col)', () => {
    const peers = peersOf({ row: 0, col: 0 });
    expect(peers).toContainEqual({ row: 1, col: 1 });
    expect(peers).toContainEqual({ row: 1, col: 2 });
    expect(peers).toContainEqual({ row: 2, col: 1 });
    expect(peers).toContainEqual({ row: 2, col: 2 });
  });

  it('does not duplicate coordinates', () => {
    const peers = peersOf({ row: 4, col: 4 });
    const seen = new Set<string>();
    for (const p of peers) {
      const key = `${p.row},${p.col}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('peer relationships are symmetric', () => {
    const samples: CellCoord[] = [
      { row: 0, col: 0 },
      { row: 4, col: 4 },
      { row: 8, col: 8 },
      { row: 2, col: 5 },
      { row: 6, col: 1 },
    ];
    for (const a of samples) {
      const peersOfA = peersOf(a);
      for (const b of peersOfA) {
        const peersOfB = peersOf(b);
        expect(peersOfB).toContainEqual(a);
      }
    }
  });
});

describe('unitsContaining', () => {
  it('returns exactly 3 units (row, col, box)', () => {
    expect(unitsContaining({ row: 0, col: 0 })).toHaveLength(3);
  });

  it('the three units each contain the cell itself', () => {
    const cell: CellCoord = { row: 4, col: 5 };
    for (const unit of unitsContaining(cell)) {
      expect(unit).toContainEqual(cell);
    }
  });

  it('each unit has 9 cells', () => {
    for (const unit of unitsContaining({ row: 3, col: 7 })) {
      expect(unit).toHaveLength(9);
    }
  });

  it('the first unit is the row, second the column, third the box (for stable iteration)', () => {
    const [row, col, box] = unitsContaining({ row: 2, col: 5 });
    expect(row?.every((c) => c.row === 2)).toBe(true);
    expect(col?.every((c) => c.col === 5)).toBe(true);
    expect(box?.every((c) => Math.floor(c.row / 3) === 0 && Math.floor(c.col / 3) === 1)).toBe(
      true,
    );
  });
});
```

You will also need to update the top-level import in the same test file to include the new functions:

Change the existing import from:

```ts
import { rowsOf, colsOf, boxesOf, boxIndexOf } from './units';
```

to:

```ts
import { rowsOf, colsOf, boxesOf, boxIndexOf, peersOf, unitsContaining } from './units';
import type { CellCoord } from '../types';
```

- [ ] **Step 2: Run the test (new tests should fail — functions don't exist)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

Expected: new tests fail; old tests still pass.

- [ ] **Step 3: Add `peersOf` and `unitsContaining` to `src/solver/units.ts`** — append at the end of the file:

```ts
const PEERS: CellCoord[][] = (() => {
  const cache: CellCoord[][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const self = { row: r, col: c };
      const seen = new Set<string>();
      const out: CellCoord[] = [];
      const consider = (coord: CellCoord) => {
        if (coord.row === self.row && coord.col === self.col) return;
        const key = `${coord.row},${coord.col}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(coord);
      };
      for (const cell of ROWS[r]!) consider(cell);
      for (const cell of COLS[c]!) consider(cell);
      for (const cell of BOXES[boxIndexOf(self)]!) consider(cell);
      cache[r * SIZE + c] = out;
    }
  }
  return cache;
})();

export function peersOf(coord: CellCoord): CellCoord[] {
  return PEERS[coord.row * SIZE + coord.col]!;
}

export function unitsContaining(coord: CellCoord): CellCoord[][] {
  return [ROWS[coord.row]!, COLS[coord.col]!, BOXES[boxIndexOf(coord)]!];
}
```

- [ ] **Step 4: Run tests — all pass**

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
git add src/solver/units.ts src/solver/units.test.ts
git commit -m "feat(solver): add peer and unit-membership accessors"
```

---

## Task 4: Candidate computation (`src/solver/candidates.ts`)

**Files:**

- Create: `src/solver/candidates.ts`
- Create: `src/solver/candidates.test.ts`

Two pure functions over candidate sets. `computeCandidates` derives a 9×9 grid of valid candidate sets from a 9×9 grid of values. `removeCandidateFromPeers` returns a new candidates grid with one digit eliminated from all 20 peer cells of a coordinate.

- [ ] **Step 1: Write the failing test** at `/Users/dmartin/source/my-sudoku/src/solver/candidates.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { computeCandidates, removeCandidateFromPeers } from './candidates';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyValues(): (Digit | null)[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null as Digit | null));
}

function emptyCandidates(): Set<Digit>[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<Digit>(ALL)));
}

describe('computeCandidates', () => {
  it('on an empty board, every cell has all 9 candidates', () => {
    const result = computeCandidates(emptyValues());
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result[r]?.[c]).toEqual(new Set<Digit>(ALL));
      }
    }
  });

  it('cells with a value have an empty candidate set', () => {
    const values = emptyValues();
    values[0]![0] = 5;
    const result = computeCandidates(values);
    expect(result[0]?.[0]?.size).toBe(0);
  });

  it('placing a 5 at (0,0) removes 5 from candidates in row 0, col 0, and box 0', () => {
    const values = emptyValues();
    values[0]![0] = 5;
    const result = computeCandidates(values);

    // row 0 peers
    for (let c = 1; c < 9; c++) {
      expect(result[0]?.[c]?.has(5)).toBe(false);
    }
    // col 0 peers
    for (let r = 1; r < 9; r++) {
      expect(result[r]?.[0]?.has(5)).toBe(false);
    }
    // box 0 peers (excluding row 0 and col 0 cells, which are already covered)
    expect(result[1]?.[1]?.has(5)).toBe(false);
    expect(result[1]?.[2]?.has(5)).toBe(false);
    expect(result[2]?.[1]?.has(5)).toBe(false);
    expect(result[2]?.[2]?.has(5)).toBe(false);

    // cells outside row 0, col 0, and box 0 should still have 5 as a candidate
    expect(result[4]?.[4]?.has(5)).toBe(true);
    expect(result[8]?.[8]?.has(5)).toBe(true);
  });

  it('multiple placements compound correctly', () => {
    const values = emptyValues();
    values[0]![0] = 5;
    values[0]![1] = 3;
    const result = computeCandidates(values);

    // cell (0, 2) should be missing both 5 (same row) and 3 (same row)
    expect(result[0]?.[2]?.has(5)).toBe(false);
    expect(result[0]?.[2]?.has(3)).toBe(false);
    // but should still have other digits
    expect(result[0]?.[2]?.has(1)).toBe(true);
  });

  it('a fully filled board yields all empty candidate sets', () => {
    // Build a trivially solved 9x9 (any valid Latin-square-style fill works; we use modular shift)
    const values: (Digit | null)[][] = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (((r * 3 + Math.floor(r / 3) + c) % 9) + 1) as Digit),
    );
    const result = computeCandidates(values);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result[r]?.[c]?.size).toBe(0);
      }
    }
  });
});

describe('removeCandidateFromPeers', () => {
  it('removes the digit from all 20 peers', () => {
    const candidates = emptyCandidates();
    const result = removeCandidateFromPeers(candidates, { row: 4, col: 4 }, 7);

    // sample a few peers
    expect(result[4]?.[0]?.has(7)).toBe(false); // same row
    expect(result[0]?.[4]?.has(7)).toBe(false); // same col
    expect(result[3]?.[3]?.has(7)).toBe(false); // same box
    expect(result[5]?.[5]?.has(7)).toBe(false); // same box
  });

  it('does not affect cells that are not peers', () => {
    const candidates = emptyCandidates();
    const result = removeCandidateFromPeers(candidates, { row: 0, col: 0 }, 5);

    // (4, 4) is not a peer of (0, 0)
    expect(result[4]?.[4]?.has(5)).toBe(true);
    // (8, 8) is not a peer of (0, 0)
    expect(result[8]?.[8]?.has(5)).toBe(true);
  });

  it('does not mutate the input grid', () => {
    const candidates = emptyCandidates();
    const before = candidates[4]?.[0]?.has(7);
    removeCandidateFromPeers(candidates, { row: 4, col: 4 }, 7);
    const after = candidates[4]?.[0]?.has(7);
    expect(before).toBe(true);
    expect(after).toBe(true);
  });

  it('is idempotent — applying twice equals applying once', () => {
    const candidates = emptyCandidates();
    const once = removeCandidateFromPeers(candidates, { row: 2, col: 5 }, 9);
    const twice = removeCandidateFromPeers(once, { row: 2, col: 5 }, 9);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(once[r]?.[c]).toEqual(twice[r]?.[c]);
      }
    }
  });

  it('leaves the placed cell untouched in the returned grid', () => {
    const candidates = emptyCandidates();
    const result = removeCandidateFromPeers(candidates, { row: 3, col: 3 }, 4);
    // The cell at (3,3) itself was not a peer; the function does not modify it.
    expect(result[3]?.[3]).toEqual(candidates[3]?.[3]);
  });
});
```

- [ ] **Step 2: Run the test (should fail — module missing)**

```bash
cd /Users/dmartin/source/my-sudoku
npm test
```

Expected: failure due to missing `./candidates` module.

- [ ] **Step 3: Implement `src/solver/candidates.ts`**

```ts
import type { CellCoord, Digit } from '../types';
import { peersOf, unitsContaining } from './units';

const ALL_DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function computeCandidates(values: (Digit | null)[][]): Set<Digit>[][] {
  const result: Set<Digit>[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<Digit>()),
  );

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r]![c] !== null) continue; // filled cells have empty candidate set
      const cellCandidates = new Set<Digit>(ALL_DIGITS);
      for (const unit of unitsContaining({ row: r, col: c })) {
        for (const peer of unit) {
          const v = values[peer.row]![peer.col];
          if (v !== null) cellCandidates.delete(v);
        }
      }
      result[r]![c] = cellCandidates;
    }
  }

  return result;
}

export function removeCandidateFromPeers(
  candidates: Set<Digit>[][],
  coord: CellCoord,
  digit: Digit,
): Set<Digit>[][] {
  const peers = peersOf(coord);
  const peerKeys = new Set(peers.map((p) => `${p.row},${p.col}`));

  return candidates.map((row, r) =>
    row.map((set, c) => {
      if (!peerKeys.has(`${r},${c}`)) return set;
      if (!set.has(digit)) return set;
      const next = new Set(set);
      next.delete(digit);
      return next;
    }),
  );
}
```

- [ ] **Step 4: Run tests — all pass**

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
git add src/solver/candidates.ts src/solver/candidates.test.ts
git commit -m "feat(solver): add candidate computation and peer elimination"
```

---

## Acceptance Criteria (whole phase)

After all 4 tasks complete, verify:

- [ ] `npm test` passes with all of: Phase 1 App smoke test, types tests, units tests (rows/cols/boxes/peers/unitsContaining/boxIndexOf), candidates tests (computeCandidates + removeCandidateFromPeers).
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0 with no warnings.
- [ ] `npm run format:check` exits 0.
- [ ] `npm run build` succeeds (the new pure modules don't affect the bundle since nothing imports them yet — but build must still pass).
- [ ] Test coverage of the new modules is effectively 100% (every branch exercised).
- [ ] Peer relationships are verified symmetric via the included test.
- [ ] The git log shows 4 new commits, one per task, with conventional messages.

**Out of scope for this phase:** any solver techniques (Phase 3+), generator (Phase 7), Web Worker (Phase 8), store (Phase 9), UI (Phase 10+).
