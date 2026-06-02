# Design: Phase 25 E2E Smoke Test

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Replace the trivial heading test in `tests/e2e/smoke.spec.ts` with a full happy-path test that exercises: landing → game start → digit placement → hint → undo → bulk solve → win modal. A known easy puzzle fixture is injected after game start so the test knows exactly which cells to fill.

Bundle size check is manual only (not automated).

---

## 1. Store Exposure (`main.tsx`)

Extend `window.__sudoku__` to include a reference to `useGameStore`:

```ts
window.__sudoku__ = { createWorkerClient, store: useGameStore };
```

Update the `Window` interface declaration:

```ts
interface Window {
  __sudoku__?: {
    createWorkerClient: typeof createWorkerClient;
    store: typeof useGameStore;
  };
}
```

This follows the existing pattern (worker client is already exposed this way). The store reference gives tests access to `loadPuzzle`, `placeDigit`, and any other store actions without requiring network interception or UI-driven puzzle generation.

---

## 2. Known Puzzle Fixture

The classic Wikipedia Sudoku puzzle embedded as a constant in the test file:

**Initial board** (null = empty):

```
5 3 · · 7 · · · ·
6 · · 1 9 5 · · ·
· 9 8 · · · · 6 ·
8 · · · 6 · · · 3
4 · · 8 · 3 · · 1
7 · · · 2 · · · 6
· 6 · · · · 2 8 ·
· · · 4 1 9 · · 5
· · · · 8 · · 7 9
```

**Solution** (all 9×9 filled):

```
5 3 4  6 7 8  9 1 2
6 7 2  1 9 5  3 4 8
1 9 8  3 4 2  5 6 7
8 5 9  7 6 1  4 2 3
4 2 6  8 5 3  7 9 1
7 1 3  9 2 4  8 5 6
9 6 1  5 3 7  2 8 4
2 8 7  4 1 9  6 3 5
3 4 5  2 8 6  1 7 9
```

30 given cells → 51 empty cells. The test uses 50 via bulk store calls and 1 (row 8, col 0, value 3) via real UI interaction.

---

## 3. Smoke Test Happy Path

**File:** `tests/e2e/smoke.spec.ts` (replaces existing content)

One test: `'happy path: start → digit → hint → undo → solve → win modal'`

Steps:

1. **Navigate** to `/`
2. **Landing screen**: assert `h1` with "Sudoku" is visible
3. **Start game**: click "Easy" button (this triggers puzzle generation directly — no separate Play button) → wait for 81 `[role="gridcell"]` elements (generation takes a few seconds)
4. **Inject fixture**: `page.evaluate(() => window.__sudoku__!.store.getState().loadPuzzle(KNOWN_PUZZLE))`
5. **UI digit placement**: click cell at row 0, col 2 (empty in fixture) → press `'4'` → assert cell aria-label contains `"your 4"`
6. **Hint**: click button with name "Hint" → wait for hint panel text to be visible (assert `"There is a technique"` text is visible at level 1)
7. **Undo**: click button with name "Undo" → assert cell at row 0, col 2 aria-label contains `"empty"`
8. **Bulk fill**: `page.evaluate(...)` — call `placeDigit` for all 50 remaining empty cells except row 8, col 0
9. **Final digit via UI**: locate cell `[aria-label*="Row 9, column 1"]` → click it → press `'3'`
10. **Win modal**: assert `getByRole('dialog', { name: /Puzzle Complete/i })` is visible → assert "New Game" button is present

The existing `worker.spec.ts` heading test is preserved (moved there or kept as a second test in smoke.spec.ts).

---

## Files to Create / Modify

| File                      | Change                                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| `src/main.tsx`            | Add `store: useGameStore` to `window.__sudoku__`; update `Window` type |
| `tests/e2e/smoke.spec.ts` | Replace heading-only test with full happy-path test                    |

---

## Out of Scope

- Bundle size automated check (manual verification only)
- axe-core Playwright integration (deferred beyond Phase 25)
- Multi-browser testing (Chromium only, per existing config)
