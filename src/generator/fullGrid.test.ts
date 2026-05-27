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
