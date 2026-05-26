import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { xWing } from './xWing';

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

describe('xWing', () => {
  it('returns null on an empty board', () => {
    expect(xWing(emptyState())).toBeNull();
  });

  it('finds a row-pattern X-Wing on digit D in rows r1<r2, cols c1<c2', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Digit 5 in row 0 only at (0,0) and (0,4).
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    // Digit 5 in row 3 only at (3,0) and (3,4).
    state.candidates[3]![0] = new Set<Digit>([5, 2]);
    state.candidates[3]![4] = new Set<Digit>([5, 8]);
    // Other cells in rows 0 and 3 have no candidates (to avoid spurious X-Wing patterns with other digits).
    for (const c of [1, 2, 3, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>();
      state.candidates[3]![c] = new Set<Digit>();
    }
    // Cells in columns 0 and 4 outside rows 0 and 3 have digit 5 as candidate (eliminable).
    for (const r of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([5, 1]);
      state.candidates[r]![4] = new Set<Digit>([5, 2]);
      // Add extra candidate to prevent these rows from being pattern rows
      state.candidates[r]![3] = new Set<Digit>([5, 7]);
    }

    const step = xWing(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('xWing');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations.length).toBe(14);
    for (const r of [1, 2, 4, 5, 6, 7, 8]) {
      expect(step?.eliminations).toContainEqual({ cell: { row: r, col: 0 }, digit: 5 });
      expect(step?.eliminations).toContainEqual({ cell: { row: r, col: 4 }, digit: 5 });
    }
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 4 },
        { row: 3, col: 0 },
        { row: 3, col: 4 },
      ]),
    );
  });

  it('finds a column-pattern X-Wing', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Digit 6 in column 0 only at (0,0) and (4,0).
    state.candidates[0]![0] = new Set<Digit>([6, 7]);
    state.candidates[4]![0] = new Set<Digit>([6, 8]);
    // Digit 6 in column 5 only at (0,5) and (4,5).
    state.candidates[0]![5] = new Set<Digit>([6, 1]);
    state.candidates[4]![5] = new Set<Digit>([6, 2]);
    // Other cells in columns 0 and 5 outside rows 0 and 4 have digit 6 as candidate (eliminable).
    for (const r of [1, 2, 3, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([6, 1]);
      state.candidates[r]![5] = new Set<Digit>([6, 2]);
      // Add extra candidate to prevent these rows from being pattern rows
      state.candidates[r]![3] = new Set<Digit>([6, 7]);
    }
    // Other cells in rows 0 and 4 have no candidates (to avoid spurious X-Wing patterns with other digits).
    for (const c of [1, 2, 3, 4, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>();
      state.candidates[4]![c] = new Set<Digit>();
    }

    const step = xWing(state);
    expect(step?.technique).toBe('xWing');
    expect(step?.eliminations.length).toBe(14);
  });

  it('returns null when only one row has the digit in exactly two cells', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    expect(xWing(state)).toBeNull();
  });

  it('returns null when the two rows have the digit in different columns', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    state.candidates[3]![1] = new Set<Digit>([5, 2]);
    state.candidates[3]![4] = new Set<Digit>([5, 8]);
    expect(xWing(state)).toBeNull();
  });

  it('returns null when the pattern matches but no eliminations result', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5]);
    state.candidates[0]![4] = new Set<Digit>([5]);
    state.candidates[3]![0] = new Set<Digit>([5]);
    state.candidates[3]![4] = new Set<Digit>([5]);
    expect(xWing(state)).toBeNull();
  });
});
