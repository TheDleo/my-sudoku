import type { CellCoord, Digit } from '../../types';
import type { Elimination, SolverState, Step, TechniqueName } from '../types';

const SIZE = 9;

function colsOfDigitInRow(state: SolverState, row: number, digit: Digit): number[] {
  const out: number[] = [];
  for (let c = 0; c < SIZE; c++) {
    if (state.values[row]![c] !== null) continue;
    if (state.candidates[row]![c]!.has(digit)) out.push(c);
  }
  return out;
}

function rowsOfDigitInCol(state: SolverState, col: number, digit: Digit): number[] {
  const out: number[] = [];
  for (let r = 0; r < SIZE; r++) {
    if (state.values[r]![col] !== null) continue;
    if (state.candidates[r]![col]!.has(digit)) out.push(r);
  }
  return out;
}

/** Enumerate ascending-index combinations of `indices` taken `k` at a time. */
function* combinations(indices: number[], k: number): Generator<number[]> {
  const n = indices.length;
  if (k > n || k <= 0) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map((i) => indices[i]!);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]!++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1]! + 1;
  }
}

function scanRowFish(
  state: SolverState,
  digit: Digit,
  degree: number,
  technique: TechniqueName,
): Step | null {
  const rowCols = new Map<number, number[]>();
  for (let r = 0; r < SIZE; r++) {
    const cols = colsOfDigitInRow(state, r, digit);
    if (cols.length >= 2 && cols.length <= degree) rowCols.set(r, cols);
  }
  const candidateRows = Array.from(rowCols.keys()).sort((a, b) => a - b);
  for (const rows of combinations(candidateRows, degree)) {
    const unionCols = new Set<number>();
    for (const r of rows) for (const c of rowCols.get(r)!) unionCols.add(c);
    if (unionCols.size !== degree) continue;

    const fishRowSet = new Set(rows);
    const cols = Array.from(unionCols).sort((a, b) => a - b);
    const eliminations: Elimination[] = [];
    for (const c of cols) {
      for (let r = 0; r < SIZE; r++) {
        if (fishRowSet.has(r)) continue;
        if (state.values[r]![c] !== null) continue;
        if (state.candidates[r]![c]!.has(digit)) {
          eliminations.push({ cell: { row: r, col: c }, digit });
        }
      }
    }
    if (eliminations.length === 0) continue;

    const highlights: CellCoord[] = [];
    for (const r of rows) for (const c of rowCols.get(r)!) highlights.push({ row: r, col: c });

    return {
      technique,
      highlights,
      placements: [],
      eliminations,
      explanation:
        technique === 'xWing'
          ? `Digit ${digit} forms an X-Wing on rows ${rows.map((x) => x + 1).join(' and ')} in columns ${cols.map((x) => x + 1).join(' and ')}; it can be eliminated from those columns in other rows.`
          : `Digit ${digit} forms a ${technique} on rows ${rows.map((x) => x + 1).join(', ')} in columns ${cols.map((x) => x + 1).join(', ')}; it can be eliminated from those columns in other rows.`,
    };
  }
  return null;
}

function scanColFish(
  state: SolverState,
  digit: Digit,
  degree: number,
  technique: TechniqueName,
): Step | null {
  const colRows = new Map<number, number[]>();
  for (let c = 0; c < SIZE; c++) {
    const rows = rowsOfDigitInCol(state, c, digit);
    if (rows.length >= 2 && rows.length <= degree) colRows.set(c, rows);
  }
  const candidateCols = Array.from(colRows.keys()).sort((a, b) => a - b);
  for (const cols of combinations(candidateCols, degree)) {
    const unionRows = new Set<number>();
    for (const c of cols) for (const r of colRows.get(c)!) unionRows.add(r);
    if (unionRows.size !== degree) continue;

    const fishColSet = new Set(cols);
    const rows = Array.from(unionRows).sort((a, b) => a - b);
    const eliminations: Elimination[] = [];
    for (const r of rows) {
      for (let c = 0; c < SIZE; c++) {
        if (fishColSet.has(c)) continue;
        if (state.values[r]![c] !== null) continue;
        if (state.candidates[r]![c]!.has(digit)) {
          eliminations.push({ cell: { row: r, col: c }, digit });
        }
      }
    }
    if (eliminations.length === 0) continue;

    const highlights: CellCoord[] = [];
    for (const c of cols) for (const r of colRows.get(c)!) highlights.push({ row: r, col: c });

    return {
      technique,
      highlights,
      placements: [],
      eliminations,
      explanation:
        technique === 'xWing'
          ? `Digit ${digit} forms an X-Wing on columns ${cols.map((x) => x + 1).join(' and ')} in rows ${rows.map((x) => x + 1).join(' and ')}; it can be eliminated from those rows in other columns.`
          : `Digit ${digit} forms a ${technique} on columns ${cols.map((x) => x + 1).join(', ')} in rows ${rows.map((x) => x + 1).join(', ')}; it can be eliminated from those rows in other columns.`,
    };
  }
  return null;
}

export function scanFish(
  state: SolverState,
  digit: Digit,
  degree: number,
  technique: TechniqueName,
): Step | null {
  return (
    scanRowFish(state, digit, degree, technique) ?? scanColFish(state, digit, degree, technique)
  );
}
