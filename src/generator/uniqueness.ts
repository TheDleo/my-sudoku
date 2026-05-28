import type { Digit } from '../types';

const SIZE = 9;
const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function legalDigits(grid: (Digit | null)[][], r: number, c: number): Digit[] {
  const used = new Set<Digit>();
  for (let i = 0; i < SIZE; i++) {
    const v1 = grid[r]?.[i];
    const v2 = grid[i]?.[c];
    if (v1 !== null && v1 !== undefined) used.add(v1);
    if (v2 !== null && v2 !== undefined) used.add(v2);
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const v = grid[boxR + dr]?.[boxC + dc];
      if (v !== null && v !== undefined) used.add(v);
    }
  }
  const out: Digit[] = [];
  for (const d of DIGITS) if (!used.has(d)) out.push(d);
  return out;
}

function pickMRV(grid: (Digit | null)[][]): { r: number; c: number; candidates: Digit[] } | null {
  let best: { r: number; c: number; candidates: Digit[] } | null = null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r]![c] !== null) continue;
      const cand = legalDigits(grid, r, c);
      if (cand.length === 0) return { r, c, candidates: [] }; // dead cell, prune fast
      if (best === null || cand.length < best.candidates.length) {
        best = { r, c, candidates: cand };
        if (cand.length === 1) return best;
      }
    }
  }
  return best;
}

function countRec(grid: (Digit | null)[][], cap: number, found: number): number {
  const pick = pickMRV(grid);
  if (pick === null) return found + 1;
  if (pick.candidates.length === 0) return found;
  for (const d of pick.candidates) {
    grid[pick.r]![pick.c] = d;
    found = countRec(grid, cap, found);
    if (found >= cap) {
      grid[pick.r]![pick.c] = null;
      return found;
    }
  }
  grid[pick.r]![pick.c] = null;
  return found;
}

/**
 * Counts solutions of `grid` up to `cap` (default 2). Returns as soon as `cap`
 * solutions are found — never explores further.
 */
export function countSolutions(grid: ReadonlyArray<ReadonlyArray<Digit | null>>, cap = 2): number {
  const copy: (Digit | null)[][] = grid.map((row) => [...row]);
  return countRec(copy, cap, 0);
}

/**
 * Returns true iff the grid has exactly one solution.
 */
export function hasUniqueSolution(grid: ReadonlyArray<ReadonlyArray<Digit | null>>): boolean {
  return countSolutions(grid, 2) === 1;
}
