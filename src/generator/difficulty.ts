import type { Difficulty, Digit } from '../types';
import { solve } from '../solver/solve';
import { TECHNIQUE_DIFFICULTY } from '../solver/types';

const TIER_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function tierIndex(d: Difficulty): number {
  return TIER_ORDER.indexOf(d);
}

/**
 * Classifies `puzzle` by the hardest technique the Phase 6 human solver uses
 * to crack it. Returns null when the solver cannot fully solve the puzzle
 * (it requires techniques beyond Phase 6's set). An already-complete grid
 * classifies as 'easy'.
 */
export function classify(puzzle: ReadonlyArray<ReadonlyArray<Digit | null>>): Difficulty | null {
  const grid = puzzle.map((row) => [...row]);
  const result = solve(grid);
  if (!result.solved) return null;
  let highest: Difficulty = 'easy';
  for (const step of result.steps) {
    const tier = TECHNIQUE_DIFFICULTY[step.technique];
    if (tierIndex(tier) > tierIndex(highest)) highest = tier;
  }
  return highest;
}
