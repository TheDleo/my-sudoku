import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf, boxIndexOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type LineKind = 'row' | 'column';

function scanForBoxLineReduction(
  state: SolverState,
  lines: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: LineKind,
): Step | null {
  const boxes = boxesOf();
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    for (const digit of DIGITS) {
      const cells = cellsWithDigit(state, line, digit);
      if (cells.length < 2 || cells.length > 3) continue;

      const firstBox = boxIndexOf(cells[0]!);
      const allSameBox = cells.every((c) => boxIndexOf(c) === firstBox);
      if (!allSameBox) continue;

      const box = boxes[firstBox]!;
      const eliminations: Elimination[] = [];
      for (const coord of box) {
        if (kind === 'row' && coord.row === cells[0]!.row) continue;
        if (kind === 'column' && coord.col === cells[0]!.col) continue;
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) {
          eliminations.push({ cell: coord, digit });
        }
      }
      if (eliminations.length === 0) continue;

      return {
        technique: 'boxLineReduction',
        highlights: cells,
        placements: [],
        eliminations,
        explanation: `In ${kind} ${lineIdx + 1}, digit ${digit} is confined to box ${firstBox + 1}; it can be eliminated from the rest of that box.`,
      };
    }
  }
  return null;
}

export const boxLineReduction: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForBoxLineReduction(state, rowsOf(), 'row') ??
    scanForBoxLineReduction(state, colsOf(), 'column')
  );
};
