import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedQuad } from './nakedQuad';

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

describe('nakedQuad', () => {
  it('returns null on an empty board', () => {
    expect(nakedQuad(emptyState())).toBeNull();
  });

  it('finds a naked quad in a row', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]);
    state.candidates[0]![3] = new Set<Digit>([1, 4]);
    for (let c = 4; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5, 6]);
    }
    const step = nakedQuad(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedQuad');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]),
    );
    expect(step?.eliminations.length).toBe(20);
  });

  it('finds a naked quad with a full {a,b,c,d} cell (size 4)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2, 3, 4]);
    state.candidates[0]![1] = new Set<Digit>([1, 2]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]);
    state.candidates[0]![3] = new Set<Digit>([2, 3]);
    state.candidates[0]![4] = new Set<Digit>([1, 2, 3, 4, 5]);
    const step = nakedQuad(state);
    expect(step?.technique).toBe('nakedQuad');
    expect(step?.eliminations.length).toBe(4);
  });

  it('finds a naked quad in a column', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 6]);
    state.candidates[1]![0] = new Set<Digit>([6, 7]);
    state.candidates[2]![0] = new Set<Digit>([7, 8]);
    state.candidates[3]![0] = new Set<Digit>([5, 8]);
    for (const r of [4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([5, 6, 7, 8, 1]);
    }
    const step = nakedQuad(state);
    expect(step?.technique).toBe('nakedQuad');
    expect(step?.eliminations.length).toBe(20);
  });

  it('finds a naked quad in a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[1]![0] = new Set<Digit>([3, 4]);
    state.candidates[1]![1] = new Set<Digit>([1, 4]);
    for (const [r, c] of [
      [0, 2],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 4, 5]);
    }
    const step = nakedQuad(state);
    expect(step?.technique).toBe('nakedQuad');
    expect(step?.eliminations.length).toBe(20);
  });

  it('does not match four cells whose union exceeds 4 digits', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([3, 4]);
    state.candidates[0]![2] = new Set<Digit>([5, 6]);
    state.candidates[0]![3] = new Set<Digit>([1, 7]);
    for (let c = 4; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5]);
    }
    expect(nakedQuad(state)).toBeNull();
  });

  it('does not match when a cell has only one candidate (that would be a naked single)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1]);
    state.candidates[0]![1] = new Set<Digit>([1, 2]);
    state.candidates[0]![2] = new Set<Digit>([2, 3]);
    state.candidates[0]![3] = new Set<Digit>([3, 4]);
    expect(nakedQuad(state)).toBeNull();
  });

  it('returns null when the quad exists but produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]);
    state.candidates[0]![3] = new Set<Digit>([1, 4]);
    expect(nakedQuad(state)).toBeNull();
  });

  it('explanation lists all four cell coordinates', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([1, 2]);
    state.candidates[0]![1] = new Set<Digit>([2, 3]);
    state.candidates[0]![2] = new Set<Digit>([3, 4]);
    state.candidates[0]![3] = new Set<Digit>([1, 4]);
    for (let c = 4; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5]);
    }
    const step = nakedQuad(state);
    expect(step?.explanation).toMatch(/\(1, 1\)/);
    expect(step?.explanation).toMatch(/\(1, 2\)/);
    expect(step?.explanation).toMatch(/\(1, 3\)/);
    expect(step?.explanation).toMatch(/\(1, 4\)/);
  });
});
