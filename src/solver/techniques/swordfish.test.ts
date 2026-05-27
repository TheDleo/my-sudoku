import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { swordfish } from './swordfish';

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

describe('swordfish', () => {
  it('returns null on an empty board', () => {
    expect(swordfish(emptyState())).toBeNull();
  });

  it('finds a row-pattern swordfish on digit 4', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 1]);
    state.candidates[0]![3] = new Set<Digit>([4, 2]);
    state.candidates[1]![3] = new Set<Digit>([4, 5]);
    state.candidates[1]![6] = new Set<Digit>([4, 8]);
    state.candidates[2]![0] = new Set<Digit>([4, 9]);
    state.candidates[2]![6] = new Set<Digit>([4, 7]);
    for (const r of [3, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([4, 1]);
      state.candidates[r]![3] = new Set<Digit>([4, 2]);
      state.candidates[r]![6] = new Set<Digit>([4, 5]);
      state.candidates[r]![8] = new Set<Digit>([4, 7]);
    }
    const step = swordfish(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('swordfish');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations.length).toBe(18);
    expect(step?.explanation).toContain('rows 1, 2, 3');
    expect(step?.explanation).toContain('columns 1, 4, 7');
  });

  it('does not match when the union covers more than 3 columns', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 1]);
    state.candidates[0]![3] = new Set<Digit>([4, 2]);
    state.candidates[1]![3] = new Set<Digit>([4, 5]);
    state.candidates[1]![6] = new Set<Digit>([4, 8]);
    state.candidates[2]![0] = new Set<Digit>([4, 9]);
    state.candidates[2]![7] = new Set<Digit>([4, 7]);
    expect(swordfish(state)).toBeNull();
  });

  it('does not double-fire as an xWing', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // A perfect 2x2 xWing: rows 0,3 with columns 0,4
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    state.candidates[3]![0] = new Set<Digit>([5, 2]);
    state.candidates[3]![4] = new Set<Digit>([5, 8]);
    // Ensure no other row has digit 5 in columns 0 or 4 to prevent swordfish
    for (const r of [1, 2, 4, 5, 6, 7, 8]) {
      if (r !== 0 && r !== 3) {
        state.candidates[r]![1] = new Set<Digit>([5, 1]);
        state.candidates[r]![2] = new Set<Digit>([5, 2]);
      }
    }
    expect(swordfish(state)).toBeNull();
  });
});
