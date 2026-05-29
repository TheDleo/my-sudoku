import { describe, it, expect } from 'vitest';
import type { Cell, Digit } from '../types';
import { empty9x9 } from '../game/helpers';
import { TECHNIQUE_LABELS, getHint } from './engine';

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
  });
});

describe('TECHNIQUE_LABELS', () => {
  it('has a label for all 16 techniques', () => {
    const keys = Object.keys(TECHNIQUE_LABELS);
    expect(keys.length).toBe(16);
    for (const label of Object.values(TECHNIQUE_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
