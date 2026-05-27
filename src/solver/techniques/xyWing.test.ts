import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { xyWing } from './xyWing';

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

describe('xyWing', () => {
  it('returns null on an empty board', () => {
    expect(xyWing(emptyState())).toBeNull();
  });

  it('finds a Y-Wing with pivot in box 0, wings in row and column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Pivot at (0,0) = {1,2}.
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    // Wing in same row (peer): (0,5) = {1,3}.
    state.candidates[0]![5] = new Set<Digit>([1, 3]);
    // Wing in same column (peer): (5,0) = {2,3}.
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    // Cell (5,5) sees BOTH wings (row 5 and col 5). Contains 3 as candidate.
    state.candidates[5]![5] = new Set<Digit>([3, 7]);
    const step = xyWing(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('xyWing');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations).toContainEqual({ cell: { row: 5, col: 5 }, digit: 3 });
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 5 },
        { row: 5, col: 0 },
      ]),
    );
    expect(step?.explanation).toContain('3');
  });

  it('does not fire when no cell sees both wings', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![5] = new Set<Digit>([1, 3]);
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    // (5,5) does NOT have digit 3 as a candidate.
    state.candidates[5]![5] = new Set<Digit>([4, 7]);
    expect(xyWing(state)).toBeNull();
  });

  it('does not fire when pivot is tri-value (would be xyzWing territory)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 3]); // not bi-value
    state.candidates[0]![5] = new Set<Digit>([1, 3]);
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    state.candidates[5]![5] = new Set<Digit>([3, 7]);
    expect(xyWing(state)).toBeNull();
  });

  it('does not fire when a wing is not bi-value', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![5] = new Set<Digit>([1, 3, 9]); // tri-value wing
    state.candidates[5]![0] = new Set<Digit>([2, 3]);
    state.candidates[5]![5] = new Set<Digit>([3, 7]);
    expect(xyWing(state)).toBeNull();
  });
});
