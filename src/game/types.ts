import type { Cell, CellCoord, Digit, Puzzle } from '../types';
import type { Step } from '../solver/types';

export type GameSnapshot = {
  cells: Cell[][];
  pencilMode: boolean;
  colorMarks: ('A' | 'B' | null)[][];
};

export type GameState = {
  puzzle: Puzzle;
  cells: Cell[][];
  given: boolean[][];
  selection: { cell: CellCoord | null; number: Digit | null };
  pencilMode: boolean;
  mistakes: number;
  elapsedMs: number;
  hintsUsed: number;
  history: { past: GameSnapshot[]; future: GameSnapshot[] };
  currentHint: Step | null;
  hintLevel: 1 | 2 | 3 | 4;
  screen: 'landing' | 'game';
  won: boolean;
  colorMarks: ('A' | 'B' | null)[][];
  colorMode: 'A' | 'B' | null;
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
  requestHint: () => void;
  advanceHint: () => void;
  dismissHint: () => void;
  undo: () => void;
  redo: () => void;
  setScreen: (s: 'landing' | 'game') => void;
  resumeGame: () => void;
  dismissWin: () => void;
  tickTimer: () => void;
  setColorMark: (coord: CellCoord, color: 'A' | 'B' | null) => void;
  toggleColorMode: (color: 'A' | 'B') => void;
};
