import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { scanFish } from './fish';

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

describe('scanFish', () => {
  it('returns null on an empty board for any degree', () => {
    expect(scanFish(emptyState(), 5, 2, 'xWing')).toBeNull();
    expect(scanFish(emptyState(), 5, 3, 'swordfish')).toBeNull();
  });

  it('degree=2 finds a row-pattern X-Wing', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    state.candidates[3]![0] = new Set<Digit>([5, 2]);
    state.candidates[3]![4] = new Set<Digit>([5, 8]);
    for (const r of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([5, 1]);
      state.candidates[r]![4] = new Set<Digit>([5, 2]);
      state.candidates[r]![3] = new Set<Digit>([5, 7]);
    }
    const step = scanFish(state, 5, 2, 'xWing');
    expect(step?.technique).toBe('xWing');
    expect(step?.eliminations.length).toBe(14);
  });

  it('degree=3 finds a row-pattern Swordfish', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Three rows where digit 4 appears in columns drawn from {0, 3, 6}.
    state.candidates[0]![0] = new Set<Digit>([4, 1]);
    state.candidates[0]![3] = new Set<Digit>([4, 2]);
    state.candidates[1]![3] = new Set<Digit>([4, 5]);
    state.candidates[1]![6] = new Set<Digit>([4, 8]);
    state.candidates[2]![0] = new Set<Digit>([4, 9]);
    state.candidates[2]![6] = new Set<Digit>([4, 7]);
    // Outside rows: digit 4 in cols 0, 3, 6 is eliminable.
    for (const r of [3, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([4, 1]);
      state.candidates[r]![3] = new Set<Digit>([4, 2]);
      state.candidates[r]![6] = new Set<Digit>([4, 5]);
      state.candidates[r]![8] = new Set<Digit>([4, 7]);
    }
    const step = scanFish(state, 4, 3, 'swordfish');
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('swordfish');
    expect(step?.eliminations.length).toBe(18);
    expect(step?.highlights.length).toBe(6);
  });

  it('degree=2 returns null when only one row has the digit in two cells', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 7]);
    state.candidates[0]![4] = new Set<Digit>([5, 9]);
    expect(scanFish(state, 5, 2, 'xWing')).toBeNull();
  });

  it('degree=2 returns null when matching pattern produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5]);
    state.candidates[0]![4] = new Set<Digit>([5]);
    state.candidates[3]![0] = new Set<Digit>([5]);
    state.candidates[3]![4] = new Set<Digit>([5]);
    expect(scanFish(state, 5, 2, 'xWing')).toBeNull();
  });

  it('finds a column-direction fish (transpose of row case)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([6, 7]);
    state.candidates[4]![0] = new Set<Digit>([6, 8]);
    state.candidates[0]![5] = new Set<Digit>([6, 1]);
    state.candidates[4]![5] = new Set<Digit>([6, 2]);
    for (const r of [1, 2, 3, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([6, 1]);
      state.candidates[r]![5] = new Set<Digit>([6, 2]);
      state.candidates[r]![3] = new Set<Digit>([6, 7]);
    }
    const step = scanFish(state, 6, 2, 'xWing');
    expect(step?.technique).toBe('xWing');
    expect(step?.eliminations.length).toBe(14);
  });
});
