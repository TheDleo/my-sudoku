import type { CellCoord, Digit } from '../../types';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

const SIZE = 9;

function spansTwoBoxes(r1: number, r2: number, c1: number, c2: number): boolean {
  const sameBand = Math.floor(r1 / 3) === Math.floor(r2 / 3);
  const sameStack = Math.floor(c1 / 3) === Math.floor(c2 / 3);
  return sameBand !== sameStack;
}

function setEquals(a: Set<Digit>, b: ReadonlyArray<Digit>): boolean {
  if (a.size !== b.length) return false;
  for (const d of b) if (!a.has(d)) return false;
  return true;
}

function setHasBoth(s: Set<Digit>, a: Digit, b: Digit): boolean {
  return s.has(a) && s.has(b);
}

export const uniqueRectangle: TechniqueDetector = (state: SolverState): Step | null => {
  for (let r1 = 0; r1 < SIZE; r1++) {
    for (let r2 = r1 + 1; r2 < SIZE; r2++) {
      for (let c1 = 0; c1 < SIZE; c1++) {
        for (let c2 = c1 + 1; c2 < SIZE; c2++) {
          if (!spansTwoBoxes(r1, r2, c1, c2)) continue;
          const corners: CellCoord[] = [
            { row: r1, col: c1 },
            { row: r1, col: c2 },
            { row: r2, col: c1 },
            { row: r2, col: c2 },
          ];
          let anyValued = false;
          for (const k of corners) {
            if (state.values[k.row]![k.col] !== null) {
              anyValued = true;
              break;
            }
          }
          if (anyValued) continue;
          const cornerCands = corners.map((k) => state.candidates[k.row]![k.col]!);
          for (let roofIdx = 0; roofIdx < 4; roofIdx++) {
            const roofCand = cornerCands[roofIdx]!;
            if (roofCand.size < 3) continue;
            const otherIdx = [0, 1, 2, 3].filter((i) => i !== roofIdx);
            const floor0 = cornerCands[otherIdx[0]!]!;
            const floor1 = cornerCands[otherIdx[1]!]!;
            const floor2 = cornerCands[otherIdx[2]!]!;
            if (floor0.size !== 2) continue;
            const floorDigits = Array.from(floor0).sort((a, b) => a - b) as [Digit, Digit];
            const [a, b] = floorDigits;
            if (!setEquals(floor1, floorDigits)) continue;
            if (!setEquals(floor2, floorDigits)) continue;
            if (!setHasBoth(roofCand, a, b)) continue;
            const roofCoord = corners[roofIdx]!;
            const eliminations: Elimination[] = [
              { cell: roofCoord, digit: a },
              { cell: roofCoord, digit: b },
            ];
            return {
              technique: 'uniqueRectangle',
              highlights: corners,
              placements: [],
              eliminations,
              explanation: `Unique Rectangle (Type 1): cells (${corners[0]!.row + 1}, ${corners[0]!.col + 1}), (${corners[1]!.row + 1}, ${corners[1]!.col + 1}), (${corners[2]!.row + 1}, ${corners[2]!.col + 1}), (${corners[3]!.row + 1}, ${corners[3]!.col + 1}) form a rectangle in 2 boxes; three corners have {${a},${b}}, so the fourth (roof at (${roofCoord.row + 1}, ${roofCoord.col + 1})) cannot be ${a} or ${b}.`,
            };
          }
        }
      }
    }
  }
  return null;
};
