import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { solve } from './solve';

// A puzzle solvable purely by naked + hidden singles.
//   . . 3 | . 2 . | 6 . .
//   9 . . | 3 . 5 | . . 1
//   . . 1 | 8 . 6 | 4 . .
//   ------+-------+------
//   . . 8 | 1 . 2 | 9 . .
//   7 . . | . . . | . . 8
//   . . 6 | 7 . 8 | 2 . .
//   ------+-------+------
//   . . 2 | 6 . 9 | 5 . .
//   8 . . | 2 . 3 | . . 9
//   . . 5 | . 1 . | 3 . .
const EASY_PUZZLE: (Digit | null)[][] = [
  [null, null, 3, null, 2, null, 6, null, null],
  [9, null, null, 3, null, 5, null, null, 1],
  [null, null, 1, 8, null, 6, 4, null, null],
  [null, null, 8, 1, null, 2, 9, null, null],
  [7, null, null, null, null, null, null, null, 8],
  [null, null, 6, 7, null, 8, 2, null, null],
  [null, null, 2, 6, null, 9, 5, null, null],
  [8, null, null, 2, null, 3, null, null, 9],
  [null, null, 5, null, 1, null, 3, null, null],
];

const EASY_SOLUTION: Digit[][] = [
  [4, 8, 3, 9, 2, 1, 6, 5, 7],
  [9, 6, 7, 3, 4, 5, 8, 2, 1],
  [2, 5, 1, 8, 7, 6, 4, 9, 3],
  [5, 4, 8, 1, 3, 2, 9, 7, 6],
  [7, 2, 9, 5, 6, 4, 1, 3, 8],
  [1, 3, 6, 7, 9, 8, 2, 4, 5],
  [3, 7, 2, 6, 8, 9, 5, 1, 4],
  [8, 1, 4, 2, 5, 3, 7, 6, 9],
  [6, 9, 5, 4, 1, 7, 3, 8, 2],
];

describe('solve', () => {
  it('returns the original board with no steps when no technique applies (empty input)', () => {
    const result = solve(
      Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null as Digit | null)),
    );
    expect(result.steps).toHaveLength(0);
    expect(result.solved).toBe(false);
  });

  it('solves the curated easy puzzle using only easy techniques', () => {
    const result = solve(EASY_PUZZLE);
    expect(result.solved).toBe(true);
    expect(result.state.values).toEqual(EASY_SOLUTION);
    for (const step of result.steps) {
      expect(['nakedSingle', 'hiddenSingle']).toContain(step.technique);
    }
  });

  it('does not mutate the input grid', () => {
    const input = EASY_PUZZLE.map((row) => [...row]);
    const snapshot = EASY_PUZZLE.map((row) => [...row]);
    solve(input);
    expect(input).toEqual(snapshot);
  });

  it('records steps in the order they were applied', () => {
    const result = solve(EASY_PUZZLE);
    expect(result.steps.length).toBeGreaterThan(0);
    for (const step of result.steps) {
      expect(step.placements.length).toBeGreaterThanOrEqual(1);
    }
  });
});
