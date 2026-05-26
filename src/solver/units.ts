import type { CellCoord } from '../types';

const SIZE = 9;
const BOX = 3;

export function boxIndexOf(coord: CellCoord): number {
  return Math.floor(coord.row / BOX) * BOX + Math.floor(coord.col / BOX);
}

const ROWS: CellCoord[][] = Array.from({ length: SIZE }, (_, row) =>
  Array.from({ length: SIZE }, (_, col) => ({ row, col })),
);

const COLS: CellCoord[][] = Array.from({ length: SIZE }, (_, col) =>
  Array.from({ length: SIZE }, (_, row) => ({ row, col })),
);

const BOXES: CellCoord[][] = Array.from({ length: SIZE }, (_, b) => {
  const rowStart = Math.floor(b / BOX) * BOX;
  const colStart = (b % BOX) * BOX;
  const cells: CellCoord[] = [];
  for (let dr = 0; dr < BOX; dr++) {
    for (let dc = 0; dc < BOX; dc++) {
      cells.push({ row: rowStart + dr, col: colStart + dc });
    }
  }
  return cells;
});

export function rowsOf(): CellCoord[][] {
  return ROWS;
}

export function colsOf(): CellCoord[][] {
  return COLS;
}

export function boxesOf(): CellCoord[][] {
  return BOXES;
}
