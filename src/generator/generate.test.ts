import { describe, it, expect } from 'vitest';
import { generate } from './generate';
import { classify } from './difficulty';
import { hasUniqueSolution } from './uniqueness';
import { mulberry32 } from './rng';

// Seeded generation is deterministic but CPU-bound: the 'hard' cases take ~3s on
// a dev machine and ~6s on a CI runner, which overruns Vitest's 5s default. Vitest
// 2 never enforced that default on synchronous tests, so this only became visible
// on the upgrade to Vitest 4.
describe('generate', { timeout: 30_000 }, () => {
  it('returns a puzzle with the requested difficulty (easy)', () => {
    const puzzle = generate('easy', { rng: mulberry32(11) });
    expect(puzzle.difficulty).toBe('easy');
    expect(classify(puzzle.initialBoard)).toBe('easy');
  });

  it('returns a puzzle with the requested difficulty (medium)', () => {
    const puzzle = generate('medium', { rng: mulberry32(22) });
    expect(puzzle.difficulty).toBe('medium');
    expect(classify(puzzle.initialBoard)).toBe('medium');
  });

  it('returns a puzzle with the requested difficulty (hard)', () => {
    const puzzle = generate('hard', { rng: mulberry32(33) });
    expect(puzzle.difficulty).toBe('hard');
    expect(classify(puzzle.initialBoard)).toBe('hard');
  });

  // Only ~1.2% of maximally-dug grids classify as 'hard' (measured over 1500
  // samples), so the default attempt budget has to be large. Seed 5 needs more
  // than 100 attempts and used to throw "gave up after 100 attempts" -- the
  // same failure users hit on the Hard tier roughly 30% of the time.
  it('finds a hard puzzle on a seed that needs more than 100 attempts', () => {
    // Seed 5 needs exactly 143 attempts. Pinning the old budget's failure here
    // keeps the fixture honest: a future change to fullGrid/digHoles/
    // shuffleInPlace could make seed 5 cheap to satisfy, and the assertion
    // below would keep passing while no longer covering the bug.
    //
    // Note the limit of what this proves -- the budget is >= 143, not that it
    // is sized for the measured 1.2% hit rate. That is a statistical property
    // and deliberately not asserted here; see the comment in generate.ts.
    expect(() => generate('hard', { rng: mulberry32(5), maxAttempts: 100 })).toThrow(
      /gave up after 100 attempts/,
    );

    const puzzle = generate('hard', { rng: mulberry32(5) });
    expect(puzzle.difficulty).toBe('hard');
    expect(classify(puzzle.initialBoard)).toBe('hard');
  });

  it('returns a puzzle with the requested difficulty (expert)', () => {
    const puzzle = generate('expert', { rng: mulberry32(44) });
    expect(puzzle.difficulty).toBe('expert');
    expect(classify(puzzle.initialBoard)).toBe('expert');
  });

  it('the returned initialBoard has a unique solution', () => {
    const puzzle = generate('medium', { rng: mulberry32(22) });
    expect(hasUniqueSolution(puzzle.initialBoard)).toBe(true);
  });

  it('the returned solution is consistent with the initialBoard (givens match)', () => {
    const puzzle = generate('hard', { rng: mulberry32(33) });
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const given = puzzle.initialBoard[r]![c];
        if (given !== null) expect(puzzle.solution[r]![c]).toBe(given);
      }
    }
  });

  it('the same seed produces the same puzzle (deterministic)', () => {
    const a = generate('medium', { rng: mulberry32(99) });
    const b = generate('medium', { rng: mulberry32(99) });
    expect(a).toEqual(b);
  });

  it('throws when it cannot find a matching puzzle within maxAttempts', () => {
    expect(() => generate('expert', { rng: mulberry32(1), maxAttempts: 0 })).toThrow();
  });
});

describe('generate — time budget', () => {
  it('generate("expert") completes within 30 seconds', () => {
    const start = Date.now();
    const puzzle = generate('expert');
    const elapsed = Date.now() - start;
    expect(puzzle.difficulty).toBe('expert');
    expect(elapsed).toBeLessThan(30_000);
  }, 45_000);

  it('generate("easy") completes within 5 seconds', () => {
    const start = Date.now();
    const puzzle = generate('easy');
    const elapsed = Date.now() - start;
    expect(puzzle.difficulty).toBe('easy');
    expect(elapsed).toBeLessThan(5_000);
  }, 10_000);
});
