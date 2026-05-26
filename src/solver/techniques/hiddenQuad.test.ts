import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { hiddenQuad } from './hiddenQuad';

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

describe('hiddenQuad', () => {
  it('returns null on an empty board', () => {
    expect(hiddenQuad(emptyState())).toBeNull();
  });

  it('finds a hidden quad in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 3, 6]);
    state.candidates[0]![2] = new Set<Digit>([3, 4, 7]);
    state.candidates[0]![3] = new Set<Digit>([1, 4, 8]);
    for (const c of [4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([5, 6, 7, 8, 9]);
    }
    const step = hiddenQuad(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('hiddenQuad');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]),
    );
    expect(step?.eliminations.length).toBe(4);
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: 5 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 1 }, digit: 6 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 2 }, digit: 7 });
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 3 }, digit: 8 });
  });

  it('finds a hidden quad in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 5]);
    state.candidates[1]![0] = new Set<Digit>([2, 3, 6]);
    state.candidates[2]![0] = new Set<Digit>([3, 4, 7]);
    state.candidates[3]![0] = new Set<Digit>([1, 4, 8]);
    for (const r of [4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([5, 6, 7, 8, 9]);
    }
    const step = hiddenQuad(state);
    expect(step?.technique).toBe('hiddenQuad');
    expect(step?.eliminations.length).toBe(4);
  });

  it('finds a hidden quad in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 3, 6]);
    state.candidates[1]![2] = new Set<Digit>([3, 4, 7]);
    state.candidates[2]![2] = new Set<Digit>([1, 4, 8]);
    state.candidates[0]![2] = new Set<Digit>([5, 6, 7, 8, 9]);
    state.candidates[1]![0] = new Set<Digit>([5, 6, 7, 8, 9]);
    state.candidates[1]![1] = new Set<Digit>([5, 6, 7, 8, 9]);
    state.candidates[2]![0] = new Set<Digit>([5, 6, 7, 8, 9]);
    state.candidates[2]![1] = new Set<Digit>([5, 6, 7, 8, 9]);
    const step = hiddenQuad(state);
    expect(step?.technique).toBe('hiddenQuad');
    expect(step?.eliminations.length).toBe(4);
  });

  it('returns null when the four cells already contain only the quad digits', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]);
    state.candidates[0]![3] = new Set<Digit>([1, 4]);
    expect(hiddenQuad(state)).toBeNull();
  });

  it('does not match when a digit appears in a fifth cell', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 3, 6]);
    state.candidates[0]![2] = new Set<Digit>([3, 4, 7]);
    state.candidates[0]![3] = new Set<Digit>([1, 4, 8]);
    state.candidates[0]![4] = new Set<Digit>([1, 9]);
    expect(hiddenQuad(state)).toBeNull();
  });
});
