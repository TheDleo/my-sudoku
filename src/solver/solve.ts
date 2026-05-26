import type { Digit } from '../types';
import { computeCandidates, removeCandidateFromPeers } from './candidates';
import { ALL_TECHNIQUES } from './techniques';
import type { SolverState, Step } from './types';

export type SolveResult = {
  state: SolverState;
  steps: Step[];
  solved: boolean;
};

function cloneValues(values: (Digit | null)[][]): (Digit | null)[][] {
  return values.map((row) => [...row]);
}

function isSolved(values: (Digit | null)[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r]![c] === null) return false;
    }
  }
  return true;
}

export function solve(initial: (Digit | null)[][]): SolveResult {
  let values = cloneValues(initial);
  let candidates = computeCandidates(values);
  const steps: Step[] = [];

  for (let safety = 0; safety < 1000; safety++) {
    let progressed = false;
    for (const detector of ALL_TECHNIQUES) {
      const step = detector({ values, candidates });
      if (!step) continue;

      // Apply placements
      for (const placement of step.placements) {
        values = cloneValues(values);
        values[placement.cell.row]![placement.cell.col] = placement.digit;
        candidates = removeCandidateFromPeers(candidates, placement.cell, placement.digit);
        // The placed cell itself has no candidates left.
        const newCellRow = candidates[placement.cell.row]!.slice();
        newCellRow[placement.cell.col] = new Set();
        const newCandidates = candidates.slice();
        newCandidates[placement.cell.row] = newCellRow;
        candidates = newCandidates;
      }

      // Apply eliminations (easy techniques use empty arrays here; this future-proofs the loop)
      for (const elim of step.eliminations) {
        const newRow = candidates[elim.cell.row]!.slice();
        const newSet = new Set(newRow[elim.cell.col]);
        newSet.delete(elim.digit);
        newRow[elim.cell.col] = newSet;
        const newCandidates = candidates.slice();
        newCandidates[elim.cell.row] = newRow;
        candidates = newCandidates;
      }

      steps.push(step);
      progressed = true;
      break;
    }
    if (!progressed) break;
  }

  return {
    state: { values, candidates },
    steps,
    solved: isSolved(values),
  };
}
