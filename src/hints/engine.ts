import type { Cell } from '../types';
import type { Step, TechniqueName } from '../solver/types';
import { computeCandidates } from '../solver/candidates';
import { ALL_TECHNIQUES } from '../solver/techniques';

export const TECHNIQUE_LABELS: Record<TechniqueName, string> = {
  nakedSingle: 'Naked Single',
  hiddenSingle: 'Hidden Single',
  nakedPair: 'Naked Pair',
  nakedTriple: 'Naked Triple',
  hiddenPair: 'Hidden Pair',
  hiddenTriple: 'Hidden Triple',
  pointingPair: 'Pointing Pair',
  nakedQuad: 'Naked Quad',
  hiddenQuad: 'Hidden Quad',
  xWing: 'X-Wing',
  boxLineReduction: 'Box-Line Reduction',
  swordfish: 'Swordfish',
  xyWing: 'XY-Wing',
  xyzWing: 'XYZ-Wing',
  coloring: 'Coloring',
  uniqueRectangle: 'Unique Rectangle',
};

export function getHint(cells: Cell[][]): Step | null {
  const values = cells.map((row) => row.map((c) => c.value));
  const computedCandidates = computeCandidates(values);
  const candidates = cells.map((row, r) =>
    row.map((cell, c) => {
      if (cell.value !== null) return computedCandidates[r]![c]!;
      return cell.pencilMarks.size > 0 ? cell.pencilMarks : computedCandidates[r]![c]!;
    }),
  );
  for (const detector of ALL_TECHNIQUES) {
    const step = detector({ values, candidates });
    if (step !== null) return step;
  }
  return null;
}
