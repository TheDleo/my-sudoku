# UI and Hint Engine Fixes — Design Spec

**Date:** 2026-05-29

## Overview

Four targeted fixes to the Sudoku app: pencil mark legibility, per-digit pencil mark highlighting, automatic candidate highlights after digit placement, and a hint engine bug where removing pencil marks didn't prevent the same hint from repeating.

---

## Fix 1 — Bigger Pencil Marks

**File:** `src/game/Cell.css`

Increase `.cell__pencil-mark` `font-size` from `0.32em` to `0.45em`. No logic changes needed.

---

## Fix 2 — Green Circle on Matching Pencil Mark

**Files:** `src/game/Cell.tsx`, `src/game/Cell.css`

When `selection.number` is non-null, pencil mark spans whose digit matches that number should display a green circle behind them.

**Approach:** `Cell` reads `selection.number` directly from the Zustand store via a new selector. Zustand's selector memoization means this is cheap across all 81 cells. No prop changes to `Cell` or `Board`.

**Rendering change:** In the pencil mark `<span>`, add `cell__pencil-mark--highlighted` when `d === selectedNumber && cell.pencilMarks.has(d)`.

**CSS:** `.cell__pencil-mark--highlighted` gets `background: #4ade80; border-radius: 50%;` (green circle). Color is distinct from the existing `--cell-highlight` blue used for the `possible` cell background.

---

## Fix 3 — Auto-Highlight Candidates After Placing a Digit

**File:** `src/game/reducers.ts`

After `placeDigit(digit)` completes, set `selection.number = digit` in the returned state. This is the single change needed — both keyboard and NumberPad call `placeDigit`, so both paths get the highlight automatically.

`getHighlights` already computes `possible` highlights for all empty cells where `selection.number` is a valid candidate, so no changes are needed in the highlight logic.

---

## Fix 4 — Hint Engine Respects User Pencil Mark Removals

**File:** `src/hints/engine.ts`

**Root cause:** `getHint` calls `computeCandidates(values)` which recomputes all candidates from board values alone, ignoring the user's pencil marks. When a user removes the pencil marks identified by a hint (e.g., a hidden pair elimination), the engine still finds that same pattern because it sees the full mathematical candidate set.

**Fix:** Build the `candidates` grid passed to detectors from the user's pencil marks when available:

```
candidates[r][c] =
  cell.value !== null  → empty set (already filled)
  cell.pencilMarks.size > 0 → cell.pencilMarks (user's working candidates)
  otherwise           → computedCandidates[r][c] (full mathematical set)
```

`computedCandidates` is still computed first (needed as fallback and for `values`). The change only affects how detectors see candidates for cells where the user has actively set pencil marks.

**Effect:** If the user removes the pencil marks that constituted a hidden pair, those cells no longer show those digits as candidates, so the detector won't find that pattern again. The engine returns the next applicable technique instead.

---

## Testing

Each fix has targeted unit/integration tests:

- **Fix 1:** Visual only — no unit test needed.
- **Fix 2:** Cell test: given `selection.number = 5` and a cell with pencilMarks `{3, 5, 7}`, the span for `5` has the highlighted class; spans for `3` and `7` do not.
- **Fix 3:** `reducers.test.ts`: `placeDigit` sets `selection.number` to the placed digit.
- **Fix 4:** `engine.test.ts`: given a board where a hidden pair exists in computed candidates but the user's pencil marks have already removed those digits, `getHint` does not return the hidden pair step.

---

## Files Changed

| File                        | Change                                                                            |
| --------------------------- | --------------------------------------------------------------------------------- |
| `src/game/Cell.css`         | Increase pencil mark font-size; add `.cell__pencil-mark--highlighted` style       |
| `src/game/Cell.tsx`         | Read `selection.number` from store; apply highlight class to matching pencil mark |
| `src/game/reducers.ts`      | `placeDigit` sets `selection.number = digit` in returned state                    |
| `src/hints/engine.ts`       | Use pencil marks as candidates when available; fall back to computed              |
| `src/game/reducers.test.ts` | Test that `placeDigit` updates `selection.number`                                 |
| `src/game/Cell.test.tsx`    | Test pencil mark highlight class                                                  |
| `src/hints/engine.test.ts`  | Test that removed pencil marks prevent repeated hints                             |
