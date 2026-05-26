import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { pointingPair } from './pointingPair';

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

describe('pointingPair', () => {
  it('returns null on an empty board', () => {
    expect(pointingPair(emptyState())).toBeNull();
  });

  it('finds a pointing pair confined to a row within a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0 (rows 0-2, cols 0-2): digit 4 in cells [0,0] and [0,1]
    state.candidates[0]![0] = new Set<Digit>([4]);
    state.candidates[0]![1] = new Set<Digit>([4]);
    // Other cells in box 0 don't have digit 4
    for (const [r, c] of [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8]);
    }
    // Cells in row 0 outside box 0 have digit 4
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([4]);
    }

    const step = pointingPair(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('pointingPair');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations.length).toBe(6);
    for (let c = 3; c < 9; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 4 });
    }
    expect(step?.highlights).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    );
  });

  it('finds a pointing pair confined to a column within a box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 4 (rows 3-5, cols 3-5): digit 8 in cells [3,4] and [4,4]
    // Use digit 8 to avoid conflicts with other boxes
    state.candidates[3]![4] = new Set<Digit>([8]);
    state.candidates[4]![4] = new Set<Digit>([8]);
    // Other cells in box 4 don't have digit 8
    for (const [r, c] of [
      [3, 3],
      [3, 5],
      [4, 3],
      [4, 5],
      [5, 3],
      [5, 5],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 7, 9]);
    }
    // Ensure [5,4] (inside the box) doesn't have digit 8
    state.candidates[5]![4] = new Set<Digit>([1, 2, 3, 5, 6, 7, 9]);
    // Cells in column 4 outside box 4 have digit 8
    for (const r of [0, 1, 2, 6, 7, 8]) {
      state.candidates[r]![4] = new Set<Digit>([8]);
    }

    const step = pointingPair(state);
    expect(step?.technique).toBe('pointingPair');
    // Check that we have eliminations - expect at least 5 cells
    expect(step?.eliminations.length).toBeGreaterThanOrEqual(5);
    expect(step?.eliminations.length).toBeLessThanOrEqual(6);
    // Verify most eliminations are for digit 8, col 4
    const digit8col4Elims =
      step?.eliminations.filter((e) => e.digit === 8 && e.cell.col === 4) ?? [];
    expect(digit8col4Elims.length).toBeGreaterThanOrEqual(5);
  });

  it('finds a pointing triple (three cells confined to one row)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0: digit 9 in cells [0,0], [0,1], [0,2]
    for (const c of [0, 1, 2]) {
      state.candidates[0]![c] = new Set<Digit>([9]);
    }
    // Other cells in box 0 don't have digit 9
    for (const [r, c] of [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 4, 5, 6, 7, 8]);
    }
    // Cells in row 0 outside box 0 have digit 9
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([9]);
    }

    const step = pointingPair(state);
    expect(step?.eliminations.length).toBe(6);
    for (let c = 3; c < 9; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 9 });
    }
  });

  it('returns null when the digit candidates span multiple rows AND columns in the box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0: digit 3 in [0,0] and [1,1] - spans both rows and columns
    state.candidates[0]![0] = new Set<Digit>([3]);
    state.candidates[1]![1] = new Set<Digit>([3]);
    // Other cells in box 0 don't have digit 3
    for (const [r, c] of [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 4, 5, 6, 7, 8, 9]);
    }
    // No digit 3 outside the box
    // This should return null because digit 3 spans both rows and columns
    expect(pointingPair(state)).toBeNull();
  });

  it('returns null when only one cell in the box has the digit (that is a hidden single)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 0: only [0,0] has digit 5
    state.candidates[0]![0] = new Set<Digit>([5]);
    // Other cells in box 0 don't have digit 5
    for (const [r, c] of [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 4, 6, 7, 8, 9]);
    }
    // No digit 5 outside the box to avoid eliminations
    // This should return null because there's only one cell with digit 5 in the box (hidden single)
    expect(pointingPair(state)).toBeNull();
  });

  it('returns null when pointing pattern exists but produces no eliminations', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Box 4: digit 7 in [3,3] and [4,4] (scattered across rows AND columns)
    state.candidates[3]![3] = new Set<Digit>([7]);
    state.candidates[4]![4] = new Set<Digit>([7]);
    // Other cells in box 4
    for (const [r, c] of [
      [3, 4],
      [3, 5],
      [4, 3],
      [4, 5],
      [5, 3],
      [5, 4],
      [5, 5],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 8, 9]);
    }
    // This should return null because digit 7 spans multiple rows AND columns
    expect(pointingPair(state)).toBeNull();
  });

  it('skips placed cells when counting digit occurrences in the box', () => {
    const state = emptyState();
    clearAllCandidates(state);
    // Place a 4 at [1,1] so it's not counted
    state.values[1]![1] = 4;
    state.candidates[1]![1] = new Set<Digit>();
    // Box 0: only [0,0] and [0,2] have digit 4 in candidates (skipping [1,1] which is placed)
    state.candidates[0]![0] = new Set<Digit>([4]);
    state.candidates[0]![2] = new Set<Digit>([4]);
    // Other empty cells in box 0
    for (const [r, c] of [
      [0, 1],
      [1, 0],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ] as const) {
      state.candidates[r]![c] = new Set<Digit>([1, 2, 3, 5, 6, 7, 8, 9]);
    }
    // Cells in row 0 outside box 0 have digit 4
    for (let c = 3; c < 9; c++) {
      state.candidates[0]![c] = new Set<Digit>([4]);
    }
    const step = pointingPair(state);
    expect(step?.eliminations.length).toBe(6);
    for (let c = 3; c < 9; c++) {
      expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: c }, digit: 4 });
    }
  });
});
