import { test, expect } from '@playwright/test';

test('worker client returns a valid easy puzzle via a real Worker', async ({ page }) => {
  await page.goto('/');

  // Wait until the bootstrap hook has installed itself.
  await page.waitForFunction(() => typeof window.__sudoku__?.createWorkerClient === 'function');

  const result = await page.evaluate(async () => {
    const client = window.__sudoku__!.createWorkerClient();
    try {
      const puzzle = await client.getPuzzle('easy');
      return {
        id: puzzle.id,
        difficulty: puzzle.difficulty,
        boardRows: puzzle.initialBoard.length,
        boardCols: puzzle.initialBoard[0]?.length ?? 0,
        solutionRows: puzzle.solution.length,
        solutionCols: puzzle.solution[0]?.length ?? 0,
      };
    } finally {
      client.terminate();
    }
  });

  expect(typeof result.id).toBe('string');
  expect(result.difficulty).toBe('easy');
  expect(result.boardRows).toBe(9);
  expect(result.boardCols).toBe(9);
  expect(result.solutionRows).toBe(9);
  expect(result.solutionCols).toBe(9);
});

declare global {
  interface Window {
    __sudoku__?: {
      createWorkerClient: () => {
        getPuzzle: (d: 'easy' | 'medium' | 'hard' | 'expert') => Promise<{
          id: string;
          difficulty: 'easy' | 'medium' | 'hard' | 'expert';
          initialBoard: ReadonlyArray<ReadonlyArray<number | null>>;
          solution: ReadonlyArray<ReadonlyArray<number>>;
        }>;
        terminate: () => void;
      };
    };
  }
}
