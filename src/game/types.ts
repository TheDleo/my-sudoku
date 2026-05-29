import type { Cell, CellCoord, Digit, Puzzle } from '../types';

export type GameSnapshot = {
  cells: Cell[][];
  pencilMode: boolean;
};

export type GameState = {
  puzzle: Puzzle;
  cells: Cell[][];
  given: boolean[][];
  selection: { cell: CellCoord | null; number: Digit | null };
  pencilMode: boolean;
  mistakes: number;
  elapsedMs: number;
  history: { past: GameSnapshot[]; future: GameSnapshot[] };
};

export type GameStore = GameState & {
  loadPuzzle: (puzzle: Puzzle) => void;
  selectCell: (coord: CellCoord | null) => void;
  setSelectedNumber: (n: Digit | null) => void;
  placeDigit: (d: Digit) => void;
  eraseCell: () => void;
  togglePencilMark: (d: Digit) => void;
  togglePencilMode: () => void;
  fillCandidates: () => void;
  undo: () => void;
  redo: () => void;
};
