import { describe, it, expect } from 'vitest';
import { generate } from './generate';
import { classify } from './difficulty';
import { hasUniqueSolution } from './uniqueness';
import { mulberry32 } from './rng';

describe('generate', () => {
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
  it(
    'generate("expert") completes within 30 seconds',
    () => {
      const start = Date.now();
      const puzzle = generate('expert');
      const elapsed = Date.now() - start;
      expect(puzzle.difficulty).toBe('expert');
      expect(elapsed).toBeLessThan(30_000);
    },
    { timeout: 45_000 },
  );

  it(
    'generate("easy") completes within 5 seconds',
    () => {
      const start = Date.now();
      const puzzle = generate('easy');
      const elapsed = Date.now() - start;
      expect(puzzle.difficulty).toBe('easy');
      expect(elapsed).toBeLessThan(5_000);
    },
    { timeout: 10_000 },
  );
});
