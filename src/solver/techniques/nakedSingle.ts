import type { Digit } from '../../types';
import type { SolverState, Step, TechniqueDetector } from '../types';

export const nakedSingle: TechniqueDetector = (state: SolverState): Step | null => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const cands = state.candidates[r]![c]!;
      if (cands.size === 1) {
        const digit = cands.values().next().value as Digit;
        return {
          technique: 'nakedSingle',
          highlights: [{ row: r, col: c }],
          placements: [{ cell: { row: r, col: c }, digit }],
          eliminations: [],
          explanation: `Cell (${r + 1}, ${c + 1}) has only one possible digit: ${digit}.`,
        };
      }
    }
  }
  return null;
};
