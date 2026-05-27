import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { uniqueRectangle } from './uniqueRectangle';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('uniqueRectangle (Type 1)', () => {
  it('returns null on an empty board', () => {
    expect(uniqueRectangle(emptyState())).toBeNull();
  });

  it('finds a UR Type 1 spanning 2 boxes (rows share band, cols differ stack)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[1]![0] = new Set<Digit>([4, 7]);
    state.candidates[1]![4] = new Set<Digit>([4, 7, 9]); // roof
    const step = uniqueRectangle(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('uniqueRectangle');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 4 }, digit: 4 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 4 }, digit: 7 });
    expect(step?.eliminations.length).toBe(2);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 4 },
        { row: 1, col: 0 },
        { row: 1, col: 4 },
      ]),
    );
  });

  it('returns null when rectangle spans 4 boxes (no shared band or stack)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[4]![0] = new Set<Digit>([4, 7]);
    state.candidates[4]![4] = new Set<Digit>([4, 7, 9]);
    expect(uniqueRectangle(state)).toBeNull();
  });

  it('returns null when all four corners are exactly {a,b} (no roof; deadly pattern, not Type 1)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![4] = new Set<Digit>([4, 7]);
    state.candidates[1]![0] = new Set<Digit>([4, 7]);
    state.candidates[1]![4] = new Set<Digit>([4, 7]);
    expect(uniqueRectangle(state)).toBeNull();
  });

  it('finds a UR Type 1 with cols sharing stack instead of rows sharing band', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([2, 8]);
    state.candidates[4]![0] = new Set<Digit>([2, 8]);
    state.candidates[0]![1] = new Set<Digit>([2, 8]);
    state.candidates[4]![1] = new Set<Digit>([2, 8, 5]);
    const step = uniqueRectangle(state);
    expect(step?.technique).toBe('uniqueRectangle');
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 1 }, digit: 2 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 1 }, digit: 8 });
  });
});
