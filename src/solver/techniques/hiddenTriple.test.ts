import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenTriple } from './hiddenTriple';

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

describe('hiddenTriple', () => {
  it('returns null on an empty board', () => {
    expect(hiddenTriple(emptyState())).toBeNull();
  });

  it('finds a hidden triple in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([2, 5, 8, 1]);
    state.candidates[0]![2] = new Set<Digit>([2, 5, 9, 8]);
    state.candidates[0]![5] = new Set<Digit>([5, 8, 3]);
    for (const c of [1, 3, 4, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 3, 4, 6, 7, 9]);
    }
    const step = hiddenTriple(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenTriple');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
        { row: 0, col: 5 },
      ]),
    );
    expect(step?.eliminations.length).toBe(3);
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 1 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 2 }, digit: 9 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 5 }, digit: 3 });
  });

  it('finds a hidden triple in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[1]![4] = new Set<Digit>([3, 6, 9, 2]);
    state.candidates[4]![4] = new Set<Digit>([3, 6, 1]);
    state.candidates[7]![4] = new Set<Digit>([6, 9, 5]);
    for (const r of [0, 2, 3, 5, 6, 8]) {
      state.candidates[r]![4] = new Set<Digit>([1, 2, 4, 5, 7, 8]);
    }
    const step = hiddenTriple(state);
    expect(step?.technique).toBe('hiddenTriple');
    expect(step?.eliminations.length).toBe(3);
  });

  it('finds a hidden triple in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Hidden triple {1, 4, 7} in box 4, cells [3,3], [4,4], [5,5]
    state.candidates[3]![3] = new Set<Digit>([1, 4, 7, 2]);
    state.candidates[4]![4] = new Set<Digit>([1, 4, 8]);
    state.candidates[5]![5] = new Set<Digit>([4, 7, 3]);
    // Fill other cells in the box with non-overlapping candidates to prevent spurious triples
    state.candidates[3]![4] = new Set<Digit>([2, 5]);
    state.candidates[3]![5] = new Set<Digit>([6, 9]);
    state.candidates[4]![3] = new Set<Digit>([2, 6]);
    state.candidates[4]![5] = new Set<Digit>([3, 5]);
    state.candidates[5]![3] = new Set<Digit>([5, 9]);
    state.candidates[5]![4] = new Set<Digit>([2, 3]);
    const step = hiddenTriple(state);
    expect(step?.technique).toBe('hiddenTriple');
    expect(step?.eliminations.length).toBe(3);
  });

  it('returns null when the cells already contain only the triple digits (no eliminations)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    state.candidates[0]![2] = new Set<Digit>([2, 8]);
    state.candidates[0]![5] = new Set<Digit>([5, 8]);
    expect(hiddenTriple(state)).toBeNull();
  });

  it('does not match when a digit appears in a fourth cell', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([2, 5, 8, 1]);
    state.candidates[0]![2] = new Set<Digit>([2, 5, 9]);
    state.candidates[0]![5] = new Set<Digit>([5, 8, 3]);
    state.candidates[0]![7] = new Set<Digit>([2]);
    expect(hiddenTriple(state)).toBeNull();
  });
});
