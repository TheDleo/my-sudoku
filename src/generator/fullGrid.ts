import type { Digit } from '../types';

const SIZE = 9;
const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

function isValidPlacement(grid: (Digit | null)[][], r: number, c: number, digit: Digit): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (grid[r]![i] === digit) return false;
    if (grid[i]![c] === digit) return false;
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (grid[boxR + dr]![boxC + dc] === digit) return false;
    }
  }
  return true;
}

function fill(grid: (Digit | null)[][], r: number, c: number, rng: () => number): boolean {
  if (r === SIZE) return true;
  const nextR = c === SIZE - 1 ? r + 1 : r;
  const nextC = c === SIZE - 1 ? 0 : c + 1;
  const candidates = DIGITS.slice();
  shuffleInPlace(candidates, rng);
  for (const digit of candidates) {
    if (!isValidPlacement(grid, r, c, digit)) continue;
    grid[r]![c] = digit;
    if (fill(grid, nextR, nextC, rng)) return true;
  }
  grid[r]![c] = null;
  return false;
}

/**
 * Returns a random valid completed 9x9 Sudoku grid.
 * Accepts an optional seedable RNG for deterministic generation.
 */
export function fullGrid(rng: () => number = Math.random): Digit[][] {
  const grid: (Digit | null)[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, (): Digit | null => null),
  );
  if (!fill(grid, 0, 0, rng)) {
    throw new Error('fullGrid: unexpected backtracking failure on empty grid');
  }
  return grid as Digit[][];
}
