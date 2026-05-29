import type { Cell, Digit } from '../types';

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

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function getRemainingCounts(cells: Cell[][]): Record<Digit, number> {
  const placed = new Map<Digit, number>();
  for (const row of cells) {
    for (const cell of row) {
      if (cell.value !== null) {
        placed.set(cell.value, (placed.get(cell.value) ?? 0) + 1);
      }
    }
  }
  return Object.fromEntries(DIGITS.map((d) => [d, 9 - (placed.get(d) ?? 0)])) as Record<
    Digit,
    number
  >;
}
