import { describe, it, expect } from 'vitest';
import type { Cell, Digit } from '../types';
import { empty9x9 } from '../game/helpers';
import { TECHNIQUE_LABELS, getHint } from './engine';
import { TECHNIQUE_DIFFICULTY } from '../solver/types';

describe('getHint', () => {
  it('returns null on a fully empty board', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    expect(getHint(cells)).toBeNull();
  });

  it('returns a nakedSingle step when exactly one candidate remains in a cell', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Place 1–8 in row 0 cols 0–7; cell (0,8) can only be 9
    for (let c = 0; c < 8; c++) {
      cells[0]![c]!.value = (c + 1) as Digit;
    }
    const step = getHint(cells);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedSingle');
    expect(step?.placements[0]?.digit).toBe(9);
    expect(step?.placements[0]?.cell).toEqual({ row: 0, col: 8 });
  });

  it('returns null on a fully solved board', () => {
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    // Fill every cell with a valid solved grid: cell (r,c) = ((r*3 + r/3 + c) % 9) + 1
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells[r]![c]!.value = (((r * 3 + Math.floor(r / 3) + c) % 9) + 1) as Digit;
      }
    }
    expect(getHint(cells)).toBeNull();
  });
});

describe('TECHNIQUE_LABELS', () => {
  it('has a label for every technique in TECHNIQUE_DIFFICULTY', () => {
    const keys = Object.keys(TECHNIQUE_LABELS);
    expect(keys.length).toBe(Object.keys(TECHNIQUE_DIFFICULTY).length);
    for (const label of Object.values(TECHNIQUE_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
