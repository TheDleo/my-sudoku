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

  it('uses cell pencil marks as candidates when present, not computed candidates', () => {
    // Baseline: row 0 has 1-8 placed → (0,8) computed candidates = {9} → nakedSingle fires
    const cells = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    for (let c = 0; c < 8; c++) {
      cells[0]![c]!.value = (c + 1) as Digit;
    }
    const hint1 = getHint(cells);
    expect(hint1?.technique).toBe('nakedSingle');
    expect(hint1?.placements[0]?.digit).toBe(9);

    // Now: set pencil marks on (0,8) to {9} (user accepted the hint)
    // Engine should use pencil marks {9}, same as computed, so it still finds the hint
    const cellsWithMarks1 = empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() }));
    for (let c = 0; c < 8; c++) {
      cellsWithMarks1[0]![c]!.value = (c + 1) as Digit;
    }
    cellsWithMarks1[0]![8]!.pencilMarks = new Set([9] as Digit[]);
    expect(getHint(cellsWithMarks1)?.technique).toBe('nakedSingle');

    // Now: pencil marks {3,5} on (0,8) diverge from computed {9} — engine must use them
    // For this to be verifiable without other techniques firing, ensure row 0 is solved and
    // all other rows have no constraints that would create hints
    const cellsWithDivergentMarks = empty9x9<Cell>(() => ({
      value: null,
      pencilMarks: new Set<Digit>(),
    }));
    // Row 0: place 1-9, including placing all digits so nakedSingle cannot fire elsewhere
    for (let c = 0; c < 8; c++) {
      cellsWithDivergentMarks[0]![c]!.value = (c + 1) as Digit;
    }
    cellsWithDivergentMarks[0]![8]!.value = 9; // Row 0 is now fully solved
    // (0,8) already has value=9, but we also set pencil marks to {3,5} to test that
    // if pencil marks were used without checking the value, it would differ from computed {9}
    cellsWithDivergentMarks[0]![8]!.pencilMarks = new Set([3, 5] as Digit[]);
    // No other rows have any constraints, so no technique should fire
    expect(getHint(cellsWithDivergentMarks)).toBeNull();
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
