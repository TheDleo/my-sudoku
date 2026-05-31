import { describe, it, expect } from 'vitest';
import { EXPLAINERS } from './index';
import { TECHNIQUE_DIFFICULTY } from '../../solver/types';

const ALL_TECHNIQUES = Object.keys(TECHNIQUE_DIFFICULTY) as Array<
  keyof typeof TECHNIQUE_DIFFICULTY
>;

describe('EXPLAINERS', () => {
  it('has an entry for every TechniqueName', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(EXPLAINERS[t], `missing entry for ${t}`).toBeDefined();
    }
  });

  it('every entry has a non-empty title', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(EXPLAINERS[t]!.title.length, `empty title for ${t}`).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty summary', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(EXPLAINERS[t]!.summary.length, `empty summary for ${t}`).toBeGreaterThan(0);
    }
  });

  it('every entry has a Diagram function', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(typeof EXPLAINERS[t]!.Diagram, `missing Diagram for ${t}`).toBe('function');
    }
  });
});
