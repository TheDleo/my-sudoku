# Phase 25 E2E Smoke Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the trivial smoke test with a full happy-path Playwright test that exercises start → digit → hint → undo → solve → win modal using a hardcoded known puzzle injected via an exposed Zustand store.

**Architecture:** Two changes — expose `useGameStore` on `window.__sudoku__` so tests can call `loadPuzzle`/`selectCell`/`placeDigit` in the browser; replace `tests/e2e/smoke.spec.ts` with a test that injects a known easy puzzle, exercises key interactions via the real UI, bulk-fills remaining cells via the store, and asserts the win modal.

**Tech Stack:** Playwright, TypeScript, Zustand, Vite (built bundle served at localhost:4173).

---

### Task 1: Expose `useGameStore` on `window.__sudoku__`

**Files:**

- Modify: `src/main.tsx`

- [ ] **Step 1: Update `main.tsx`**

  Replace the entire file with:

  ```tsx
  import { StrictMode } from 'react';
  import { createRoot } from 'react-dom/client';
  import { App } from './app';
  import { createWorkerClient } from './generator/workerClient';
  import { useGameStore } from './game/store';
  import { applyTheme } from './settings/theme';
  import { useSettingsStore } from './settings/store';
  import './styles/global.css';

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');

  declare global {
    interface Window {
      __sudoku__?: {
        createWorkerClient: typeof createWorkerClient;
        store: typeof useGameStore;
      };
    }
  }
  window.__sudoku__ = { createWorkerClient, store: useGameStore };

  applyTheme(useSettingsStore.getState().theme);

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Run unit tests to confirm no regressions**

  ```bash
  npx vitest run
  ```

  Expected: all 574 tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add src/main.tsx
  git commit -m "feat(e2e): expose useGameStore on window.__sudoku__ for e2e tests"
  ```

---

### Task 2: Replace smoke test with full happy-path test

**Files:**

- Modify: `tests/e2e/smoke.spec.ts`

The test runs against the built app served at `http://localhost:4173/my-sudoku/` (Playwright config builds and previews automatically). It uses the Wikipedia Sudoku puzzle as a known fixture — 30 given cells, 51 empty cells. The test places one cell via real UI, takes a hint, undoes, bulk-fills 50 cells via store, then places the last cell via UI to trigger the win modal.

**Known puzzle — initial board** (null = empty):

```
Row 0: [5,3,null,null,7,null,null,null,null]
Row 1: [6,null,null,1,9,5,null,null,null]
Row 2: [null,9,8,null,null,null,null,6,null]
Row 3: [8,null,null,null,6,null,null,null,3]
Row 4: [4,null,null,8,null,3,null,null,1]
Row 5: [7,null,null,null,2,null,null,null,6]
Row 6: [null,6,null,null,null,null,2,8,null]
Row 7: [null,null,null,4,1,9,null,null,5]
Row 8: [null,null,null,null,8,null,null,7,9]
```

**Known puzzle — solution** (all 81 cells):

```
Row 0: [5,3,4,6,7,8,9,1,2]
Row 1: [6,7,2,1,9,5,3,4,8]
Row 2: [1,9,8,3,4,2,5,6,7]
Row 3: [8,5,9,7,6,1,4,2,3]
Row 4: [4,2,6,8,5,3,7,9,1]
Row 5: [7,1,3,9,2,4,8,5,6]
Row 6: [9,6,1,5,3,7,2,8,4]
Row 7: [2,8,7,4,1,9,6,3,5]
Row 8: [3,4,5,2,8,6,1,7,9]
```

- [ ] **Step 1: Run the existing e2e tests to confirm baseline**

  ```bash
  npx playwright test
  ```

  Expected: 2 tests pass (the trivial heading test in smoke.spec.ts and the worker test in worker.spec.ts). This confirms the Playwright setup works before we change anything.

- [ ] **Step 2: Replace `tests/e2e/smoke.spec.ts` with the full test**

  Replace the entire file with:

  ```ts
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

    // 3. Wait for the board: 81 gridcells appear once puzzle generation completes
    await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 });

    // 4. Inject the known fixture so the test knows exactly which cells to fill
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
    await expect(page.locator('[data-row="0"][data-col="2"]')).toHaveAttribute(
      'aria-label',
      /empty/,
    );

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

    // 10. Win modal appears
    await expect(page.getByRole('dialog', { name: /Puzzle Complete/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  });
  ```

- [ ] **Step 3: Run the e2e tests**

  ```bash
  npx playwright test
  ```

  Expected: 2 tests pass — the new happy-path test in `smoke.spec.ts` and the existing worker test in `worker.spec.ts`.

  **If the happy-path test fails**, the most likely causes are:
  - **Board keyboard focus**: if digit placement fails, add `await page.locator('.board').click()` before the `.focus()` call to explicitly click the board container first, ensuring it is focused before the key press.
  - **Generation timeout**: if 81 cells don't appear within 30s, the Easy puzzle generation is taking longer than expected in the preview build — increase the timeout to `60_000`.
  - **Win modal not appearing**: verify the bulk-fill step logged no console errors by checking `page.on('console', ...)` — if `placeDigit` is being called but `selectCell` cell hasn't updated yet, add a small `await page.waitForTimeout(100)` before the win modal assertion (last resort).

- [ ] **Step 4: Commit**

  ```bash
  git add tests/e2e/smoke.spec.ts
  git commit -m "feat(e2e): replace heading stub with full happy-path smoke test"
  ```

---

### Task 3: Verify CI passes

- [ ] **Step 1: Run the full unit test suite**

  ```bash
  npx vitest run
  ```

  Expected: all 574 tests pass.

- [ ] **Step 2: Run typecheck**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Run e2e tests one more time**

  ```bash
  npx playwright test
  ```

  Expected: both tests pass (happy-path smoke + worker).

- [ ] **Step 4: Manual bundle size check**

  ```bash
  npm run build && du -sh dist/assets/*.js
  ```

  Expected: total JS under 2MB uncompressed (a Sudoku app with no large dependencies should be well under this). If any file exceeds 1MB, investigate what was accidentally bundled.
