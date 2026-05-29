# Phase 11: Cell Interaction — Design Spec

**Date:** 2026-05-28
**Status:** Approved
**Builds on:** Phase 10 (Board/Cell rendering, `src/game/Board.tsx`, `src/game/Cell.tsx`)

---

## Goal

Wire up mouse and keyboard interaction so the player can select cells, place digits, toggle pencil marks, erase, and navigate with arrow keys. Conflict detection on placement increments the mistake counter.

---

## Scope

### Included in Phase 11

- Click to select/deselect cells (Board event delegation)
- Click outside board to deselect (App `<main>` handler)
- Auto-set `selection.number` on click based on cell content
- `src/game/keyboard.ts` — pure `handleKey()` function
- Arrow key navigation (clamped to 0–8, selection.number preserved)
- Digit key placement and pencil mark toggling (Shift+digit, pencilMode-aware)
- Backspace/Delete to erase, Escape to deselect
- `placeDigit` reducer increments `mistakes` on rule violations
- Board wires keyboard listener via `useEffect` + `tabIndex={0}`

### Deferred to later phases

- Number pad (Phase 12)
- Pencil mode toggle button / UI (Phase 13)
- Auto-pencil-mark removal on placement (Phase 13)
- Timer and mistake counter display (Phase 19)
- Full highlight system with settings toggle (Phase 15)

---

## 1. Click Handling

### Architecture

Board handles all clicks via **event delegation** on the board div. `Cell` remains purely presentational — no `onClick` prop or handler.

Board's `onClick` handler uses `(e.target as HTMLElement).closest('[data-row][data-col]')` to find the clicked cell. All cases call `e.stopPropagation()`.

### Click behaviors

| Scenario                                             | Action                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| Click non-selected filled cell                       | `selectCell({row, col})` + `setSelectedNumber(cell.value)` |
| Click non-selected empty cell                        | `selectCell({row, col})` + `setSelectedNumber(null)`       |
| Click the currently selected cell                    | `selectCell(null)` + `setSelectedNumber(null)`             |
| Click board background/border (no `data-row` target) | `selectCell(null)` + `setSelectedNumber(null)`             |

### Click outside board

`App`'s `<main>` gets an `onClick` handler that calls `selectCell(null)` + `setSelectedNumber(null)`. Board's click handler calls `e.stopPropagation()` so board clicks never reach App. Clicks on the heading or page background reach App and deselect.

### Board element changes

- Add `boardRef = useRef<HTMLDivElement>(null)` — needed for keyboard listener
- Add `tabIndex={0}` to the board div — enables keyboard focus
- Board already has `role="grid"` and `aria-label="Sudoku board"` from Phase 10

---

## 2. `keyboard.ts`

### New file: `src/game/keyboard.ts`

Pure function, no React dependency:

```ts
export function handleKey(
  event: KeyboardEvent,
  state: Pick<GameState, 'cells' | 'given' | 'selection' | 'pencilMode'>,
  actions: Pick<
    GameStore,
    'selectCell' | 'setSelectedNumber' | 'placeDigit' | 'eraseCell' | 'togglePencilMark'
  >,
): void;
```

### Key behaviors

| Key                       | Guard         | Action                                                                                                    |
| ------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `ArrowUp/Down/Left/Right` | —             | Move cursor ±1, clamped 0–8. `preventDefault()`. No-op if no cell selected. Preserves `selection.number`. |
| `1`–`9`                   | cell selected | `placeDigit(d)` if not pencilMode; `togglePencilMark(d)` if pencilMode. `preventDefault()`.               |
| `Shift+1`–`9`             | cell selected | Always `togglePencilMark(d)`, regardless of pencilMode. `preventDefault()`.                               |
| `Backspace` / `Delete`    | cell selected | `eraseCell()`. `preventDefault()`.                                                                        |
| `Escape`                  | —             | `selectCell(null)` + `setSelectedNumber(null)`.                                                           |
| Any other key             | —             | No-op.                                                                                                    |

**Arrow key behavior detail:** cursor moves to `Math.max(0, row-1)` etc. If no cell is selected, arrow keys do nothing (no auto-select of a default cell). `selection.number` is not changed by arrow navigation — it is preserved so the player can navigate while keeping a number highlighted.

