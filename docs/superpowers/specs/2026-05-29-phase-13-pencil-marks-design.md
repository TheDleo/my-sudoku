# Phase 13: Pencil Marks (Manual) — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Goal

Add a pencil mode toggle to the UI: users can switch between placing digits and placing pencil marks. When a digit is placed, the placed digit is automatically removed from the pencil marks of all peer cells. Undo restores both the placed digit and the cleared marks.

## Architecture

### New files

| File                          | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `src/game/ActionBar.tsx`      | Pencil mode toggle button (and home for future action buttons) |
| `src/game/ActionBar.css`      | Styles                                                         |
| `src/game/ActionBar.test.tsx` | RTL integration tests                                          |

### Modified files

| File                          | Change                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| `src/game/reducers.ts`        | Extend `placeDigit` to clear peer pencil marks                  |
| `src/game/reducers.test.ts`   | Tests for auto-removal and undo                                 |
| `src/game/highlights.ts`      | Add `'selected-pencil'` tier; accept `pencilMode` in state pick |
| `src/game/highlights.test.ts` | Tests for the new tier                                          |
| `src/game/Board.tsx`          | Subscribe to `pencilMode`; pass it to `getHighlights`           |
| `src/styles/tokens.css`       | Add `--cell-selected-pencil` color token (light + dark)         |
| `src/app.tsx`                 | Render `<ActionBar />` between `<Board />` and `<NumberPad />`  |

## `placeDigit` Auto-Removal

Extend the existing `placeDigit` reducer to also remove the placed digit from the pencil marks of all 20 peer cells in the same `cloneCells` mutation:

```
placeDigit(state, digit):
  1. Guard: sel === null or given → return state (unchanged)
  2. clone cells
  3. set cells[sel.row][sel.col].value = digit
  4. for each peer of sel:
       peer.pencilMarks.delete(digit)
  5. check conflict (uses pre-clone state.cells — unchanged)
  6. return { ...state, cells: nextCells, mistakes }
```

`peersOf` is already imported in `reducers.ts`. No new imports needed.

Because `placeDigit` is called through `withSnapshot` in the store, the entire mutation — placement + peer pencil mark clearing — is captured in a single snapshot. Undoing a placement restores both the digit and the cleared marks.

## ActionBar Component

`ActionBar.tsx` renders a single row of action buttons. In Phase 13 it contains one button: the pencil mode toggle.

- Subscribes to `pencilMode` from the store
- Button label: `✏️ Pencil`
- Active state: `aria-pressed={pencilMode}` + CSS modifier `action-bar__pencil--active` (filled `--accent` background, `--accent-fg` text)
- Click handler: `useGameStore.getState().togglePencilMode()`
- Container carries `onClick={e => e.stopPropagation()}` (same pattern as Board and NumberPad)
- Width: `width: min(100%, 500px)` to match board and number pad

## Cell Pencil Mode Indicator

When `pencilMode` is on and a cell is selected, the cell receives `'selected-pencil'` highlight instead of `'selected'`.

### Token

```css
/* tokens.css */
--cell-selected-pencil: #dcfce7; /* light mode: green tint */

/* dark mode */
--cell-selected-pencil: #1a3a2a;
```

### Highlight type

```ts
export type CellHighlight =
  | 'selected'
  | 'selected-pencil'
  | 'conflict'
  | 'peer'
  | 'possible'
  | null;
```

### `getHighlights` signature change

```ts
export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection' | 'pencilMode'>,
): HighlightMap;
```

### Selected tier logic

```ts
// Selected (highest priority)
if (state.selection.cell !== null) {
  const { row, col } = state.selection.cell;
  map[row]![col] = state.pencilMode ? 'selected-pencil' : 'selected';
}
```

`Cell.tsx` already produces `cell--${highlight}` from the highlight value, so `'selected-pencil'` renders as `cell--selected-pencil` with no component changes needed.

### Board update

`Board.tsx` currently calls `getHighlights({ cells, given, selection })`. It must also subscribe to `pencilMode` and pass it:

```tsx
const pencilMode = useGameStore((s) => s.pencilMode);
const highlights = getHighlights({ cells, given, selection, pencilMode });
```

## App Layout

```tsx
<main onClick={handleMainClick}>
  <h1>Sudoku</h1>
  <Board />
  <ActionBar />
  <NumberPad />
</main>
```

## Testing

### `reducers.test.ts` — `placeDigit` auto-removal

- Placing a digit clears that digit from pencil marks of peer cells
- Pencil marks for other digits on peer cells are untouched
- Undo after placement restores both the placed digit and the cleared peer pencil marks

### `highlights.test.ts` — `'selected-pencil'` tier

- Selected cell with `pencilMode: true` → `'selected-pencil'`
- Selected cell with `pencilMode: false` → `'selected'` (existing behavior preserved)

### `ActionBar.test.tsx` — RTL

- Renders a pencil toggle button with `aria-pressed="false"` initially
- Click calls `togglePencilMode` → `aria-pressed` becomes `"true"`
- Click again → `aria-pressed` becomes `"false"`
- Clicks do not bubble to parent (stopPropagation)

## Out of scope (Phase 14+)

- Auto-candidates mode (computed pencil marks)
- Undo/redo buttons in ActionBar
