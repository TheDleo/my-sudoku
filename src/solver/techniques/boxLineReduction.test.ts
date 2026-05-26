import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { boxLineReduction } from './boxLineReduction';

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

describe('boxLineReduction', () => {
  it('returns null on an empty board', () => {
    expect(boxLineReduction(emptyState())).toBeNull();
  });

  it('finds a row-confined-to-box pattern and eliminates from the rest of the box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([4, 7]);
    state.candidates[0]![1] = new Set<Digit>([4, 9]);
    for (const c of [2, 3, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8]);
    }
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([4, 1, 2]);
    }

    const step = boxLineReduction(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('boxLineReduction');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations.length).toBe(6);
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      expect(step?.eliminations).toContainEqual({ cell: { row: r, col: c }, digit: 4 });
    }
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    );
  });

  it('finds a column-confined-to-box pattern', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([7, 2]);
    state.candidates[1]![0] = new Set<Digit>([7, 5]);
    for (const r of [2, 3, 4, 5, 6, 7, 8]) {
      state.candidates[r]![0] = new Set<Digit>([1, 2, 3, 5, 6, 8, 9]);
    }
    for (const [r, c] of [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([7, 3, 4]);
    }
    // Add 7 elsewhere to prevent row patterns
    for (const r of [0, 1, 2]) {
      for (const c of [3, 4, 5, 6, 7, 8]) {
        state.candidates[r]![c] = new Set<Digit>([7, 3, 4]);
      }
    }
    const step = boxLineReduction(state);
    expect(step?.technique).toBe('boxLineReduction');
    expect(step?.eliminations.length).toBe(6);
  });

  it('finds a row-confined pattern with three cells', () => {
    const state = emptyState();
    clearAllCandidates(state);
    for (const c of [0, 1, 2]) {
      state.candidates[0]![c] = new Set<Digit>([9, 1]);
    }
    for (const c of [3, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5, 6, 7, 8]);
    }
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([9, 1, 2]);
    }
    const step = boxLineReduction(state);
    expect(step?.eliminations.length).toBe(6);
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      expect(step?.eliminations).toContainEqual({ cell: { row: r, col: c }, digit: 9 });
    }
  });

  it('returns null when the digit appears in cells from two different boxes within the line', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([3, 1]);
    state.candidates[0]![3] = new Set<Digit>([3, 1]);
    for (const c of [1, 2, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 4, 5, 6, 7, 8, 9]);
    }
    expect(boxLineReduction(state)).toBeNull();
  });

  it('returns null when only one cell in the line has the digit (hidden single)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5, 2]);
    for (const c of [1, 2, 3, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 6, 7, 8, 9]);
    }
    expect(boxLineReduction(state)).toBeNull();
  });

  it('returns null when the line-confined pattern produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Digit 9 confined to row 0, cells [0][0] and [0][1], but no 9 elsewhere in box 0
    state.candidates[0]![0] = new Set<Digit>([9]);
    state.candidates[0]![1] = new Set<Digit>([9]);
    state.candidates[0]![2] = new Set<Digit>([1, 2]);
    state.candidates[1]![0] = new Set<Digit>([3, 4]);
    state.candidates[1]![1] = new Set<Digit>([5, 6]);
    state.candidates[1]![2] = new Set<Digit>([7, 8]);
    state.candidates[2]![0] = new Set<Digit>([1, 2]);
    state.candidates[2]![1] = new Set<Digit>([3, 4]);
    state.candidates[2]![2] = new Set<Digit>([5, 6]);
    // Rest of row 0 has 1-8 (no 9), distributed to avoid patterns
    for (const c of [3, 4, 5, 6, 7, 8]) {
      state.candidates[0]![c] = new Set<Digit>([1, 2, 3, 4, 5, 6, 7, 8]);
    }
    expect(boxLineReduction(state)).toBeNull();
  });
});
