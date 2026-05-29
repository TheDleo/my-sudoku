import { peersOf } from '../solver/units';
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

  // Selected (highest priority so far)
  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = 'selected';
  }

  return map;
}
