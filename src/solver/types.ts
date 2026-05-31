import type { CellCoord, Difficulty, Digit } from '../types';

export type TechniqueName =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'nakedPair'
  | 'nakedTriple'
  | 'hiddenPair'
  | 'hiddenTriple'
  | 'pointingPair'
  | 'nakedQuad'
  | 'hiddenQuad'
  | 'xWing'
  | 'boxLineReduction'
  | 'swordfish'
  | 'xyWing'
  | 'xyzWing'
  | 'coloring'
  | 'uniqueRectangle';

export const TECHNIQUE_DIFFICULTY: Record<TechniqueName, Difficulty> = {
  nakedSingle: 'easy',
  hiddenSingle: 'easy',
  nakedPair: 'medium',
  nakedTriple: 'medium',
  hiddenPair: 'medium',
  hiddenTriple: 'medium',
  pointingPair: 'medium',
  nakedQuad: 'hard',
  hiddenQuad: 'hard',
  xWing: 'hard',
  boxLineReduction: 'hard',
  swordfish: 'expert',
  xyWing: 'expert',
  xyzWing: 'expert',
  coloring: 'expert',
  uniqueRectangle: 'expert',
};

export type Placement = { cell: CellCoord; digit: Digit };
export type Elimination = { cell: CellCoord; digit: Digit };

export type Step = {
  technique: TechniqueName;
  highlights: CellCoord[];
  colorGroups?: { a: CellCoord[]; b: CellCoord[] };
  placements: Placement[];
  eliminations: Elimination[];
  explanation: string;
};

export type SolverState = {
  values: (Digit | null)[][];
  candidates: Set<Digit>[][];
};

export type TechniqueDetector = (state: SolverState) => Step | null;
