import { describe, it, expect } from 'vitest';
import type { Digit, Puzzle, SolvedGrid } from '../types';
import type { Step } from '../solver/types';
import {
  advanceHint,
  dismissHint,
  dismissWin,
  eraseCell,
  fillCandidates,
  initialEmptyState,
  loadPuzzle,
  placeDigit,
  redo,
  requestHint,
  selectCell,
  setScreen,
  setSelectedNumber,
  tickTimer,
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
    expect(initialEmptyState.screen).toBe('landing');
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

  it('increments mistakes when placed digit conflicts in the same row', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    // Place 3 at (1,1) — no peer has 3 yet
    const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
    expect(s1.mistakes).toBe(0);
    // Place 3 at (1,3) — same row as (1,1), conflict
    const s2 = placeDigit(selectCell(s1, { row: 1, col: 3 }), 3 as Digit);
    expect(s2.mistakes).toBe(1);
  });

  it('increments mistakes when placed digit conflicts in the same column', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
    // Place 3 at (3,1) — same col as (1,1), conflict
    const s2 = placeDigit(selectCell(s1, { row: 3, col: 1 }), 3 as Digit);
    expect(s2.mistakes).toBe(1);
  });

  it('increments mistakes when placed digit conflicts in the same box', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
    // (2,2) is in the same top-left 3×3 box as (1,1), conflict
    const s2 = placeDigit(selectCell(s1, { row: 2, col: 2 }), 3 as Digit);
    expect(s2.mistakes).toBe(1);
  });

  it('does not increment mistakes on a clean (non-conflicting) placement', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const s1 = placeDigit(selectCell(loaded, { row: 1, col: 1 }), 3 as Digit);
    expect(s1.mistakes).toBe(0);
  });

  it('undo does not restore mistakes', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const s1 = selectCell(loaded, { row: 1, col: 1 });
    const s2 = withSnapshot(s1, (s) => placeDigit(s, 3 as Digit)); // clean placement
    const s3 = selectCell(s2, { row: 1, col: 3 });
    const s4 = withSnapshot(s3, (s) => placeDigit(s, 3 as Digit)); // conflict → mistakes=1
    expect(s4.mistakes).toBe(1);
    const s5 = undo(s4);
    expect(s5.mistakes).toBe(1); // mistakes NOT restored by undo
    expect(s5.cells[1]![3]!.value).toBeNull(); // cell IS restored
  });

  it('sets selection.number to the placed digit', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.selection.number).toBe(3);
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
    expect(next.currentHint).toBe(selected.currentHint); // hint survives no-op
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

describe('placeDigit — auto-removal of peer pencil marks', () => {
  it('removes the placed digit from pencil marks of peer cells', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    // (0,1) shares column 1 with (1,1) — is a peer
    cells[0]![1]!.pencilMarks.add(3 as Digit);
    // (1,0) shares row 1 with (1,1) — is a peer
    cells[1]![0]!.pencilMarks.add(3 as Digit);
    // (2,2) is in the same top-left box as (1,1) — is a peer
    cells[2]![2]!.pencilMarks.add(3 as Digit);
    const state = { ...loaded, cells, selection: { cell: { row: 1, col: 1 }, number: null } };
    const next = placeDigit(state, 3 as Digit);
    expect(next.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(false);
    expect(next.cells[1]![0]!.pencilMarks.has(3 as Digit)).toBe(false);
    expect(next.cells[2]![2]!.pencilMarks.has(3 as Digit)).toBe(false);
  });

  it('leaves other pencil marks on peer cells untouched', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[0]![1]!.pencilMarks.add(3 as Digit);
    cells[0]![1]!.pencilMarks.add(5 as Digit);
    const state = { ...loaded, cells, selection: { cell: { row: 1, col: 1 }, number: null } };
    const next = placeDigit(state, 3 as Digit);
    expect(next.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(false);
    expect(next.cells[0]![1]!.pencilMarks.has(5 as Digit)).toBe(true);
  });

  it('undo restores cleared peer pencil marks', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[0]![1]!.pencilMarks.add(3 as Digit);
    const state = { ...loaded, cells, selection: { cell: { row: 1, col: 1 }, number: null } };
    const placed = withSnapshot(state, (s) => placeDigit(s, 3 as Digit));
    expect(placed.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(false);
    const reverted = undo(placed);
    expect(reverted.cells[0]![1]!.pencilMarks.has(3 as Digit)).toBe(true);
    expect(reverted.cells[1]![1]!.value).toBeNull();
  });
});

