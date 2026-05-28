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
