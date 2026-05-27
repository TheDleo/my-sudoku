import type { CellCoord, Digit } from '../../types';
import { peersOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';

type BiValue = { coord: CellCoord; digits: [Digit, Digit] };

function biValueCells(state: SolverState): BiValue[] {
  const out: BiValue[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const cand = state.candidates[r]![c]!;
      if (cand.size !== 2) continue;
      const sorted = Array.from(cand).sort((a, b) => a - b) as [Digit, Digit];
      out.push({ coord: { row: r, col: c }, digits: sorted });
    }
  }
  return out;
}

function sameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

export const xyzWing: TechniqueDetector = (state: SolverState): Step | null => {
  const bivals = biValueCells(state);
  const byKey = new Map<string, BiValue>();
  for (const b of bivals) byKey.set(`${b.coord.row},${b.coord.col}`, b);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.values[r]![c] !== null) continue;
      const pivotCand = state.candidates[r]![c]!;
      if (pivotCand.size !== 3) continue;
      const pivotCoord: CellCoord = { row: r, col: c };
      const pivotDigits = Array.from(pivotCand).sort((a, b) => a - b) as [Digit, Digit, Digit];

      const peers = peersOf(pivotCoord);
      const peerBivals: BiValue[] = [];
      for (const p of peers) {
        const bv = byKey.get(`${p.row},${p.col}`);
        if (bv) peerBivals.push(bv);
      }

      for (const Z of pivotDigits) {
        const others = pivotDigits.filter((d) => d !== Z) as [Digit, Digit];
        const [X, Y] = others;
        const wingXCandidates = peerBivals.filter(
          (b) =>
            (b.digits[0] === X && b.digits[1] === Z) || (b.digits[0] === Z && b.digits[1] === X),
        );
        const wingYCandidates = peerBivals.filter(
          (b) =>
            (b.digits[0] === Y && b.digits[1] === Z) || (b.digits[0] === Z && b.digits[1] === Y),
        );
        for (const wingX of wingXCandidates) {
          for (const wingY of wingYCandidates) {
            if (sameCell(wingX.coord, wingY.coord)) continue;
            const pivotPeerKeys = new Set(peers.map((p) => `${p.row},${p.col}`));
            const wxPeerKeys = new Set(peersOf(wingX.coord).map((p) => `${p.row},${p.col}`));
            const wyPeers = peersOf(wingY.coord);
            const elimCells: CellCoord[] = [];
            for (const p of wyPeers) {
              const key = `${p.row},${p.col}`;
              if (!pivotPeerKeys.has(key)) continue;
              if (!wxPeerKeys.has(key)) continue;
              if (sameCell(p, pivotCoord)) continue;
              if (sameCell(p, wingX.coord) || sameCell(p, wingY.coord)) continue;
              if (state.values[p.row]![p.col] !== null) continue;
              if (state.candidates[p.row]![p.col]!.has(Z)) elimCells.push(p);
            }
            if (elimCells.length === 0) continue;
            const eliminations: Elimination[] = elimCells.map((cell) => ({ cell, digit: Z }));
            return {
              technique: 'xyzWing',
              highlights: [pivotCoord, wingX.coord, wingY.coord],
              placements: [],
              eliminations,
              explanation: `XYZ-Wing: pivot (${pivotCoord.row + 1}, ${pivotCoord.col + 1}) with {${X},${Y},${Z}}, wings (${wingX.coord.row + 1}, ${wingX.coord.col + 1}) with {${X},${Z}} and (${wingY.coord.row + 1}, ${wingY.coord.col + 1}) with {${Y},${Z}} — digit ${Z} can be eliminated from cells seeing pivot and both wings.`,
            };
          }
        }
      }
    }
  }
  return null;
};
