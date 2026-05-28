import { describe, it, expect } from 'vitest';
import type { Digit, Puzzle } from '../types';
import { initialEmptyState, loadPuzzle } from './reducers';

function makePuzzle(): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  initialBoard[0]![0] = 5;
  initialBoard[4]![4] = 7;
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
  );
  return { id: 'test', difficulty: 'easy', initialBoard, solution };
}

describe('initialEmptyState', () => {
  it('is a concrete GameState sentinel', () => {
    expect(initialEmptyState.cells.length).toBe(9);
    expect(initialEmptyState.given.length).toBe(9);
    expect(initialEmptyState.selection).toEqual({ cell: null, number: null });
    expect(initialEmptyState.pencilMode).toBe(false);
    expect(initialEmptyState.mistakes).toBe(0);
    expect(initialEmptyState.elapsedMs).toBe(0);
    expect(initialEmptyState.history).toEqual({ past: [], future: [] });
  });
});

describe('loadPuzzle', () => {
  it('rebuilds cells and given from puzzle.initialBoard', () => {
    const puzzle = makePuzzle();
    const next = loadPuzzle(initialEmptyState, puzzle);
    expect(next.cells[0]![0]!.value).toBe(5);
    expect(next.cells[4]![4]!.value).toBe(7);
    expect(next.cells[1]![1]!.value).toBe(null);
    expect(next.given[0]![0]).toBe(true);
    expect(next.given[4]![4]).toBe(true);
    expect(next.given[1]![1]).toBe(false);
    expect(next.puzzle).toBe(puzzle);
  });

  it('clears selection, resets pencilMode/mistakes/elapsedMs, and clears history', () => {
    const puzzle = makePuzzle();
    const dirty = {
      ...initialEmptyState,
      selection: { cell: { row: 3, col: 3 }, number: 5 as Digit },
      pencilMode: true,
      mistakes: 4,
      elapsedMs: 12345,
      history: {
        past: [{ cells: initialEmptyState.cells, pencilMode: true }],
        future: [{ cells: initialEmptyState.cells, pencilMode: false }],
      },
    };
    const next = loadPuzzle(dirty, puzzle);
    expect(next.selection).toEqual({ cell: null, number: null });
    expect(next.pencilMode).toBe(false);
    expect(next.mistakes).toBe(0);
    expect(next.elapsedMs).toBe(0);
    expect(next.history).toEqual({ past: [], future: [] });
  });

  it('initializes each cell with an empty pencilMarks Set', () => {
    const next = loadPuzzle(initialEmptyState, makePuzzle());
    for (const row of next.cells) {
      for (const c of row) {
        expect(c.pencilMarks).toBeInstanceOf(Set);
        expect(c.pencilMarks.size).toBe(0);
      }
    }
  });
});
