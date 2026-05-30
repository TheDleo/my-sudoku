import type { Cell, CellCoord, Digit, Puzzle } from '../types';
import { cloneCells, computeCandidates, empty9x9 } from './helpers';
import { peersOf } from '../solver/units';
import { getHint } from '../hints/engine';
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
  currentHint: null,
  hintLevel: 1,
  screen: 'landing',
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
    currentHint: null,
    hintLevel: 1,
    screen: 'game',
  };
}

export function selectCell(state: GameState, coord: CellCoord | null): GameState {
  return { ...state, selection: { ...state.selection, cell: coord } };
}

export function setSelectedNumber(state: GameState, n: Digit | null): GameState {
  return { ...state, selection: { ...state.selection, number: n } };
}

function isConflictingPlacement(cells: Cell[][], sel: CellCoord, digit: Digit): boolean {
  return peersOf(sel).some((peer) => cells[peer.row]![peer.col]!.value === digit);
}

export function placeDigit(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const nextCells = cloneCells(state.cells);
  nextCells[sel.row]![sel.col]!.value = digit;
  for (const peer of peersOf(sel)) {
    nextCells[peer.row]![peer.col]!.pencilMarks.delete(digit);
  }
  const conflicted = isConflictingPlacement(state.cells, sel, digit);
  return {
    ...state,
    cells: nextCells,
    mistakes: conflicted ? state.mistakes + 1 : state.mistakes,
    currentHint: null,
    hintLevel: 1,
  };
}

export function eraseCell(state: GameState): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  const cell = state.cells[sel.row]![sel.col]!;
  if (cell.value !== null) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.value = null;
    return { ...state, cells: nextCells, currentHint: null, hintLevel: 1 };
  }
  if (cell.pencilMarks.size > 0) {
    const nextCells = cloneCells(state.cells);
    nextCells[sel.row]![sel.col]!.pencilMarks = new Set<Digit>();
    return { ...state, cells: nextCells, currentHint: null, hintLevel: 1 };
  }
  return state;
}

export function togglePencilMark(state: GameState, digit: Digit): GameState {
  const sel = state.selection.cell;
  if (sel === null) return state;
  if (state.given[sel.row]![sel.col]) return state;
  if (state.cells[sel.row]![sel.col]!.value !== null) return state;
  const nextCells = cloneCells(state.cells);
  const marks = nextCells[sel.row]![sel.col]!.pencilMarks;
  if (marks.has(digit)) marks.delete(digit);
  else marks.add(digit);
  return { ...state, cells: nextCells };
}

export function togglePencilMode(state: GameState): GameState {
  return { ...state, pencilMode: !state.pencilMode };
}

export function withSnapshot(state: GameState, mutate: (s: GameState) => GameState): GameState {
  const snapshot: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
  const next = mutate(state);
  if (next === state) return state;
  return {
    ...next,
    history: { past: [...state.history.past, snapshot], future: [] },
  };
}

export function undo(state: GameState): GameState {
  if (state.history.past.length === 0) return state;
  const snapshot = state.history.past[state.history.past.length - 1]!;
  const current: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
  return {
    ...state,
    cells: snapshot.cells,
    pencilMode: snapshot.pencilMode,
    currentHint: null,
    hintLevel: 1,
    history: {
      past: state.history.past.slice(0, -1),
      future: [...state.history.future, current],
    },
  };
}

export function redo(state: GameState): GameState {
  if (state.history.future.length === 0) return state;
  const snapshot = state.history.future[state.history.future.length - 1]!;
  const current: GameSnapshot = {
    cells: cloneCells(state.cells),
    pencilMode: state.pencilMode,
  };
  return {
    ...state,
    cells: snapshot.cells,
    pencilMode: snapshot.pencilMode,
    currentHint: null,
    hintLevel: 1,
    history: {
      past: [...state.history.past, current],
      future: state.history.future.slice(0, -1),
    },
  };
}

export function fillCandidates(state: GameState): GameState {
  return { ...state, cells: computeCandidates(state.cells) };
}

export function requestHint(state: GameState): GameState {
  const hint = getHint(state.cells);
  return { ...state, currentHint: hint, hintLevel: 1 };
}

export function advanceHint(state: GameState): GameState {
  if (state.currentHint === null) return state;
  if (state.hintLevel >= 4) return state;
  return { ...state, hintLevel: (state.hintLevel + 1) as 1 | 2 | 3 | 4 };
}

export function dismissHint(state: GameState): GameState {
  if (state.currentHint === null) return state;
  return { ...state, currentHint: null, hintLevel: 1 };
}

// Re-export shared types for convenience.
export type { GameSnapshot, GameState };
