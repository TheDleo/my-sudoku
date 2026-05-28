import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import { classify } from './difficulty';

describe('classify', () => {
  it('returns "easy" for a puzzle solvable by singles only', () => {
    // A near-complete puzzle. Only one cell empty → naked single only.
    const puzzle: (Digit | null)[][] = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, null],
    ];
    expect(classify(puzzle)).toBe('easy');
  });

  it('returns "medium" for a puzzle exercising medium-tier techniques', () => {
    // Re-use the curated medium puzzle from src/solver/solve.test.ts.
    const puzzle: (Digit | null)[][] = [
      [4, null, null, null, null, null, 8, null, 5],
      [null, 3, null, null, null, null, null, null, null],
      [null, null, null, 7, null, null, null, null, null],
      [null, 2, null, null, null, null, null, 6, null],
      [null, null, null, null, 8, null, 4, null, null],
      [null, null, null, null, 1, null, null, null, null],
      [null, null, null, 6, null, 3, null, 7, null],
      [5, null, null, 2, null, null, null, null, null],
      [1, null, 4, null, null, null, null, null, null],
    ];
    expect(classify(puzzle)).toBe('medium');
  });

  it('returns "hard" for the Phase 5 hard puzzle', () => {
    const puzzle: (Digit | null)[][] = [
      [null, 4, 3, null, 8, null, 2, 5, null],
      [6, null, null, null, null, null, null, null, null],
      [null, null, null, null, null, 1, null, 9, 4],
      [9, null, null, null, null, 4, null, 7, null],
      [null, null, null, 6, null, 8, null, null, null],
      [null, 1, null, 2, null, null, null, null, 3],
      [8, 2, null, 5, null, null, null, null, null],
      [null, null, null, null, null, null, null, null, 5],
      [null, 3, 4, null, 9, null, 7, 1, null],
    ];
    expect(classify(puzzle)).toBe('hard');
  });

  it('returns "expert" for the Phase 6 fallback A puzzle', () => {
    const puzzle: (Digit | null)[][] = [
      [9, null, null, 2, 4, null, null, null, null],
      [null, 5, null, 6, 9, null, 2, 3, 1],
      [null, 2, null, null, 5, null, null, 9, null],
      [null, 9, null, 7, null, null, 3, 2, null],
      [null, null, 2, 9, 3, 5, 6, null, 7],
      [null, 7, null, null, null, 2, 9, null, null],
      [null, 6, 9, null, 2, null, null, 7, 3],
      [5, 1, null, null, 7, 9, null, null, 2],
      [2, null, 7, null, 8, null, null, null, 9],
    ];
    expect(classify(puzzle)).toBe('expert');
  });

  it('returns "easy" for a fully complete grid (no steps)', () => {
    const grid: (Digit | null)[][] = [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ];
    expect(classify(grid)).toBe('easy');
  });

  it('returns null when the solver cannot fully solve (e.g. empty board)', () => {
    const empty: (Digit | null)[][] = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => null),
    );
    expect(classify(empty)).toBeNull();
  });
});
