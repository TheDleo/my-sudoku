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
