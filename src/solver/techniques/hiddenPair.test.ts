import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenPair } from './hiddenPair';

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

describe('hiddenPair', () => {
  it('returns null on an empty board (every digit is candidate everywhere)', () => {
    expect(hiddenPair(emptyState())).toBeNull();
  });

  it('finds a hidden pair in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7, 2, 9]);
    state.candidates[0]![3] = new Set<Digit>([4, 7, 1, 5]);
    for (const c of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8, 9]);
    }
    const step = hiddenPair(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 3 },
      ]),
    );
    expect(step?.eliminations.length).toBe(4);
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 2 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 9 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 3 }, digit: 1 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 3 }, digit: 5 });
  });

  it('finds a hidden pair in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[1]![5] = new Set<Digit>([2, 6, 9]);
    state.candidates[7]![5] = new Set<Digit>([2, 6, 4]);
    for (const r of [0, 2, 3, 4, 5, 6, 8]) {
      state.candidates[r]![5] = new Set<Digit>([3, 5, 7, 8]);
    }
    const step = hiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.eliminations.length).toBe(2);
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 5 }, digit: 9 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 7, col: 5 }, digit: 4 });
  });

  it('finds a hidden pair in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Hidden pair {1, 8} in box 0, cells [0,0] and [2,2]
    state.candidates[0]![0] = new Set<Digit>([1, 8, 3, 5]);
    state.candidates[2]![2] = new Set<Digit>([1, 8, 7]);
    // Fill other cells in the box with non-overlapping candidates
    state.candidates[0]![1] = new Set<Digit>([2, 9]);
    state.candidates[0]![2] = new Set<Digit>([4, 6]);
    state.candidates[1]![0] = new Set<Digit>([2, 3]);
    state.candidates[1]![1] = new Set<Digit>([4, 5]);
    state.candidates[1]![2] = new Set<Digit>([6, 9]);
    state.candidates[2]![0] = new Set<Digit>([3, 6]);
    state.candidates[2]![1] = new Set<Digit>([4, 5]);
    const step = hiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.eliminations.length).toBe(3);
  });

  it('returns null when the pair exists but cells have only those two digits (already a naked pair)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![3] = new Set<Digit>([4, 7]);
    expect(hiddenPair(state)).toBeNull();
  });

  it('does not match when a digit appears in a third cell of the unit', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7, 2]);
    state.candidates[0]![3] = new Set<Digit>([4, 7, 1]);
    state.candidates[0]![5] = new Set<Digit>([4]);
    expect(hiddenPair(state)).toBeNull();
  });

  it('skips placed cells when counting digit occurrences', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.values[0]![0] = 5;
    state.candidates[0]![0] = new Set<Digit>();
    state.candidates[0]![1] = new Set<Digit>([4, 7, 2]);
    state.candidates[0]![3] = new Set<Digit>([4, 7, 1]);
    for (const c of [2, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([3, 6, 8, 9]);
    }
    const step = hiddenPair(state);
    expect(step?.technique).toBe('hiddenPair');
    expect(step?.eliminations.length).toBe(2);
  });
});
