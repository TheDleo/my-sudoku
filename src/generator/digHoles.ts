import type { Digit } from '../types';
import { hasUniqueSolution } from './uniqueness';

const SIZE = 9;

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Returns a grid derived from `full` by removing as many cells as possible
 * while preserving exactly one solution. Cells are tried in a random order
 * determined by `rng`; each removal that breaks uniqueness is rolled back.
 */
export function digHoles(
  full: ReadonlyArray<ReadonlyArray<Digit>>,
  rng: () => number = Math.random,
): (Digit | null)[][] {
  const grid: (Digit | null)[][] = full.map((row) => [...row]);
  const positions: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push({ r, c });
    }
  }
  shuffleInPlace(positions, rng);
  for (const { r, c } of positions) {
    if (grid[r]![c] === null) continue;
    const saved = grid[r]![c]!;
    grid[r]![c] = null;
    if (!hasUniqueSolution(grid)) {
      grid[r]![c] = saved;
    }
  }
  return grid;
}
