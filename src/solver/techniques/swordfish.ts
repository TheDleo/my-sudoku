import type { Digit } from '../../types';
import type { SolverState, Step, TechniqueDetector } from '../types';
import { scanFish } from './fish';

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const swordfish: TechniqueDetector = (state: SolverState): Step | null => {
  for (const digit of DIGITS) {
    const step = scanFish(state, digit, 3, 'swordfish');
    if (step) return step;
  }
  return null;
};
