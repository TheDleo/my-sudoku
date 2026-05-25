import { test, expect } from '@playwright/test';

test('renders Sudoku heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeVisible();
});
