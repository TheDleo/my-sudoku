import { test, expect } from '@playwright/test';

// Classic Wikipedia Sudoku — 30 givens, 51 empty cells.
const KNOWN_PUZZLE = {
  id: 'smoke-test-fixture',
  difficulty: 'easy' as const,
  initialBoard: [
    [5, 3, null, null, 7, null, null, null, null],
    [6, null, null, 1, 9, 5, null, null, null],
    [null, 9, 8, null, null, null, null, 6, null],
    [8, null, null, null, 6, null, null, null, 3],
    [4, null, null, 8, null, 3, null, null, 1],
    [7, null, null, null, 2, null, null, null, 6],
    [null, 6, null, null, null, null, 2, 8, null],
    [null, null, null, 4, 1, 9, null, null, 5],
    [null, null, null, null, 8, null, null, 7, 9],
  ],
  solution: [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ],
};

// 50 cells to fill via store (all empty cells except row 8 col 0, which is placed via UI).
const BULK_FILL_CELLS: [number, number, number][] = [
  // row 0
  [0, 2, 4],
  [0, 3, 6],
  [0, 5, 8],
  [0, 6, 9],
  [0, 7, 1],
  [0, 8, 2],
  // row 1
  [1, 1, 7],
  [1, 2, 2],
  [1, 6, 3],
  [1, 7, 4],
  [1, 8, 8],
  // row 2
  [2, 0, 1],
  [2, 3, 3],
  [2, 4, 4],
  [2, 5, 2],
  [2, 6, 5],
  [2, 8, 7],
  // row 3
  [3, 1, 5],
  [3, 2, 9],
  [3, 3, 7],
  [3, 5, 1],
  [3, 6, 4],
  [3, 7, 2],
  // row 4
  [4, 1, 2],
  [4, 2, 6],
  [4, 4, 5],
  [4, 6, 7],
  [4, 7, 9],
  // row 5
  [5, 1, 1],
  [5, 2, 3],
  [5, 3, 9],
  [5, 5, 4],
  [5, 6, 8],
  [5, 7, 5],
  // row 6
  [6, 0, 9],
  [6, 2, 1],
  [6, 3, 5],
  [6, 4, 3],
  [6, 5, 7],
  [6, 8, 4],
  // row 7
  [7, 0, 2],
  [7, 1, 8],
  [7, 2, 7],
  [7, 6, 6],
  [7, 7, 3],
  // row 8 — skip (8,0) which is placed via UI last
  [8, 1, 4],
  [8, 2, 5],
  [8, 3, 2],
  [8, 5, 6],
  [8, 6, 1],
];

declare global {
  interface Window {
    __sudoku__?: {
      createWorkerClient: unknown;
      store: {
        getState: () => {
          loadPuzzle: (puzzle: unknown) => void;
          selectCell: (coord: { row: number; col: number }) => void;
          placeDigit: (digit: number) => void;
        };
      };
    };
  }
}

test('happy path: start → digit → hint → undo → solve → win modal', async ({ page }) => {
  // 1. Navigate to landing screen
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeVisible();

  // 2. Start an easy game — clicking Easy triggers generation directly (no separate Play button)
  await page.getByRole('button', { name: 'Easy' }).click();

  // 3. Wait for the game screen: landing overlay disappears once puzzle generation finishes
  //    and setScreen('game') is called. The board's 81 gridcells are always rendered, so we
  //    cannot rely on their count alone — we must wait for the landing overlay to be gone.
  await expect(page.locator('.landing-overlay')).toHaveCount(0, { timeout: 30_000 });

  // 4. Inject the known fixture so the test knows exactly which cells to fill.
  //    The generated puzzle has already been loaded (step 3 guarantees it), so our
  //    loadPuzzle call is the last write to the store before we interact with the board.
  await page.evaluate((puzzle) => {
    window.__sudoku__!.store.getState().loadPuzzle(puzzle);
  }, KNOWN_PUZZLE);

  // 5. UI digit placement: click cell (row 0, col 2) — empty in fixture, solution value 4
  await page.locator('[data-row="0"][data-col="2"]').click();
  await page.locator('.board').focus();
  await page.keyboard.press('4');
  await expect(page.locator('[data-row="0"][data-col="2"]')).toHaveAttribute(
    'aria-label',
    /your 4/,
  );

  // 6. Hint: click Hint button, assert panel appears at level 1
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.getByText('There is a technique you can apply.')).toBeVisible();

  // 7. Undo: click Undo button, assert cell is empty again
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('[data-row="0"][data-col="2"]')).toHaveAttribute('aria-label', /empty/);

  // 8. Bulk fill 50 cells via store (all empty cells except the last one at row 8, col 0)
  await page.evaluate((cells) => {
    const state = window.__sudoku__!.store.getState();
    for (const [row, col, digit] of cells) {
      state.selectCell({ row, col });
      state.placeDigit(digit);
    }
  }, BULK_FILL_CELLS);

  // 9. Place the last cell (row 8, col 0, solution value 3) via real UI
  await page.locator('[data-row="8"][data-col="0"]').click();
  await page.locator('.board').focus();
  await page.keyboard.press('3');

  // Verify the cell now shows 3 before checking the win modal
  await expect(page.locator('[data-row="8"][data-col="0"]')).toHaveAttribute(
    'aria-label',
    /your 3/,
  );

  // 10. Win modal appears
  const winDialog = page.getByRole('dialog', { name: /Puzzle Complete/i });
  await expect(winDialog).toBeVisible({ timeout: 5_000 });
  await expect(winDialog.getByRole('button', { name: 'New Game' })).toBeVisible();
});
