import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedTriple } from './nakedTriple';

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

describe('nakedTriple', () => {
  it('returns null on an empty board', () => {
    expect(nakedTriple(emptyState())).toBeNull();
  });

  it('finds a naked triple {3,4,8}+{3,4}+{4,8} in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([3, 4, 8]);
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([4, 8]);
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([3, 4, 8, 1, 2]);
    }
    const step = nakedTriple(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedTriple');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations.length).toBe(18);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    );
  });

  it('finds a naked triple with all three cells {a,b,c} (full triple)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 5, 9]);
    state.candidates[0]![1] = new Set<Digit>([1, 5, 9]);
    state.candidates[0]![2] = new Set<Digit>([1, 5, 9]);
    state.candidates[0]![3] = new Set<Digit>([1, 5, 9, 2]);
    const step = nakedTriple(state);
    expect(step).not.toBeNull();
    expect(step?.eliminations.length).toBe(3);
  });

  it('finds a naked triple in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[2]![4] = new Set<Digit>([2, 6]);
    state.candidates[5]![4] = new Set<Digit>([2, 7]);
    state.candidates[8]![4] = new Set<Digit>([6, 7]);
    for (const r of [0, 1, 3, 4, 6, 7]) {
      state.candidates[r]![4] = new Set<Digit>([2, 6, 7, 1]);
    }
    const step = nakedTriple(state);
    expect(step?.technique).toBe('nakedTriple');
    expect(step?.eliminations.length).toBe(18);
  });

  it('finds a naked triple in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[6]![6] = new Set<Digit>([4, 5]);
    state.candidates[7]![7] = new Set<Digit>([5, 9]);
    state.candidates[8]![8] = new Set<Digit>([4, 9]);
    for (const [r, c] of [
      [6, 7],
      [6, 8],
      [7, 6],
      [7, 8],
      [8, 6],
      [8, 7],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([4, 5, 9, 2]);
    }
    const step = nakedTriple(state);
    expect(step?.technique).toBe('nakedTriple');
    expect(step?.eliminations.length).toBe(18);
  });

  it('does not match three cells whose union exceeds 3 digits', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]);
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5]);
    }
    expect(nakedTriple(state)).toBeNull();
  });

  it('does not match when a cell has only one candidate (that would be a naked single)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([3]);
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([4]);
    expect(nakedTriple(state)).toBeNull();
  });

  it('returns null when the triple exists but produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([3, 4, 8]);
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([4, 8]);
    expect(nakedTriple(state)).toBeNull();
  });
});
