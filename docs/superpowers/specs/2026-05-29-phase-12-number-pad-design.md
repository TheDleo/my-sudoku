# Phase 12: Number Pad — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Goal

Add a touch-friendly number pad below the Sudoku board. Digit buttons show how many placements remain and disable at zero. Tapping a digit either places/pencil-marks in the selected cell or sets the highlighted number if no cell is selected.

## Architecture

### New files

| File                          | Purpose               |
| ----------------------------- | --------------------- |
| `src/game/NumberPad.tsx`      | Number pad component  |
| `src/game/NumberPad.css`      | Styles                |
| `src/game/NumberPad.test.tsx` | RTL integration tests |

### Modified files

| File                       | Change                                        |
| -------------------------- | --------------------------------------------- |
| `src/game/helpers.ts`      | Add `getRemainingCounts(cells)` pure selector |
| `src/game/helpers.test.ts` | Unit tests for `getRemainingCounts`           |
| `src/app.tsx`              | Render `<NumberPad />` below `<Board />`      |

## Selector: `getRemainingCounts`

```ts
getRemainingCounts(cells: Cell[][]): Record<Digit, number>
```

Iterates all 81 cells, counts placed values per digit, returns `9 - placedCount` for each digit 1–9. Pure function with no side effects; lives in `helpers.ts` alongside other cell utilities.

## Component: `NumberPad`

### Store subscriptions

- `s.cells` → passed to `getRemainingCounts` for counters and disabled state
- `s.selection` → determines whether a cell is active
- `s.pencilMode` → chooses place vs. pencil mark semantics

### Tap semantics

| Condition                                  | Action                 |
| ------------------------------------------ | ---------------------- |
| Digit tap, cell selected, `pencilMode` off | `placeDigit(d)`        |
| Digit tap, cell selected, `pencilMode` on  | `togglePencilMark(d)`  |
| Digit tap, no cell selected                | `setSelectedNumber(d)` |
| Erase tap                                  | `eraseCell()`          |

`eraseCell` is a no-op in the store when no cell is selected, so no guard is needed in the component.

### Propagation

`NumberPad`'s container div carries `onClick={e => e.stopPropagation()}`, matching the `Board` pattern, so digit taps do not bubble to `<main>`'s click-outside handler and deselect the active cell.

## Layout

Single flex row of 10 equal-width items: digits 1–9 followed by an erase button. Each digit button stacks its label above a small remaining count. Wraps naturally on very narrow viewports.

```
┌──────────────────────────────────────────────────────┐
│  1   2   3   4   5   6   7   8   9   ⌫  │
│  3   2   4   1   0   3   2   1   2       │
└──────────────────────────────────────────────────────┘
```

- Remaining count of 0 → button `disabled` + dimmed via opacity
- Erase button carries no counter
- Uses existing CSS tokens (`--accent`, `--border`, `--fg-muted`, `--surface`, etc.)
- Pad sits below the board with vertical spacing via margin/gap

## App layout

```tsx
<main onClick={handleMainClick}>
  <h1>Sudoku</h1>
  <Board />
  <NumberPad />
</main>
```

## Testing

### `helpers.test.ts` — `getRemainingCounts`

- All cells empty → every digit count is 9
- One instance of a digit placed → that digit's count is 8
- Nine instances of a digit placed → that digit's count is 0

### `NumberPad.test.tsx` — RTL

- Digit tap with cell selected, normal mode → `placeDigit` called
- Digit tap with cell selected, pencil mode → `togglePencilMark` called
- Digit tap with no cell selected → `setSelectedNumber` called
- Erase tap → `eraseCell` called
- Button is disabled when remaining count is 0
- Remaining count renders correctly for a given cell state

## Out of scope (Phase 13+)

- Pencil mode toggle button (Phase 13)
- Auto-candidate mode (Phase 14)
