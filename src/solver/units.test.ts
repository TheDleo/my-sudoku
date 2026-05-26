import { describe, it, expect } from 'vitest';
import { rowsOf, colsOf, boxesOf, boxIndexOf, peersOf, unitsContaining } from './units';
import type { CellCoord } from '../types';

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
