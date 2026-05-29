import { describe, it, expect } from 'vitest';
import type { Digit } from '../types';
import {
  eraseCell,
  initialEmptyState,
  loadPuzzle,
  placeDigit,
  redo,
  selectCell,
  setSelectedNumber,
  togglePencilMark,
  togglePencilMode,
  undo,
  withSnapshot,
} from './reducers';
import { cloneCells as cloneCellsForTest } from './helpers';
import { makePuzzle } from './testHelpers';

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

describe('selectCell', () => {
  it('sets selection.cell and preserves selection.number', () => {
    const start = { ...initialEmptyState, selection: { cell: null, number: 5 as Digit } };
    const next = selectCell(start, { row: 2, col: 3 });
    expect(next.selection).toEqual({ cell: { row: 2, col: 3 }, number: 5 });
  });

  it('clears selection.cell when given null', () => {
    const start = {
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: 7 as Digit },
    };
    const next = selectCell(start, null);
    expect(next.selection).toEqual({ cell: null, number: 7 });
  });

  it('does not modify history', () => {
    const next = selectCell(initialEmptyState, { row: 0, col: 0 });
    expect(next.history).toBe(initialEmptyState.history);
  });
});

describe('setSelectedNumber', () => {
  it('sets selection.number and preserves selection.cell', () => {
    const start = {
      ...initialEmptyState,
      selection: { cell: { row: 4, col: 4 }, number: null },
    };
    const next = setSelectedNumber(start, 9 as Digit);
    expect(next.selection).toEqual({ cell: { row: 4, col: 4 }, number: 9 });
  });

  it('clears selection.number when given null', () => {
    const start = {
      ...initialEmptyState,
      selection: { cell: null, number: 3 as Digit },
    };
    const next = setSelectedNumber(start, null);
    expect(next.selection).toEqual({ cell: null, number: null });
  });

  it('does not modify history', () => {
    const next = setSelectedNumber(initialEmptyState, 5 as Digit);
    expect(next.history).toBe(initialEmptyState.history);
  });
});

describe('placeDigit', () => {
  it('sets the digit when a non-given cell is selected', () => {
    const puzzle = makePuzzle();
    const loaded = loadPuzzle(initialEmptyState, puzzle);
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.cells[1]![1]!.value).toBe(3);
  });

  it('returns the same reference (no-op) when no cell is selected', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(placeDigit(loaded, 3 as Digit)).toBe(loaded);
  });

  it('returns the same reference (no-op) when the selected cell is given', () => {
    const puzzle = makePuzzle();
    const loaded = loadPuzzle(initialEmptyState, puzzle);
    const selected = selectCell(loaded, { row: 0, col: 0 }); // (0,0) is given
    expect(placeDigit(selected, 3 as Digit)).toBe(selected);
  });

  it('overwrites a previously placed digit in a non-given cell', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const first = placeDigit(selected, 3 as Digit);
    const second = placeDigit(first, 7 as Digit);
    expect(second.cells[1]![1]!.value).toBe(7);
  });

  it('does not modify history (history snapshot is withSnapshot job)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.history).toBe(selected.history);
  });
});

describe('eraseCell', () => {
  it('clears the value of the selected non-given cell', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withDigit = placeDigit(selected, 3 as Digit);
    const next = eraseCell(withDigit);
    expect(next.cells[1]![1]!.value).toBe(null);
  });

  it('clears pencil marks when the cell has no value but has marks', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[1]![1]!.pencilMarks = new Set<Digit>([1, 2, 3] as Digit[]);
    const seeded = { ...loaded, cells };
    const selected = selectCell(seeded, { row: 1, col: 1 });
    const next = eraseCell(selected);
    expect(next.cells[1]![1]!.value).toBe(null);
    expect(next.cells[1]![1]!.pencilMarks.size).toBe(0);
  });

  it('returns the same reference when the cell is empty (no value, no marks)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    expect(eraseCell(selected)).toBe(selected);
  });

  it('returns the same reference when the cell is given', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 0, col: 0 }); // given cell
    expect(eraseCell(selected)).toBe(selected);
  });

  it('returns the same reference when no cell is selected', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(eraseCell(loaded)).toBe(loaded);
  });
});

