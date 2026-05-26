import type { CellCoord, Digit } from '../../types';
import type { SolverState } from '../types';

/**
 * Returns the empty cells of `unit` that still have `digit` as a candidate.
 * Skips cells that already have a value placed.
 */
export function cellsWithDigit(
  state: SolverState,
  unit: ReadonlyArray<CellCoord>,
  digit: Digit,
): CellCoord[] {
  const out: CellCoord[] = [];
  for (const coord of unit) {
    if (state.values[coord.row]![coord.col] !== null) continue;
    if (state.candidates[coord.row]![coord.col]!.has(digit)) out.push(coord);
  }
  return out;
}
