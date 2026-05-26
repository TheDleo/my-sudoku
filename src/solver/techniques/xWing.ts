import type { Digit } from '../../types';
import { rowsOf, colsOf } from '../units';
import type { Elimination, SolverState, Step, TechniqueDetector } from '../types';
import { cellsWithDigit } from './shared';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function scanRowPattern(state: SolverState, digit: Digit): Step | null {
  const rows = rowsOf();
  const rowCols: (number[] | null)[] = [];
  for (let r = 0; r < 9; r++) {
    const cells = cellsWithDigit(state, rows[r]!, digit);
    if (cells.length === 2) {
      rowCols.push(cells.map((c) => c.col).sort((x, y) => x - y));
    } else {
      rowCols.push(null);
    }
  }
  for (let r1 = 0; r1 < 9; r1++) {
    const cols1 = rowCols[r1];
    if (!cols1) continue;
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      const cols2 = rowCols[r2];
      if (!cols2) continue;
      if (cols1[0] !== cols2[0] || cols1[1] !== cols2[1]) continue;
      const c1 = cols1[0]!;
      const c2 = cols1[1]!;
      const eliminations: Elimination[] = [];
      for (let r = 0; r < 9; r++) {
        if (r === r1 || r === r2) continue;
        for (const c of [c1, c2]) {
          if (state.values[r]![c] !== null) continue;
          if (state.candidates[r]![c]!.has(digit)) {
            eliminations.push({ cell: { row: r, col: c }, digit });
          }
        }
      }
      if (eliminations.length === 0) continue;
      return {
        technique: 'xWing',
        highlights: [
          { row: r1, col: c1 },
          { row: r1, col: c2 },
          { row: r2, col: c1 },
          { row: r2, col: c2 },
        ],
        placements: [],
        eliminations,
        explanation: `Digit ${digit} forms an X-Wing on rows ${r1 + 1} and ${r2 + 1} in columns ${c1 + 1} and ${c2 + 1}; it can be eliminated from those columns in other rows.`,
      };
    }
  }
  return null;
}

function scanColumnPattern(state: SolverState, digit: Digit): Step | null {
  const cols = colsOf();
  const colRows: (number[] | null)[] = [];
  for (let c = 0; c < 9; c++) {
    const cells = cellsWithDigit(state, cols[c]!, digit);
    if (cells.length === 2) {
      colRows.push(cells.map((cc) => cc.row).sort((x, y) => x - y));
    } else {
      colRows.push(null);
    }
  }
  for (let c1 = 0; c1 < 9; c1++) {
    const rows1 = colRows[c1];
    if (!rows1) continue;
    for (let c2 = c1 + 1; c2 < 9; c2++) {
      const rows2 = colRows[c2];
      if (!rows2) continue;
      if (rows1[0] !== rows2[0] || rows1[1] !== rows2[1]) continue;
      const r1 = rows1[0]!;
      const r2 = rows1[1]!;
      const eliminations: Elimination[] = [];
      for (let c = 0; c < 9; c++) {
        if (c === c1 || c === c2) continue;
        for (const r of [r1, r2]) {
          if (state.values[r]![c] !== null) continue;
          if (state.candidates[r]![c]!.has(digit)) {
            eliminations.push({ cell: { row: r, col: c }, digit });
          }
        }
      }
      if (eliminations.length === 0) continue;
      return {
        technique: 'xWing',
        highlights: [
          { row: r1, col: c1 },
          { row: r1, col: c2 },
          { row: r2, col: c1 },
          { row: r2, col: c2 },
        ],
        placements: [],
        eliminations,
        explanation: `Digit ${digit} forms an X-Wing on columns ${c1 + 1} and ${c2 + 1} in rows ${r1 + 1} and ${r2 + 1}; it can be eliminated from those rows in other columns.`,
      };
    }
  }
  return null;
}

export const xWing: TechniqueDetector = (state: SolverState): Step | null => {
  for (const digit of DIGITS) {
    const rowStep = scanRowPattern(state, digit);
    if (rowStep) return rowStep;
    const colStep = scanColumnPattern(state, digit);
    if (colStep) return colStep;
  }
  return null;
};
