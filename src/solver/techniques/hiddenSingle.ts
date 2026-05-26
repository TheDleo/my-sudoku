import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { SolverState, Step, TechniqueDetector } from '../types';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type UnitKind = 'row' | 'column' | 'box';

function scanUnits(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    for (const digit of DIGITS) {
      const cellsWithDigit: CellCoord[] = [];
      for (const coord of unit) {
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) {
          cellsWithDigit.push(coord);
          if (cellsWithDigit.length > 1) break;
        }
      }
      if (cellsWithDigit.length === 1) {
        const placement = cellsWithDigit[0]!;
        return {
          technique: 'hiddenSingle',
          highlights: [placement, ...unit],
          placements: [{ cell: placement, digit }],
          eliminations: [],
          explanation: `In ${kind} ${u + 1}, ${digit} can only go in cell (${placement.row + 1}, ${placement.col + 1}).`,
        };
      }
    }
  }
  return null;
}

export const hiddenSingle: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanUnits(state, rowsOf(), 'row') ??
    scanUnits(state, colsOf(), 'column') ??
    scanUnits(state, boxesOf(), 'box')
  );
};
