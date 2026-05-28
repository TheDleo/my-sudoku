import type { Cell } from '../types';

const SIZE = 9;

/**
 * Returns a 9x9 grid. If `valueOrFactory` is a function, it's called once per
 * cell. Otherwise the value is used for every cell.
 */
export function empty9x9<T>(valueOrFactory: T | (() => T)): T[][] {
  const isFactory = typeof valueOrFactory === 'function';
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () =>
      isFactory ? (valueOrFactory as () => T)() : (valueOrFactory as T),
    ),
  );
}

/**
 * Deep-copies a 9x9 cells grid, including the pencilMarks Set on each cell.
 */
export function cloneCells(cells: Cell[][]): Cell[][] {
  return cells.map((row) =>
    row.map((c) => ({ value: c.value, pencilMarks: new Set(c.pencilMarks) })),
  );
}
