import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenSingle } from './hiddenSingle';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

describe('hiddenSingle', () => {
  it('returns null on an empty board (every digit is candidate everywhere — never a single)', () => {
    expect(hiddenSingle(emptyState())).toBeNull();
  });

  it('finds a hidden single in a row', () => {
    const state = emptyState();
    // In row 0, remove digit 5 from every cell except (0, 4).
    for (let c = 0; c < 9; c++) {
      if (c !== 4) state.candidates[0]![c]!.delete(5);
    }
    const step = hiddenSingle(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenSingle');
    expect(step?.placements).toEqual([{ cell: { row: 0, col: 4 }, digit: 5 }]);
    expect(step?.highlights).toContainEqual({ row: 0, col: 4 });
  });

  it('finds a hidden single in a column', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      if (r !== 6) state.candidates[r]![2]!.delete(8);
    }
    const step = hiddenSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 6, col: 2 }, digit: 8 }]);
  });

  it('finds a hidden single in a box', () => {
    const state = emptyState();
    // Box 4 spans rows 3-5, cols 3-5. Remove digit 1 from every cell in box 4 except (4, 4).
    for (let r = 3; r <= 5; r++) {
      for (let c = 3; c <= 5; c++) {
        if (!(r === 4 && c === 4)) state.candidates[r]![c]!.delete(1);
      }
    }
    const step = hiddenSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 4, col: 4 }, digit: 1 }]);
  });

  it('returns null when every digit is present as a candidate in 2+ cells of every unit', () => {
    expect(hiddenSingle(emptyState())).toBeNull();
  });

  it("skips digits already placed (not in any cell's candidates within the unit)", () => {
    const state = emptyState();
    // Place 3 at (0, 0); clear 3 from row 0 candidates everywhere.
    state.values[0]![0] = 3;
    state.candidates[0]![0] = new Set<Digit>();
    for (let c = 1; c < 9; c++) state.candidates[0]![c]!.delete(3);
    // No hidden single for 3 in row 0 (it's placed, not a candidate in any cell of the row).
    expect(hiddenSingle(state)).toBeNull();
  });

  it('explanation names the unit type and digit', () => {
    const state = emptyState();
    for (let c = 0; c < 9; c++) {
      if (c !== 4) state.candidates[0]![c]!.delete(5);
    }
    const step = hiddenSingle(state);
    expect(step?.explanation).toMatch(/5/);
    expect(step?.explanation).toMatch(/row/i);
  });
});
