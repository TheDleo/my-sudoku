import type { Difficulty, Digit, Puzzle } from '../types';
import { classify } from './difficulty';
import { digHoles } from './digHoles';
import { fullGrid } from './fullGrid';

/**
 * Budgets are sized from the measured tier distribution of maximally-dug
 * grids (1500 samples): easy 41.9%, medium 18.5%, hard 1.2%, expert 11.5%,
 * unsolvable-by-our-solver 26.9%.
 *
 * 'hard' is by far the narrowest band -- it needs a hard technique but must
 * not need an expert one, and digging maximally usually overshoots straight
 * past it. At 1.2% a 100-attempt budget fails ~30% of the time, which is the
 * "gave up after 100 attempts" error users hit on the Hard tier. 1000
 * attempts brings that under 1 in 200,000; the median is still ~83 attempts
 * (~3s), and the budget is only reached in the rarest cases.
 */
const DEFAULT_MAX_ATTEMPTS: Record<Difficulty, number> = {
  easy: 500,
  medium: 200,
  hard: 1000,
  expert: 100,
};

export type GenerateOptions = {
  maxAttempts?: number;
  rng?: () => number;
};

function puzzleId(initialBoard: ReadonlyArray<ReadonlyArray<Digit | null>>): string {
  // FNV-1a-style hash so identical boards yield the same id.
  let h = 2166136261 >>> 0;
  for (const row of initialBoard) {
    for (const cell of row) {
      h = Math.imul(h ^ (cell ?? 0), 16777619) >>> 0;
    }
  }
  return h.toString(36);
}

/**
 * Generates a puzzle of the requested difficulty by repeatedly making a full
 * grid, digging holes randomly, and classifying the result. Throws if no
 * puzzle of the target tier is found within `maxAttempts` attempts.
 */
export function generate(target: Difficulty, opts: GenerateOptions = {}): Puzzle {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS[target];
  const rng = opts.rng ?? Math.random;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = fullGrid(rng);
    const initialBoard = digHoles(solution, rng);
    const tier = classify(initialBoard);
    if (tier === target) {
      return {
        id: puzzleId(initialBoard),
        difficulty: target,
        initialBoard,
        solution,
      };
    }
  }
  throw new Error(`generate(${target}) gave up after ${maxAttempts} attempts`);
}
