import { describe, it, expect } from 'vitest';
import type { Cell, Digit } from '../types';
import { cloneCells, computeCandidates, empty9x9, formatTime, getRemainingCounts } from './helpers';

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

describe('getRemainingCounts', () => {
  it('returns 9 for every digit when all cells are empty', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    const counts = getRemainingCounts(cells);
    for (let d = 1; d <= 9; d++) {
      expect(counts[d as Digit]).toBe(9);
    }
  });

  it('returns 8 for the placed digit and 9 for all others', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    cells[0]![0]!.value = 5 as Digit;
    const counts = getRemainingCounts(cells);
    expect(counts[5 as Digit]).toBe(8);
    expect(counts[1 as Digit]).toBe(9);
    expect(counts[9 as Digit]).toBe(9);
  });

  it('returns 0 for a digit placed in all 9 cells of a row', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    for (let c = 0; c < 9; c++) {
      cells[0]![c]!.value = 3 as Digit;
    }
    const counts = getRemainingCounts(cells);
    expect(counts[3 as Digit]).toBe(0);
    expect(counts[1 as Digit]).toBe(9);
  });
});

describe('computeCandidates', () => {
  it('gives every empty cell all 9 candidates on an empty board', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    const result = computeCandidates(cells);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        expect(result[r]![c]!.pencilMarks.size).toBe(9);
      }
    }
  });

  it('excludes digits already placed in peer cells', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Place 1–5 in row-0 peers of (0,0)
    cells[0]![1]!.value = 1 as Digit;
    cells[0]![2]!.value = 2 as Digit;
    cells[0]![3]!.value = 3 as Digit;
    cells[0]![4]!.value = 4 as Digit;
    cells[0]![5]!.value = 5 as Digit;
    const result = computeCandidates(cells);
    const marks = result[0]![0]!.pencilMarks;
    expect(marks.has(1 as Digit)).toBe(false);
    expect(marks.has(5 as Digit)).toBe(false);
    expect(marks.has(6 as Digit)).toBe(true);
    expect(marks.has(9 as Digit)).toBe(true);
  });

  it('preserves an existing pencil mark that is a valid candidate (union)', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    cells[0]![0]!.pencilMarks.add(6 as Digit);
    const result = computeCandidates(cells);
    expect(result[0]![0]!.pencilMarks.has(6 as Digit)).toBe(true);
  });

  it('preserves an existing pencil mark that is NOT a valid candidate (no removal)', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Peer (0,1) has 1 → 1 is invalid for (0,0), but the existing mark must survive
    cells[0]![1]!.value = 1 as Digit;
    cells[0]![0]!.pencilMarks.add(1 as Digit);
    const result = computeCandidates(cells);
    expect(result[0]![0]!.pencilMarks.has(1 as Digit)).toBe(true);
  });

  it('leaves a cell with a placed value completely untouched', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    cells[0]![0]!.value = 5 as Digit;
    const result = computeCandidates(cells);
    expect(result[0]![0]!.value).toBe(5);
    expect(result[0]![0]!.pencilMarks.size).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats 0ms as "0:00"', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 59000ms as "0:59"', () => {
    expect(formatTime(59000)).toBe('0:59');
  });

  it('formats 60000ms as "1:00"', () => {
    expect(formatTime(60000)).toBe('1:00');
  });

  it('formats 227000ms as "3:47"', () => {
    expect(formatTime(227000)).toBe('3:47');
  });

  it('formats 3661000ms as "61:01" (no hour cap)', () => {
    expect(formatTime(3661000)).toBe('61:01');
  });
});
