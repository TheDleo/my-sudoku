import type { Difficulty, Digit, Puzzle } from '../types';
import { classify } from './difficulty';
import { digHoles } from './digHoles';
import { fullGrid } from './fullGrid';

const DEFAULT_MAX_ATTEMPTS: Record<Difficulty, number> = {
  easy: 500,
  medium: 200,
  hard: 100,
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
