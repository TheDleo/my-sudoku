import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
import type { GameState } from './types';

export type CellHighlight = 'selected' | 'conflict' | 'peer' | 'possible' | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection'>,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  // Peer (lower priority — overwritten by conflict and selected below)
  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  // Conflict (overwrites peer)
  for (const unit of [...rowsOf(), ...colsOf(), ...boxesOf()]) {
    const seen = new Map<Digit, CellCoord[]>();
    for (const coord of unit) {
      const v = state.cells[coord.row]![coord.col]!.value;
      if (v !== null) {
        const existing = seen.get(v) ?? [];
        existing.push(coord);
        seen.set(v, existing);
      }
    }
    for (const coords of seen.values()) {
      if (coords.length > 1) {
        for (const coord of coords) {
          map[coord.row]![coord.col] = 'conflict';
        }
      }
    }
  }

  // Selected (highest priority so far)
  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = 'selected';
  }

  return map;
}
