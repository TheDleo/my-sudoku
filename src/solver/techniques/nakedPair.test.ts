import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { nakedPair } from './nakedPair';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

describe('nakedPair', () => {
  it('returns null on an empty board', () => {
    expect(nakedPair(emptyState())).toBeNull();
  });

  it('finds a naked pair in a row and emits eliminations', () => {
    const state = emptyState();
    state.candidates[0]![0] = new Set<Digit>([3, 7]);
    state.candidates[0]![1] = new Set<Digit>([3, 7]);
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
      [0, 2],
    ] as const) {
      state.candidates[r]![c]!.delete(3);
      state.candidates[r]![c]!.delete(7);
    }

    const step = nakedPair(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('nakedPair');
    expect(step?.placements).toEqual([]);
    expect(step?.highlights).toContainEqual({ row: 0, col: 0 });
    expect(step?.highlights).toContainEqual({ row: 0, col: 1 });

    expect(step?.eliminations.length).toBe(12);
    for (let c = 3; c <= 8; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 3 });
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 7 });
    }
  });

  it('finds a naked pair in a column', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[3]![5] = new Set<Digit>([2, 8]);
    state.candidates[6]![5] = new Set<Digit>([2, 8]);
    for (const r of [0, 1, 2, 4, 5, 7, 8]) {
      state.candidates[r]![5] = new Set<Digit>([2, 4, 8]);
    }

    const step = nakedPair(state);
    expect(step?.technique).toBe('nakedPair');
    expect(step?.eliminations.length).toBe(14);
    expect(step?.highlights).toContainEqual({ row: 3, col: 5 });
    expect(step?.highlights).toContainEqual({ row: 6, col: 5 });
  });

  it('finds a naked pair in a box', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[3]![3] = new Set<Digit>([1, 9]);
    state.candidates[4]![4] = new Set<Digit>([1, 9]);
    for (const [r, c] of [
      [3, 4],
      [3, 5],
      [4, 3],
      [4, 5],
      [5, 3],
      [5, 4],
      [5, 5],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 5, 9]);
    }

    const step = nakedPair(state);
    expect(step?.technique).toBe('nakedPair');
    expect(step?.eliminations.length).toBe(14);
  });

  it('returns null when the pair exists but produces no eliminations', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 5]);
    expect(nakedPair(state)).toBeNull();
  });

  it('does not match a single cell with two candidates (requires two cells)', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    expect(nakedPair(state)).toBeNull();
  });

  it('does not match two cells with different two-element sets', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.candidates[0]![0] = new Set<Digit>([2, 5]);
    state.candidates[0]![1] = new Set<Digit>([2, 6]);
    expect(nakedPair(state)).toBeNull();
  });

  it('skips placed cells', () => {
    const state = emptyState();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        state.candidates[r]![c] = new Set<Digit>();
      }
    }
    state.values[0]![0] = 4;
    state.candidates[0]![0] = new Set<Digit>();
    state.candidates[0]![1] = new Set<Digit>([2, 5]);
    state.candidates[0]![2] = new Set<Digit>([2, 5]);
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([2, 5, 7]);
    }

    const step = nakedPair(state);
    expect(step?.eliminations.length).toBe(12);
    expect(step?.eliminations.every((e) => !(e.cell.row === 0 && e.cell.col === 0))).toBe(true);
  });
});
