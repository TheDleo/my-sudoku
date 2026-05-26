import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type UnitKind = 'row' | 'column' | 'box';

function coordKey(c: CellCoord): string {
  return `${c.row},${c.col}`;
}

function scanForHiddenTriple(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;

    const digitCells = new Map<Digit, CellCoord[]>();
    for (const digit of DIGITS) {
      const cells = cellsWithDigit(state, unit, digit);
      if (cells.length >= 2 && cells.length <= 3) digitCells.set(digit, cells);
    }
    const candidateDigits = Array.from(digitCells.keys());
    if (candidateDigits.length < 3) continue;

    for (let i = 0; i < candidateDigits.length; i++) {
      for (let j = i + 1; j < candidateDigits.length; j++) {
        for (let k = j + 1; k < candidateDigits.length; k++) {
          const d1 = candidateDigits[i]!;
          const d2 = candidateDigits[j]!;
          const d3 = candidateDigits[k]!;
          const cellSet = new Set<string>();
          for (const c of digitCells.get(d1)!) cellSet.add(coordKey(c));
          for (const c of digitCells.get(d2)!) cellSet.add(coordKey(c));
          for (const c of digitCells.get(d3)!) cellSet.add(coordKey(c));
          if (cellSet.size !== 3) continue;

          const cellsInTriple: CellCoord[] = [];
          for (const key of cellSet) {
            const [r, c] = key.split(',').map(Number) as [number, number];
            cellsInTriple.push({ row: r, col: c });
          }
          cellsInTriple.sort((a, b) => a.row - b.row || a.col - b.col);

          const eliminations: Elimination[] = [];
          for (const coord of cellsInTriple) {
            const cellCands = state.candidates[coord.row]![coord.col]!;
            for (const d of cellCands) {
              if (d !== d1 && d !== d2 && d !== d3) eliminations.push({ cell: coord, digit: d });
            }
          }
          if (eliminations.length === 0) continue;

          const sortedDigits = [d1, d2, d3].sort((x, y) => x - y);
          return {
            technique: 'hiddenTriple',
            highlights: cellsInTriple,
            placements: [],
            eliminations,
            explanation: `In ${kind} ${u + 1}, digits ${sortedDigits.join(', ')} can only go in cells (${cellsInTriple[0]!.row + 1}, ${cellsInTriple[0]!.col + 1}), (${cellsInTriple[1]!.row + 1}, ${cellsInTriple[1]!.col + 1}), and (${cellsInTriple[2]!.row + 1}, ${cellsInTriple[2]!.col + 1}); other candidates can be removed from those cells.`,
          };
        }
      }
    }
  }
  return null;
}

export const hiddenTriple: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForHiddenTriple(state, rowsOf(), 'row') ??
    scanForHiddenTriple(state, colsOf(), 'column') ??
    scanForHiddenTriple(state, boxesOf(), 'box')
  );
};
