import type { CellCoord, Digit } from '../../types';
import { boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function inBox(coord: CellCoord, box: ReadonlyArray<CellCoord>): boolean {
  for (const c of box) {
    if (c.row === coord.row && c.col === coord.col) return true;
  }
  return false;
}

export const pointingPair: TechniqueDetector = (state: SolverState): Step | null => {
  const boxes = boxesOf();
  for (let b = 0; b < boxes.length; b++) {
    const box = boxes[b]!;
    for (const digit of DIGITS) {
      const cells: CellCoord[] = [];
      for (const coord of box) {
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) cells.push(coord);
      }
      if (cells.length < 2 || cells.length > 3) continue;

      const allSameRow = cells.every((c) => c.row === cells[0]!.row);
      const allSameCol = cells.every((c) => c.col === cells[0]!.col);

      let lineKind: 'row' | 'column' | null = null;
      let lineIndex = -1;
      if (allSameRow) {
        lineKind = 'row';
        lineIndex = cells[0]!.row;
      } else if (allSameCol) {
        lineKind = 'column';
        lineIndex = cells[0]!.col;
      } else {
        continue;
      }

      const eliminations: Elimination[] = [];
      for (let i = 0; i < 9; i++) {
        const coord: CellCoord =
          lineKind === 'row' ? { row: lineIndex, col: i } : { row: i, col: lineIndex };
        if (inBox(coord, box)) continue;
        if (state.values[coord.row]![coord.col] !== null) continue;
        if (state.candidates[coord.row]![coord.col]!.has(digit)) {
          eliminations.push({ cell: coord, digit });
        }
      }
      if (eliminations.length === 0) continue;

      return {
        technique: 'pointingPair',
        highlights: cells,
        placements: [],
        eliminations,
        explanation: `In box ${b + 1}, digit ${digit} is confined to ${lineKind} ${lineIndex + 1}; it can be eliminated from the rest of that ${lineKind}.`,
      };
    }
  }
  return null;
};
