import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedSingle } from './nakedSingle';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

describe('nakedSingle', () => {
  it('returns null when no cell has exactly one candidate', () => {
    expect(nakedSingle(emptyState())).toBeNull();
  });

  it('finds a cell with exactly one candidate and returns a placement step', () => {
    const state = emptyState();
    state.candidates[3]![4] = new Set<Digit>([7]);
    const step = nakedSingle(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedSingle');
    expect(step?.placements).toEqual([{ cell: { row: 3, col: 4 }, digit: 7 }]);
    expect(step?.eliminations).toEqual([]);
    expect(step?.highlights).toEqual([{ row: 3, col: 4 }]);
  });

  it('scans row-major and returns the first naked single', () => {
    const state = emptyState();
    state.candidates[5]![5] = new Set<Digit>([2]); // later in row-major
    state.candidates[1]![8] = new Set<Digit>([9]); // earlier in row-major
    const step = nakedSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 1, col: 8 }, digit: 9 }]);
  });

  it('skips cells with two or more candidates', () => {
    const state = emptyState();
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([3, 4, 5]);
    state.candidates[0]![2] = new Set<Digit>([6]);
    const step = nakedSingle(state);
    expect(step?.placements).toEqual([{ cell: { row: 0, col: 2 }, digit: 6 }]);
  });

  it('skips cells that already have a value (empty candidate set)', () => {
    const state = emptyState();
    state.values[0]![0] = 5;
    state.candidates[0]![0] = new Set<Digit>(); // placed cells have empty candidates
    expect(nakedSingle(state)).toBeNull();
  });

  it('explanation mentions the cell and digit', () => {
    const state = emptyState();
    state.candidates[2]![3] = new Set<Digit>([8]);
    const step = nakedSingle(state);
    expect(step?.explanation).toMatch(/8/);
  });
});