### Board wiring

```ts
useEffect(() => {
  const el = boardRef.current;
  if (!el) return;
  const handler = (e: KeyboardEvent) =>
    handleKey(e, useGameStore.getState(), useGameStore.getState());
  el.addEventListener('keydown', handler);
  return () => el.removeEventListener('keydown', handler);
}, []);
```

`useGameStore.getState()` is called at handler invocation time — no stale closure risk.

---

## 3. Mistake Increment in `placeDigit`

### Change to `src/game/reducers.ts`

`placeDigit` gains a conflict check: before placing, scan the pre-placement cell state for any peer cell (same row, col, or box) that already holds the same digit. If found, the placement is a rule violation and `mistakes` increments by 1 alongside the cell update.

**Key design decisions:**

- Check runs against **pre-placement** state, so it accurately reflects whether the player is making a new mistake.
- **Undo does not restore `mistakes`** — snapshots only capture `cells` and `pencilMode`. This is intentional: the mistake counter is a permanent record, not something the player can undo away.
- Overwriting a previously placed digit with a conflicting digit increments mistakes again — each placement is evaluated independently.
- Given cells are already guarded (no-op) so mistakes can never be incremented for given cells.

---

## 4. Files Changed

| File                        | Change                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/game/keyboard.ts`      | **New** — pure `handleKey()` function                                                             |
| `src/game/keyboard.test.ts` | **New** — unit tests, no React                                                                    |
| `src/game/reducers.ts`      | Update `placeDigit` to increment `mistakes` on conflict                                           |
| `src/game/reducers.test.ts` | Add mistake-increment tests to `placeDigit` describe block                                        |
| `src/game/Board.tsx`        | Add `boardRef`, `tabIndex={0}`, `useEffect` keyboard listener, `onClick` event delegation handler |
| `src/game/Board.test.tsx`   | Add click and keyboard integration tests                                                          |
| `src/app.tsx`               | Add `onClick` to `<main>` for click-outside deselect                                              |
| `src/app.test.tsx`          | Verify heading test still passes                                                                  |

---

## 5. Testing

### `src/game/keyboard.test.ts` — pure unit tests, no React

Call `handleKey()` directly with a mock `KeyboardEvent`-like object and state. No component rendering.

- Each arrow direction moves cursor correctly; clamped at boundaries
- Arrow keys no-op when no cell is selected
- Arrow keys preserve `selection.number`
- Digit key calls `placeDigit` when pencilMode is false
- Digit key calls `togglePencilMark` when pencilMode is true
- Shift+digit always calls `togglePencilMark` regardless of pencilMode
- Backspace calls `eraseCell`
- Escape deselects and clears selected number
- No-op keys (letters, F-keys) do nothing

### `src/game/reducers.test.ts` additions

- `placeDigit` increments `mistakes` when digit conflicts in the same row
- `placeDigit` increments `mistakes` when digit conflicts in the same column
- `placeDigit` increments `mistakes` when digit conflicts in the same box
- `placeDigit` does NOT increment `mistakes` on a clean (non-conflicting) placement
- `mistakes` is not restored by undo

### `src/game/Board.test.tsx` additions

- Clicking a cell selects it (`.cell--selected` class)
- Clicking a filled cell sets `selection.number` to that digit
- Clicking an empty cell sets `selection.number` to null
- Clicking the selected cell deselects it
- Dispatching `ArrowRight` keydown on the board moves the selection
- Dispatching a digit keydown places that digit in the selected cell
- Dispatching `Escape` keydown deselects

**Estimated total:** ~25–30 new tests → 301 → ~330.

---

## Acceptance Criteria

- Click any non-given cell → it highlights as selected; its digit (if any) is reflected in `selection.number`
- Clicking the selected cell deselects it; clicking outside the board deselects
- Arrow keys navigate between cells; keys clamp at grid edges
- Digit keys place digits; Shift+digit or pencilMode+digit toggles pencil marks
- Backspace/Delete erases the selected cell; Escape deselects
- Given cells cannot be overwritten or erased (enforced by existing reducers)
- A conflicting placement increments `mistakes` and the conflict is highlighted (conflict highlighting already wired from Phase 10)
- All 301 existing tests continue to pass
- `npm run typecheck` and `npm run lint` clean
