import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';
import { nakedTriple } from './nakedTriple';
import { hiddenPair } from './hiddenPair';
import { hiddenTriple } from './hiddenTriple';
import { pointingPair } from './pointingPair';
import { nakedQuad } from './nakedQuad';
import { hiddenQuad } from './hiddenQuad';
import { boxLineReduction } from './boxLineReduction';
import { xWing } from './xWing';
import { swordfish } from './swordfish';
import { xyWing } from './xyWing';

export const ALL_TECHNIQUES: TechniqueDetector[] = [
  nakedSingle,
  hiddenSingle,
  nakedPair,
  nakedTriple,
  hiddenPair,
  hiddenTriple,
  pointingPair,
  nakedQuad,
  hiddenQuad,
  boxLineReduction,
  xWing,
  swordfish,
  xyWing,
];
