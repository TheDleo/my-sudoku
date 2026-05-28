import type { Cell, CellCoord, Digit, Puzzle } from '../types';
import { cloneCells, empty9x9 } from './helpers';
import type { GameSnapshot, GameState } from './types';

const SENTINEL_PUZZLE: Puzzle = {
  id: '',
  difficulty: 'easy',
  initialBoard: empty9x9<Digit | null>(null),
  solution: empty9x9<Digit>(1 as Digit),
};

export const initialEmptyState: GameState = {
  puzzle: SENTINEL_PUZZLE,
  cells: empty9x9<Cell>(() => ({ value: null, pencilMarks: new Set<Digit>() })),
  given: empty9x9<boolean>(false),
  selection: { cell: null, number: null },
  pencilMode: false,
  mistakes: 0,
  elapsedMs: 0,
  history: { past: [], future: [] },
};

export function loadPuzzle(_state: GameState, puzzle: Puzzle): GameState {
  const cells: Cell[][] = puzzle.initialBoard.map((row) =>
    row.map((v) => ({ value: v, pencilMarks: new Set<Digit>() })),
  );
  const given: boolean[][] = puzzle.initialBoard.map((row) => row.map((v) => v !== null));
  return {
    puzzle,
    cells,
    given,
    selection: { cell: null, number: null },
    pencilMode: false,
    mistakes: 0,
    elapsedMs: 0,
    history: { past: [], future: [] },
  };
}

export function selectCell(state: GameState, coord: CellCoord | null): GameState {
  return { ...state, selection: { ...state.selection, cell: coord } };
}

export function setSelectedNumber(state: GameState, n: Digit | null): GameState {
  return { ...state, selection: { ...state.selection, number: n } };
}

export function placeDigit(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const nextCells = cloneCells(state.cells);
  nextCells[sel.row]![sel.col]!.value = digit;
  return { ...state, cells: nextCells };
}

export function eraseCell(state: GameState): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const cell = state.cells[sel.row]![sel.col]!;
  if (cell.value !== null) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.value = null;
    return { ...state, cells: nextCells };
  }
  if (cell.pencilMarks.size > 0) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.pencilMarks = new Set<Digit>();
    return { ...state, cells: nextCells };
  }
  return state;
}

// Re-export shared types for convenience.
export type { GameSnapshot, GameState };
