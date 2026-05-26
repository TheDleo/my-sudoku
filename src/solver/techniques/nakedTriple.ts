import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type UnitKind = 'row' | 'column' | 'box';

function scanForNakedTriple(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    const tripleCandidates: { coord: CellCoord; set: Set<Digit> }[] = [];
    for (const coord of unit) {
      if (state.values[coord.row]![coord.col] !== null) continue;
      const set = state.candidates[coord.row]![coord.col]!;
      if (set.size === 2 || set.size === 3) tripleCandidates.push({ coord, set });
    }
    if (tripleCandidates.length < 3) continue;

    for (let i = 0; i < tripleCandidates.length; i++) {
      for (let j = i + 1; j < tripleCandidates.length; j++) {
        for (let k = j + 1; k < tripleCandidates.length; k++) {
          const a = tripleCandidates[i]!;
          const b = tripleCandidates[j]!;
          const c = tripleCandidates[k]!;
          const union = new Set<Digit>();
          for (const d of a.set) union.add(d);
          for (const d of b.set) union.add(d);
          for (const d of c.set) union.add(d);
          if (union.size !== 3) continue;

          const digits = Array.from(union);
          const eliminations: Elimination[] = [];
          for (const coord of unit) {
            if (coord.row === a.coord.row && coord.col === a.coord.col) continue;
            if (coord.row === b.coord.row && coord.col === b.coord.col) continue;
            if (coord.row === c.coord.row && coord.col === c.coord.col) continue;
            if (state.values[coord.row]![coord.col] !== null) continue;
            const cellSet = state.candidates[coord.row]![coord.col]!;
            for (const digit of digits) {
              if (cellSet.has(digit)) eliminations.push({ cell: coord, digit });
            }
          }
          if (eliminations.length === 0) continue;

          const sortedDigits = digits.slice().sort((x, y) => x - y);
          return {
            technique: 'nakedTriple',
            highlights: [a.coord, b.coord, c.coord],
            placements: [],
            eliminations,
            explanation: `Cells (${a.coord.row + 1}, ${a.coord.col + 1}), (${b.coord.row + 1}, ${b.coord.col + 1}), and (${c.coord.row + 1}, ${c.coord.col + 1}) in ${kind} ${u + 1} must contain ${sortedDigits.join(', ')}, eliminating those digits from the rest of the ${kind}.`,
          };
        }
      }
    }
  }
  return null;
}

export const nakedTriple: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForNakedTriple(state, rowsOf(), 'row') ??
    scanForNakedTriple(state, colsOf(), 'column') ??
    scanForNakedTriple(state, boxesOf(), 'box')
  );
};
