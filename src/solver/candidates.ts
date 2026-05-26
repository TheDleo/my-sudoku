import type { CellCoord, Digit } from '../types';
import { peersOf, unitsContaining } from './units';

const ALL_DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function computeCandidates(values: (Digit | null)[][]): Set<Digit>[][] {
  const result: Set<Digit>[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<Digit>()),
  );

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r]![c] !== null) continue; // filled cells have empty candidate set
      const cellCandidates = new Set<Digit>(ALL_DIGITS);
      for (const unit of unitsContaining({ row: r, col: c })) {
        for (const peer of unit) {
          const row = values[peer.row];
          if (row === undefined) continue;
          const v = row[peer.col];
          if (v !== undefined && v !== null) cellCandidates.delete(v);
        }
      }
      result[r]![c] = cellCandidates;
    }
  }

  return result;
}

export function removeCandidateFromPeers(
  candidates: Set<Digit>[][],
  coord: CellCoord,
  digit: Digit,
): Set<Digit>[][] {
  const peers = peersOf(coord);
  const peerKeys = new Set(peers.map((p) => `${p.row},${p.col}`));

  return candidates.map((row, r) =>
    row.map((set, c) => {
      if (!peerKeys.has(`${r},${c}`)) return set;
      if (!set.has(digit)) return set;
      const next = new Set(set);
      next.delete(digit);
      return next;
    }),
  );
}
