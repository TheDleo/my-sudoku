import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type UnitKind = 'row' | 'column' | 'box';

function coordKey(c: CellCoord): string {
  return `${c.row},${c.col}`;
}

function scanForHiddenQuad(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;

    const digitCells = new Map<Digit, CellCoord[]>();
    for (const digit of DIGITS) {
      const cells = cellsWithDigit(state, unit, digit);
      if (cells.length >= 2 && cells.length <= 4) digitCells.set(digit, cells);
    }
    const candidateDigits = Array.from(digitCells.keys());
    if (candidateDigits.length < 4) continue;

    for (let i = 0; i < candidateDigits.length; i++) {
      for (let j = i + 1; j < candidateDigits.length; j++) {
        for (let k = j + 1; k < candidateDigits.length; k++) {
          for (let l = k + 1; l < candidateDigits.length; l++) {
            const d1 = candidateDigits[i]!;
            const d2 = candidateDigits[j]!;
            const d3 = candidateDigits[k]!;
            const d4 = candidateDigits[l]!;
            const cellSet = new Set<string>();
            for (const c of digitCells.get(d1)!) cellSet.add(coordKey(c));
            for (const c of digitCells.get(d2)!) cellSet.add(coordKey(c));
            for (const c of digitCells.get(d3)!) cellSet.add(coordKey(c));
            for (const c of digitCells.get(d4)!) cellSet.add(coordKey(c));
            if (cellSet.size !== 4) continue;

            const cellsInQuad: CellCoord[] = [];
            for (const key of cellSet) {
              const [r, c] = key.split(',').map(Number) as [number, number];
              cellsInQuad.push({ row: r, col: c });
            }
            cellsInQuad.sort((a, b) => a.row - b.row || a.col - b.col);

            const eliminations: Elimination[] = [];
            for (const coord of cellsInQuad) {
              const cellCands = state.candidates[coord.row]![coord.col]!;
              for (const d of cellCands) {
                if (d !== d1 && d !== d2 && d !== d3 && d !== d4)
                  eliminations.push({ cell: coord, digit: d });
              }
            }
            if (eliminations.length === 0) continue;

            const sortedDigits = [d1, d2, d3, d4].sort((x, y) => x - y);
            return {
              technique: 'hiddenQuad',
              highlights: cellsInQuad,
              placements: [],
              eliminations,
              explanation: `In ${kind} ${u + 1}, digits ${sortedDigits.join(', ')} can only go in cells (${cellsInQuad[0]!.row + 1}, ${cellsInQuad[0]!.col + 1}), (${cellsInQuad[1]!.row + 1}, ${cellsInQuad[1]!.col + 1}), (${cellsInQuad[2]!.row + 1}, ${cellsInQuad[2]!.col + 1}), and (${cellsInQuad[3]!.row + 1}, ${cellsInQuad[3]!.col + 1}); other candidates can be removed from those cells.`,
            };
          }
        }
      }
    }
  }
  return null;
}

export const hiddenQuad: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForHiddenQuad(state, rowsOf(), 'row') ??
    scanForHiddenQuad(state, colsOf(), 'column') ??
    scanForHiddenQuad(state, boxesOf(), 'box')
  );
};
