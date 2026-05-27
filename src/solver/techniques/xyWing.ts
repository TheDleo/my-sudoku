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

export const xyWing: TechniqueDetector = (state: SolverState): Step | null => {
  const bivals = biValueCells(state);
  const byKey = new Map<string, BiValue>();
  for (const b of bivals) byKey.set(`${b.coord.row},${b.coord.col}`, b);

  for (const pivot of bivals) {
    const [X, Y] = pivot.digits;
    const peers = peersOf(pivot.coord);
    const peerBivals: BiValue[] = [];
    for (const p of peers) {
      const bv = byKey.get(`${p.row},${p.col}`);
      if (bv) peerBivals.push(bv);
    }
    for (const wingX of peerBivals) {
      const wxDigits = wingX.digits;
      let z: Digit | null = null;
      if (wxDigits[0] === X && wxDigits[1] !== Y) z = wxDigits[1];
      else if (wxDigits[1] === X && wxDigits[0] !== Y) z = wxDigits[0];
      if (z === null) continue;
      const Z = z;
      for (const wingY of peerBivals) {
        if (sameCell(wingY.coord, wingX.coord)) continue;
        const wyDigits = wingY.digits;
        const hasY = wyDigits[0] === Y || wyDigits[1] === Y;
        const hasZ = wyDigits[0] === Z || wyDigits[1] === Z;
        const hasX = wyDigits[0] === X || wyDigits[1] === X;
        if (!hasY || !hasZ || hasX) continue;
        const elimCells: CellCoord[] = [];
        const wxPeers = peersOf(wingX.coord);
        const wxPeerKeys = new Set(wxPeers.map((p) => `${p.row},${p.col}`));
        const wyPeers = peersOf(wingY.coord);
        for (const p of wyPeers) {
          if (!wxPeerKeys.has(`${p.row},${p.col}`)) continue;
          if (sameCell(p, pivot.coord)) continue;
          if (sameCell(p, wingX.coord) || sameCell(p, wingY.coord)) continue;
          if (state.values[p.row]![p.col] !== null) continue;
          if (state.candidates[p.row]![p.col]!.has(Z)) elimCells.push(p);
        }
        if (elimCells.length === 0) continue;
        const eliminations: Elimination[] = elimCells.map((cell) => ({ cell, digit: Z }));
        return {
          technique: 'xyWing',
          highlights: [pivot.coord, wingX.coord, wingY.coord],
          placements: [],
          eliminations,
          explanation: `Y-Wing: pivot (${pivot.coord.row + 1}, ${pivot.coord.col + 1}) with {${X},${Y}}, wings (${wingX.coord.row + 1}, ${wingX.coord.col + 1}) with {${X},${Z}} and (${wingY.coord.row + 1}, ${wingY.coord.col + 1}) with {${Y},${Z}} — digit ${Z} can be eliminated from cells seeing both wings.`,
        };
      }
    }
  }
  return null;
};
