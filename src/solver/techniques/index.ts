import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';
import { nakedPair } from './nakedPair';

export const ALL_TECHNIQUES: TechniqueDetector[] = [nakedSingle, hiddenSingle, nakedPair];