describe('fillCandidates', () => {
  it('fills valid candidates into empty cells', () => {
    // makePuzzle sets (0,0)=5 and (4,4)=7; cell (1,1) is empty.
    // (0,0) is in the same box as (1,1), so 5 must not appear as a candidate.
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const next = withSnapshot(loaded, fillCandidates);
    const marks = next.cells[1]![1]!.pencilMarks;
    expect(marks.has(5 as Digit)).toBe(false);
    expect(marks.size).toBeGreaterThan(0);
  });

  it('undo after fillCandidates restores the prior empty pencil marks', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const filled = withSnapshot(loaded, fillCandidates);
    expect(filled.cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
    const reverted = undo(filled);
    expect(reverted.cells[1]![1]!.pencilMarks.size).toBe(0);
  });
});

const mockStep: Step = {
  technique: 'nakedSingle',
  highlights: [{ row: 0, col: 8 }],
  placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
  eliminations: [],
  explanation: 'Cell (0,8) can only contain 9.',
};

describe('requestHint', () => {
  it('sets currentHint and hintLevel to 1 when a technique applies', () => {
    const cells = cloneCellsForTest(initialEmptyState.cells);
    for (let c = 0; c < 8; c++) {
      cells[0]![c]!.value = (c + 1) as Digit;
    }
    const state = { ...initialEmptyState, cells };
    const next = requestHint(state);
    expect(next.currentHint).not.toBeNull();
    expect(next.currentHint?.technique).toBe('nakedSingle');
    expect(next.hintLevel).toBe(1);
  });

  it('sets currentHint to null when no technique applies', () => {
    const next = requestHint(initialEmptyState);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('advanceHint', () => {
  it('increments hintLevel from 1 to 2', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 1 as const };
    expect(advanceHint(state).hintLevel).toBe(2);
  });

  it('increments hintLevel from 3 to 4', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 3 as const };
    expect(advanceHint(state).hintLevel).toBe(4);
  });

  it('does not go past 4', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 4 as const };
    expect(advanceHint(state).hintLevel).toBe(4);
  });

  it('is a no-op when currentHint is null', () => {
    const next = advanceHint(initialEmptyState);
    expect(next).toBe(initialEmptyState);
  });
});

