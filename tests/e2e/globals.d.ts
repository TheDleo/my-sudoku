import type { createWorkerClient } from '../../src/generator/workerClient';
import type { useGameStore } from '../../src/game/store';

declare global {
  interface Window {
    __sudoku__?: {
      createWorkerClient: typeof createWorkerClient;
      store: typeof useGameStore;
    };
  }
}
