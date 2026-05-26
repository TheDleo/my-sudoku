export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CellCoord = { row: number; col: number };

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Cell = {
  value: Digit | null;
  pencilMarks: Set<Digit>;
};

export type Board = Cell[][];

export type SolvedGrid = Digit[][];

export type Puzzle = {
  id: string;
  difficulty: Difficulty;
  initialBoard: (Digit | null)[][];
  solution: SolvedGrid;
};
