import type { CellCoord, Digit } from '../../types';
import { rowsOf, colsOf, boxesOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type UnitKind = 'row' | 'column' | 'box';

function scanForNakedQuad(
  state: SolverState,
  units: ReadonlyArray<ReadonlyArray<CellCoord>>,
  kind: UnitKind,
): Step | null {
  for (let u = 0; u < units.length; u++) {
    const unit = units[u]!;
    const quadCandidates: { coord: CellCoord; set: Set<Digit> }[] = [];
    for (const coord of unit) {
      if (state.values[coord.row]![coord.col] !== null) continue;
      const set = state.candidates[coord.row]![coord.col]!;
      if (set.size >= 2 && set.size <= 4) quadCandidates.push({ coord, set });
    }
    if (quadCandidates.length < 4) continue;

    for (let i = 0; i < quadCandidates.length; i++) {
      for (let j = i + 1; j < quadCandidates.length; j++) {
        for (let k = j + 1; k < quadCandidates.length; k++) {
          for (let l = k + 1; l < quadCandidates.length; l++) {
            const a = quadCandidates[i]!;
            const b = quadCandidates[j]!;
            const c = quadCandidates[k]!;
            const d = quadCandidates[l]!;
            const union = new Set<Digit>();
            for (const x of a.set) union.add(x);
            for (const x of b.set) union.add(x);
            for (const x of c.set) union.add(x);
            for (const x of d.set) union.add(x);
            if (union.size !== 4) continue;

            const digits = Array.from(union);
            const eliminations: Elimination[] = [];
            for (const coord of unit) {
              if (coord.row === a.coord.row && coord.col === a.coord.col) continue;
              if (coord.row === b.coord.row && coord.col === b.coord.col) continue;
              if (coord.row === c.coord.row && coord.col === c.coord.col) continue;
              if (coord.row === d.coord.row && coord.col === d.coord.col) continue;
              if (state.values[coord.row]![coord.col] !== null) continue;
              const cellSet = state.candidates[coord.row]![coord.col]!;
              for (const digit of digits) {
                if (cellSet.has(digit)) eliminations.push({ cell: coord, digit });
              }
            }
            if (eliminations.length === 0) continue;

            const sortedDigits = digits.slice().sort((x, y) => x - y);
            return {
              technique: 'nakedQuad',
              highlights: [a.coord, b.coord, c.coord, d.coord],
              placements: [],
              eliminations,
              explanation: `Cells (${a.coord.row + 1}, ${a.coord.col + 1}), (${b.coord.row + 1}, ${b.coord.col + 1}), (${c.coord.row + 1}, ${c.coord.col + 1}), and (${d.coord.row + 1}, ${d.coord.col + 1}) in ${kind} ${u + 1} must contain ${sortedDigits.join(', ')}, eliminating those digits from the rest of the ${kind}.`,
            };
          }
        }
      }
    }
  }
  return null;
}

export const nakedQuad: TechniqueDetector = (state: SolverState): Step | null => {
  return (
    scanForNakedQuad(state, rowsOf(), 'row') ??
    scanForNakedQuad(state, colsOf(), 'column') ??
    scanForNakedQuad(state, boxesOf(), 'box')
  );
};
