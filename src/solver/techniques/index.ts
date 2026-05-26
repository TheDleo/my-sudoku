import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';
import { hiddenPair } from './hiddenPair';
import { hiddenTriple } from './hiddenTriple';
import { pointingPair } from './pointingPair';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
  hiddenTriple,
  pointingPair,
];
