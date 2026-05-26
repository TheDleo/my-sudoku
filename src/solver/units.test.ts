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
