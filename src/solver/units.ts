import type { CellCoord } from '../types';

const SIZE = 9;
const BOX = 3;

export function boxIndexOf(coord: CellCoord): number {
  return Math.floor(coord.row / BOX) * BOX + Math.floor(coord.col / BOX);
}

const ROWS: ReadonlyArray<ReadonlyArray<CellCoord>> = Object.freeze(
  Array.from({ length: SIZE }, (_, row) =>
    Object.freeze(Array.from({ length: SIZE }, (_, col) => ({ row, col }))),
  ),
);

const COLS: ReadonlyArray<ReadonlyArray<CellCoord>> = Object.freeze(
  Array.from({ length: SIZE }, (_, col) =>
    Object.freeze(Array.from({ length: SIZE }, (_, row) => ({ row, col }))),
  ),
);

const BOXES: ReadonlyArray<ReadonlyArray<CellCoord>> = Object.freeze(
  Array.from({ length: SIZE }, (_, b) => {
    const rowStart = Math.floor(b / BOX) * BOX;
    const colStart = (b % BOX) * BOX;
    const cells: CellCoord[] = [];
    for (let dr = 0; dr < BOX; dr++) {
      for (let dc = 0; dc < BOX; dc++) {
        cells.push({ row: rowStart + dr, col: colStart + dc });
      }
    }
    return Object.freeze(cells);
  }),
);

export function rowsOf(): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return ROWS;
}

export function colsOf(): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return COLS;
}

export function boxesOf(): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return BOXES;
}

const PEERS: CellCoord[][] = (() => {
  const cache: CellCoord[][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const self = { row: r, col: c };
      const seen = new Set<string>();
      const out: CellCoord[] = [];
      const consider = (coord: CellCoord) => {
        if (coord.row === self.row && coord.col === self.col) return;
        const key = `${coord.row},${coord.col}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(coord);
      };
      for (const cell of ROWS[r]!) consider(cell);
      for (const cell of COLS[c]!) consider(cell);
      for (const cell of BOXES[boxIndexOf(self)]!) consider(cell);
      cache[r * SIZE + c] = out;
    }
  }
  return cache;
})();

export function peersOf(coord: CellCoord): CellCoord[] {
  return PEERS[coord.row * SIZE + coord.col]!;
}

export function unitsContaining(coord: CellCoord): ReadonlyArray<ReadonlyArray<CellCoord>> {
  return [ROWS[coord.row]!, COLS[coord.col]!, BOXES[boxIndexOf(coord)]!];
}
