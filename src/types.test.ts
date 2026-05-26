import { describe, it, expect } from 'vitest';
import type { Digit, CellCoord, Difficulty, Cell, Board, SolvedGrid, Puzzle } from './types';

// These tests intentionally avoid `expectTypeOf` because it narrows literal
// values past their explicit annotations under strict mode. The explicit type
// annotations on each fixture (`const x: T = ...`) ARE the compile-time check —
// if a type's shape is wrong, this file won't typecheck. Runtime assertions
// then confirm the structure is usable as designed.

describe('types', () => {
  it('Digit accepts all nine sudoku digits', () => {
    const digits: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(digits).toHaveLength(9);
  });

  it('CellCoord has row and col as numbers', () => {
    const c: CellCoord = { row: 3, col: 7 };
    expect(c.row).toBe(3);
    expect(c.col).toBe(7);
  });

  it('Difficulty accepts the four tier strings', () => {
    const tiers: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
    expect(tiers).toEqual(['easy', 'medium', 'hard', 'expert']);
  });

  it('Cell holds an optional value and a Set of pencil marks', () => {
    const empty: Cell = { value: null, pencilMarks: new Set<Digit>() };
    expect(empty.value).toBeNull();
    expect(empty.pencilMarks.size).toBe(0);

    const filled: Cell = { value: 7, pencilMarks: new Set<Digit>([1, 2, 3]) };
    expect(filled.value).toBe(7);
    expect(filled.pencilMarks.has(2)).toBe(true);
    expect(filled.pencilMarks.size).toBe(3);
  });

  it('Board is a 9x9 nested Cell array', () => {
    const empty: Cell = { value: null, pencilMarks: new Set<Digit>() };
    const board: Board = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => empty));
    expect(board).toHaveLength(9);
    expect(board[0]).toHaveLength(9);
  });

  it('SolvedGrid is a 9x9 Digit grid', () => {
    const solved: SolvedGrid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, (): Digit => 1),
    );
    expect(solved).toHaveLength(9);
    expect(solved[0]).toHaveLength(9);
    expect(solved[0]?.[0]).toBe(1);
  });

  it('Puzzle holds id, difficulty, initialBoard, and solution', () => {
    const solved: SolvedGrid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, (): Digit => 1),
    );
    const initial: (Digit | null)[][] = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, (): Digit | null => null),
    );
    const p: Puzzle = {
      id: 'p-001',
      difficulty: 'easy',
      initialBoard: initial,
      solution: solved,
    };
    expect(p.id).toBe('p-001');
    expect(p.difficulty).toBe('easy');
    expect(p.initialBoard).toBe(initial);
    expect(p.solution).toBe(solved);
  });
});