describe('togglePencilMark', () => {
  it('adds the digit when absent', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = togglePencilMark(selected, 5 as Digit);
    expect(next.cells[1]![1]!.pencilMarks.has(5 as Digit)).toBe(true);
  });

  it('removes the digit when present', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const added = togglePencilMark(selected, 5 as Digit);
    const removed = togglePencilMark(added, 5 as Digit);
    expect(removed.cells[1]![1]!.pencilMarks.has(5 as Digit)).toBe(false);
  });

  it('returns same reference when cell is given', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 0, col: 0 }); // given
    expect(togglePencilMark(selected, 3 as Digit)).toBe(selected);
  });

  it('returns same reference when cell has a value', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withDigit = placeDigit(selected, 7 as Digit);
    expect(togglePencilMark(withDigit, 3 as Digit)).toBe(withDigit);
  });

  it('returns same reference when no cell is selected', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(togglePencilMark(loaded, 3 as Digit)).toBe(loaded);
  });
});

describe('togglePencilMode', () => {
  it('flips the pencilMode boolean', () => {
    expect(togglePencilMode(initialEmptyState).pencilMode).toBe(true);
    const on = togglePencilMode(initialEmptyState);
    expect(togglePencilMode(on).pencilMode).toBe(false);
  });
});

describe('withSnapshot', () => {
  it('pushes the pre-action snapshot onto past when the reducer changes state', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    expect(next.history.past.length).toBe(1);
    expect(next.history.past[0]!.cells[1]![1]!.value).toBe(null); // pre-action snapshot
    expect(next.history.future).toEqual([]); // future cleared on new action
  });

  it('does not push a snapshot when the reducer returns the same reference (no-op)', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 0, col: 0 }); // given cell
    const next = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    expect(next).toBe(selected);
    expect(next.history.past).toEqual([]);
  });

  it('clears the future array on any new mutating action', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const seeded = {
      ...selected,
      history: {
        past: [],
        future: [{ cells: selected.cells, pencilMode: false }],
      },
    };
    const next = withSnapshot(seeded, (s) => placeDigit(s, 5 as Digit));
    expect(next.history.future).toEqual([]);
  });
});

describe('undo', () => {
  it('returns same reference when past is empty', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(undo(loaded)).toBe(loaded);
  });

  it('reverts the most recent mutating action', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    const reverted = undo(placed);
    expect(reverted.cells[1]![1]!.value).toBe(null);
    expect(reverted.history.past).toEqual([]);
    expect(reverted.history.future.length).toBe(1);
  });

  it('preserves selection across undo', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    const moved = selectCell(placed, { row: 4, col: 4 });
    const reverted = undo(moved);
    expect(reverted.selection.cell).toEqual({ row: 4, col: 4 });
  });
});

describe('redo', () => {
  it('returns same reference when future is empty', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    expect(redo(loaded)).toBe(loaded);
  });

  it('redoes a previously undone action', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    const undone = undo(placed);
    const redone = redo(undone);
    expect(redone.cells[1]![1]!.value).toBe(3);
    expect(redone.history.past.length).toBe(1);
    expect(redone.history.future).toEqual([]);
  });

  it('round-trip: placeDigit -> undo -> redo restores the digit', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const placed = withSnapshot(selected, (s) => placeDigit(s, 3 as Digit));
    expect(redo(undo(placed)).cells[1]![1]!.value).toBe(3);
  });

  it('round-trip: eraseCell pencil marks -> undo restores them', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const withMarks = withSnapshot(selected, (s) => togglePencilMark(s, 3 as Digit));
    const withMore = withSnapshot(withMarks, (s) => togglePencilMark(s, 5 as Digit));
    const erased = withSnapshot(withMore, eraseCell);
    expect(erased.cells[1]![1]!.pencilMarks.size).toBe(0);
    const reverted = undo(erased);
    expect(reverted.cells[1]![1]!.pencilMarks.has(3 as Digit)).toBe(true);
    expect(reverted.cells[1]![1]!.pencilMarks.has(5 as Digit)).toBe(true);
  });
});
