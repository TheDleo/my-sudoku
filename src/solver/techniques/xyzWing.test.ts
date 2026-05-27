import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { xyzWing } from './xyzWing';

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

describe('xyzWing', () => {
  it('returns null on an empty board', () => {
    expect(xyzWing(emptyState())).toBeNull();
  });

  it('finds an XYZ-Wing: pivot {1,2,3}, wings {1,3} and {2,3} in the same box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 3]);
    state.candidates[0]![1] = new Set<Digit>([1, 3]);
    state.candidates[1]![0] = new Set<Digit>([2, 3]);
    state.candidates[1]![1] = new Set<Digit>([3, 7]);
    const step = xyzWing(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('xyzWing');
    expect(step?.eliminations).toContainEqual({ cell: { row: 1, col: 1 }, digit: 3 });
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ]),
    );
  });

  it('does not fire when pivot is bi-value (Y-Wing territory)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([1, 3]);
    state.candidates[1]![0] = new Set<Digit>([2, 3]);
    state.candidates[1]![1] = new Set<Digit>([3, 7]);
    expect(xyzWing(state)).toBeNull();
  });

  it('does not fire when no cell sees the pivot AND both wings', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[4]![4] = new Set<Digit>([1, 2, 3]);
    state.candidates[4]![0] = new Set<Digit>([1, 3]);
    state.candidates[0]![4] = new Set<Digit>([2, 3]);
    state.candidates[0]![0] = new Set<Digit>([3, 7]);
    expect(xyzWing(state)).toBeNull();
  });
});
