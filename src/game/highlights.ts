import { computeCandidates } from '../solver/candidates';
import { boxesOf, colsOf, peersOf, rowsOf } from '../solver/units';
import type { CellCoord, Digit } from '../types';
import type { GameState } from './types';

export type CellHighlight =
  | 'selected'
  | 'selected-pencil'
  | 'conflict'
  | 'hint'
  | 'peer'
  | 'possible'
  | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<
    GameState,
    'cells' | 'given' | 'selection' | 'pencilMode' | 'currentHint' | 'hintLevel'
  >,
  possiblePlacements = true,
): HighlightMap {
  const map: HighlightMap = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, (): CellHighlight => null),
  );

  if (possiblePlacements && state.selection.number !== null) {
    const values = state.cells.map((row) => row.map((c) => c.value));
    const candidates = computeCandidates(values);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (state.cells[r]![c]!.value === null && candidates[r]![c]!.has(state.selection.number)) {
          map[r]![c] = 'possible';
        }
      }
    }
  }

  if (state.selection.cell !== null) {
    for (const peer of peersOf(state.selection.cell)) {
      map[peer.row]![peer.col] = 'peer';
    }
  }

  if (state.hintLevel >= 3 && state.currentHint !== null) {
    for (const coord of state.currentHint.highlights) {
      map[coord.row]![coord.col] = 'hint';
    }
  }

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

  if (state.selection.cell !== null) {
    const { row, col } = state.selection.cell;
    map[row]![col] = state.pencilMode ? 'selected-pencil' : 'selected';
  }

  return map;
}
