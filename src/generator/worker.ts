import type { Difficulty } from '../types';
import { generate } from './generate';

type ClientMessage = { type: 'generate'; difficulty: Difficulty };

self.onmessage = (event: MessageEvent<ClientMessage>) => {
  const { difficulty } = event.data;
  try {
    const puzzle = generate(difficulty);
    self.postMessage({ type: 'puzzle', difficulty, puzzle });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', difficulty, message });
  }
};
