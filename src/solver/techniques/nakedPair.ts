import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type UnitKind = 'row' | 'column' | 'box';

function setsEqual(a: Set<Digit>, b: Set<Digit>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function scanForNakedPair(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    const pairCandidates: { coord: CellCoord; set: Set<Digit> }[] = [];
    for (const coord of unit) {
      if (state.values[coord.row]![coord.col] !== null) continue;
      const set = state.candidates[coord.row]![coord.col]!;
      if (set.size === 2) pairCandidates.push({ coord, set });
    }
    for (let i = 0; i < pairCandidates.length; i++) {
      for (let j = i + 1; j < pairCandidates.length; j++) {
        const a = pairCandidates[i]!;
        const b = pairCandidates[j]!;
        if (!setsEqual(a.set, b.set)) continue;

        const digits = Array.from(a.set);
        const eliminations: Elimination[] = [];
        for (const coord of unit) {
          if (coord.row === a.coord.row && coord.col === a.coord.col) continue;
          if (coord.row === b.coord.row && coord.col === b.coord.col) continue;
          if (state.values[coord.row]![coord.col] !== null) continue;
          const cellSet = state.candidates[coord.row]![coord.col]!;
          for (const digit of digits) {
            if (cellSet.has(digit)) {
              eliminations.push({ cell: coord, digit });
            }
          }
        }
        if (eliminations.length === 0) continue;

        const sortedDigits = digits.slice().sort((x, y) => x - y);
        return {
          technique: 'nakedPair',
          highlights: [a.coord, b.coord],
          placements: [],
          eliminations,
          explanation: `Cells (${a.coord.row + 1}, ${a.coord.col + 1}) and (${b.coord.row + 1}, ${b.coord.col + 1}) in ${kind} ${u + 1} must contain ${sortedDigits[0]} and ${sortedDigits[1]}, eliminating those digits from the rest of the ${kind}.`,
        };
      }
    }
  }
  return null;
}

export const nakedPair: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForNakedPair(state, rowsOf(), 'row') ??
    scanForNakedPair(state, colsOf(), 'column') ??
    scanForNakedPair(state, boxesOf(), 'box')
  );
};
