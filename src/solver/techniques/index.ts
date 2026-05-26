import type { TechniqueDetector } from '../types';
import { nakedSingle } from './nakedSingle';
import { hiddenSingle } from './hiddenSingle';

export const ALL_TECHNIQUES: TechniqueDetector[] = [nakedSingle, hiddenSingle];
