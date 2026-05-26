import { describe, it, expect } from 'vitest';
import type { CellCoord, Digit } from '../types';
import type { TechniqueName, Step, SolverState, TechniqueDetector } from './types';
import { TECHNIQUE_DIFFICULTY } from './types';

describe('solver types', () => {
  it('TECHNIQUE_DIFFICULTY tags every TechniqueName', () => {
    const names: TechniqueName[] = [
      'nakedSingle',
      'hiddenSingle',
      'nakedPair',
      'nakedTriple',
      'hiddenPair',
      'hiddenTriple',
      'pointingPair',
      'nakedQuad',
      'hiddenQuad',
      'xWing',
      'boxLineReduction',
      'swordfish',
      'xyWing',
      'xyzWing',
      'coloring',
      'uniqueRectangle',
    ];
    for (const n of names) {
      expect(TECHNIQUE_DIFFICULTY[n]).toMatch(/^(easy|medium|hard|expert)$/);
    }
  });

  it('easy techniques include nakedSingle and hiddenSingle', () => {
    expect(TECHNIQUE_DIFFICULTY.nakedSingle).toBe('easy');
    expect(TECHNIQUE_DIFFICULTY.hiddenSingle).toBe('easy');
  });

  it('Step has the expected shape', () => {
    const coord: CellCoord = { row: 0, col: 0 };
    const digit: Digit = 5;
    const step: Step = {
      technique: 'nakedSingle',
      highlights: [coord],
      placements: [{ cell: coord, digit }],
      eliminations: [],
      explanation: 'Only 5 fits at (0,0).',
    };
    expect(step.technique).toBe('nakedSingle');
    expect(step.placements).toHaveLength(1);
    expect(step.eliminations).toHaveLength(0);
  });

  it('SolverState has values and candidates', () => {
    const state: SolverState = {
      values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
      candidates: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set<Digit>()),
      ),
    };
    expect(state.values).toHaveLength(9);
    expect(state.candidates).toHaveLength(9);
  });

  it('TechniqueDetector is callable with SolverState and returns Step | null', () => {
    const dummy: TechniqueDetector = (_state) => null;
    const state: SolverState = {
      values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
      candidates: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set<Digit>()),
      ),
    };
    expect(dummy(state)).toBeNull();
  });
});
