import { describe, it, expect } from 'vitest';
import type { Cell, Digit } from '../types';
import { cloneCells, empty9x9 } from './helpers';

describe('empty9x9', () => {
  it('returns a 9x9 grid of the value when given a non-function', () => {
    const grid = empty9x9<boolean>(false);
    expect(grid.length).toBe(9);
    for (const row of grid) {
      expect(row.length).toBe(9);
      for (const v of row) expect(v).toBe(false);
    }
  });

  it('calls the factory once per cell when given a function', () => {
    let i = 0;
    const grid = empty9x9(() => ++i);
    expect(grid[0]![0]).toBe(1);
    expect(grid[8]![8]).toBe(81);
  });
});

describe('cloneCells', () => {
  it('deep-copies cells including pencilMarks Set', () => {
    const original: Cell[][] = [
      [{ value: 5 as Digit, pencilMarks: new Set<Digit>() }],
      [{ value: null, pencilMarks: new Set<Digit>([1, 2, 3] as Digit[]) }],
    ];
    const copy = cloneCells(original);
    expect(copy).not.toBe(original);
    expect(copy[0]![0]).not.toBe(original[0]![0]);
    expect(copy[1]![0]!.pencilMarks).not.toBe(original[1]![0]!.pencilMarks);
    expect([...copy[1]![0]!.pencilMarks].sort()).toEqual([1, 2, 3]);

    // Mutating the copy must not affect the original.
    copy[1]![0]!.pencilMarks.add(9 as Digit);
    expect(original[1]![0]!.pencilMarks.has(9 as Digit)).toBe(false);
  });
});
