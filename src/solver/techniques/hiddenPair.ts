import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type UnitKind = 'row' | 'column' | 'box';

function sameTwoCells(a: CellCoord[], b: CellCoord[]): boolean {
  if (a.length !== 2 || b.length !== 2) return false;
  const key = (cs: CellCoord[]) =>
    cs
      .map((c) => `${c.row},${c.col}`)
      .sort()
      .join('|');
  return key(a) === key(b);
}

function scanForHiddenPair(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    for (let i = 0; i < DIGITS.length; i++) {
      const d1 = DIGITS[i]!;
      const cells1 = cellsWithDigit(state, unit, d1);
      if (cells1.length !== 2) continue;
      for (let j = i + 1; j < DIGITS.length; j++) {
        const d2 = DIGITS[j]!;
        const cells2 = cellsWithDigit(state, unit, d2);
        if (!sameTwoCells(cells1, cells2)) continue;

        const [a, b] = cells1 as [CellCoord, CellCoord];
        const eliminations: Elimination[] = [];
        for (const coord of [a, b]) {
          const cellSet = state.candidates[coord.row]![coord.col]!;
          for (const d of cellSet) {
            if (d !== d1 && d !== d2) eliminations.push({ cell: coord, digit: d });
          }
        }
        if (eliminations.length === 0) continue;

        return {
          technique: 'hiddenPair',
          highlights: [a, b],
          placements: [],
          eliminations,
          explanation: `In ${kind} ${u + 1}, digits ${d1} and ${d2} can only go in cells (${a.row + 1}, ${a.col + 1}) and (${b.row + 1}, ${b.col + 1}); other candidates can be removed from those cells.`,
        };
      }
    }
  }
  return null;
}

export const hiddenPair: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForHiddenPair(state, rowsOf(), 'row') ??
    scanForHiddenPair(state, colsOf(), 'column') ??
    scanForHiddenPair(state, boxesOf(), 'box')
  );
};