describe('dismissHint', () => {
  it('sets currentHint to null and hintLevel to 1', () => {
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 3 as const };
    const next = dismissHint(state);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('withSnapshot — hint auto-dismiss', () => {
  it('clears currentHint when placeDigit commits a mutation', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const stateWithHint = {
      ...loaded,
      currentHint: mockStep,
      hintLevel: 2 as const,
      selection: { cell: { row: 1, col: 1 }, number: null },
    };
    const next = withSnapshot(stateWithHint, (s) => placeDigit(s, 3 as Digit));
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('undo/redo — hint auto-dismiss', () => {
  it('undo clears currentHint', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 2 as const,
      history: { past: [{ cells: initialEmptyState.cells, pencilMode: false }], future: [] },
    };
    const next = undo(state);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });

  it('redo clears currentHint', () => {
    const state = {
      ...initialEmptyState,
      currentHint: mockStep,
      hintLevel: 2 as const,
      history: { past: [], future: [{ cells: initialEmptyState.cells, pencilMode: false }] },
    };
    const next = redo(state);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('togglePencilMode — hint preserved', () => {
  it('does not clear currentHint when toggling pencil mode', () => {
    const mockStep: Step = {
      technique: 'nakedSingle',
      highlights: [{ row: 0, col: 8 }],
      placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
      eliminations: [],
      explanation: 'Cell (0,8) can only contain 9.',
    };
    const state = { ...initialEmptyState, currentHint: mockStep, hintLevel: 2 as const };
    const next = withSnapshot(state, togglePencilMode);
    expect(next.currentHint).not.toBeNull();
    expect(next.hintLevel).toBe(2);
  });
});

describe('setScreen', () => {
  it("setScreen('game') sets screen to 'game'", () => {
    const next = setScreen(initialEmptyState, 'game');
    expect(next.screen).toBe('game');
  });

  it("setScreen('landing') sets screen to 'landing'", () => {
    const state = { ...initialEmptyState, screen: 'game' as const };
    const next = setScreen(state, 'landing');
    expect(next.screen).toBe('landing');
  });
});

describe('eraseCell — hint dismissed', () => {
  it('clears currentHint when a cell value is erased', () => {
    const mockStep: Step = {
      technique: 'nakedSingle',
      highlights: [{ row: 0, col: 8 }],
      placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
      eliminations: [],
      explanation: 'Cell (0,8) can only contain 9.',
    };
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    const cells = cloneCellsForTest(loaded.cells);
    cells[1]![1]!.value = 3 as Digit; // place a non-given value
    const state = {
      ...loaded,
      cells,
      currentHint: mockStep,
      hintLevel: 2 as const,
      selection: { cell: { row: 1, col: 1 }, number: null },
    };
    const next = withSnapshot(state, eraseCell);
    expect(next.currentHint).toBeNull();
    expect(next.hintLevel).toBe(1);
  });
});

describe('initialEmptyState.won', () => {
  it('is false', () => {
    expect(initialEmptyState.won).toBe(false);
  });
});

describe('loadPuzzle — won', () => {
  it('resets won to false', () => {
    const dirty = { ...initialEmptyState, won: true };
    expect(loadPuzzle(dirty, makePuzzle()).won).toBe(false);
  });
});

describe('placeDigit — win detection', () => {
  function makeAlmostWonState(): { state: ReturnType<typeof loadPuzzle>; solution: SolvedGrid } {
    // solution[r][c] = ((r + c) % 9) + 1
    const solution: SolvedGrid = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
    );
    const puzzle: Puzzle = {
      id: 'win-test',
      difficulty: 'easy',
      initialBoard: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => null as Digit | null),
      ),
      solution,
    };
    // All cells filled with solution values except (8,8)
    const cells = solution.map((row, r) =>
      row.map((v, c) => ({
        value: r === 8 && c === 8 ? null : v,
        pencilMarks: new Set<Digit>(),
      })),
    );
    const given = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));
    const state = {
      ...initialEmptyState,
      puzzle,
      cells,
      given,
      selection: { cell: { row: 8, col: 8 }, number: null },
    };
    return { state, solution };
  }

  it('sets won to true when the placed digit completes the solution', () => {
    const { state, solution } = makeAlmostWonState();
    // solution[8][8] = ((8 + 8) % 9 + 1) = (7 + 1) = 8
    const correctDigit = solution[8]![8]!;
    const next = placeDigit(state, correctDigit);
    expect(next.won).toBe(true);
  });

  it('leaves won false when the placed digit does not complete the solution', () => {
    const { state, solution } = makeAlmostWonState();
    // solution[8][8] is 8; place 1 instead (wrong digit)
    const wrongDigit = (solution[8]![8]! === 1 ? 2 : 1) as Digit;
    const next = placeDigit(state, wrongDigit);
    expect(next.won).toBe(false);
  });

  it('leaves won false when only some cells are filled', () => {
    const puzzle = makePuzzle();
    const loaded = loadPuzzle(initialEmptyState, puzzle);
    const selected = selectCell(loaded, { row: 1, col: 1 });
    const next = placeDigit(selected, 3 as Digit);
    expect(next.won).toBe(false);
  });
});

describe('dismissWin', () => {
  it('sets won to false', () => {
    const state = { ...initialEmptyState, won: true };
    expect(dismissWin(state).won).toBe(false);
  });

  it('returns a new object when already false', () => {
    expect(dismissWin(initialEmptyState)).not.toBe(initialEmptyState);
    expect(dismissWin(initialEmptyState).won).toBe(false);
  });
});

describe('tickTimer', () => {
  it('increments elapsedMs by 1000', () => {
    const state = { ...initialEmptyState, elapsedMs: 5000 };
    expect(tickTimer(state).elapsedMs).toBe(6000);
  });

  it('does not mutate other state fields', () => {
    const state = { ...initialEmptyState, elapsedMs: 0, mistakes: 3 };
    const next = tickTimer(state);
    expect(next.mistakes).toBe(3);
    expect(next.cells).toBe(state.cells);
  });
});
