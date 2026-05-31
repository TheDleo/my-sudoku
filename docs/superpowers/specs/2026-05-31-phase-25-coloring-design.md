# Phase 25: Coloring Support — Design Spec

## Problem

Expert-level puzzles sometimes require the coloring (simple chains) technique. The hint engine already detects it, names it, and can expose it at hint levels 2–4. However, all chain cells are painted with the same single `'hint'` highlight — there is no visual distinction between color A and color B. Additionally, there is no manual tool for tracing coloring chains independently of the hint system.

## Goal

Two independent systems, both shipped in this phase:

1. **Enhanced hint visualization** — when a coloring hint fires and the user reaches hint level 3, chain cells appear in two distinct tints (A = blue, B = amber) instead of a single uniform color.
2. **Manual color-marking tool** — two toggle buttons in the ActionBar let the user paint cells blue or amber as freeform working notes, independent of the hint system.

## Design Decisions

- **Separate systems.** Hint colors are ephemeral (go away when the hint is dismissed). Manual marks are persistent working notes (survive hint changes, are saved to localStorage, are included in undo/redo). They share CSS color tokens for visual consistency but are otherwise fully independent.
- **Global marks (not per-digit).** Manual color marks are a plain `('A' | 'B' | null)[][]` — no digit attached. The user mentally tracks which digit they are working on.
- **Two toggle buttons.** ActionBar gets `🔵 A` and `🟡 B` buttons, mutually exclusive. Clicking a marked cell with the active color clears it (toggle). Normal cell selection is suppressed while a color mode is active (clicks only paint).

## Architecture

### Solver layer — `colorGroups` on `Step`

`Step` gains an optional field:

```ts
colorGroups?: { a: CellCoord[]; b: CellCoord[] };
```

The coloring detector already computes `colorA`/`colorB` internally. It now populates `colorGroups` in the returned `Step`. All other technique detectors leave the field absent.

### Highlight system — four new tiers

`CellHighlight` gains four new values:

```
'hint-a'   // chain cell assigned color A by hint engine
'hint-b'   // chain cell assigned color B by hint engine
'color-a'  // manually painted blue
'color-b'  // manually painted amber
```

`getHighlights` rendering order (low → high priority):

1. `possible`
2. `peer`
3. `color-a` / `color-b` (from `colorMarks`)
4. `hint` / `hint-a` / `hint-b` (hint overrides manual marks)
5. `conflict`
6. `selected` / `selected-pencil`

At hint level ≥ 3, if `currentHint.colorGroups` is present, chain cells are rendered as `hint-a`/`hint-b`; otherwise the existing `hint` tier is used (all other techniques unchanged).

### Game state additions

```ts
// GameState (types.ts)
colorMarks: ('A' | 'B' | null)[][];
colorMode: 'A' | 'B' | null;

// GameSnapshot (types.ts) — for undo/redo
colorMarks: ('A' | 'B' | null)[][];

// GameStore (types.ts)
setColorMark: (coord: CellCoord, color: 'A' | 'B' | null) => void;
toggleColorMode: (color: 'A' | 'B') => void;
```

**Behavior rules:**

- `setColorMark` is wrapped in `withSnapshot` so undo/redo restores color marks.
- `loadPuzzle` resets `colorMarks` (all null) and `colorMode` (null).
- `placeDigit` clears the color mark on the placed cell.
- `colorMarks` is persisted to localStorage (backwards-compatible: absent in old saves defaults to empty grid).
- `colorMode` is NOT persisted (ephemeral UI state).

### UI

**ActionBar** gets two buttons after Redo:

```
🔵 A  |  🟡 B
```

Mutually exclusive toggles. Active button is filled with its color. Clicking the active button again deactivates it (back to `colorMode: null`).

**Board click handling** — when `colorMode !== null`:

- Click paints the cell with `colorMode` (or clears it if already that color).
- Normal cell selection logic is skipped.

**Cell rendering** — `Cell.tsx` already maps `CellHighlight` to a CSS class (`cell--{highlight}`). No changes needed there; new CSS classes do the work.

### Theme tokens

Four new CSS custom properties added to all themes:

| Token            | Light                   | Dark        |
| ---------------- | ----------------------- | ----------- |
| `--cell-hint-a`  | soft blue               | muted blue  |
| `--cell-hint-b`  | soft amber              | muted amber |
| `--cell-color-a` | same as `--cell-hint-a` | same        |
| `--cell-color-b` | same as `--cell-hint-b` | same        |
| `--color-b`      | amber (for button fill) | amber       |

## Files to Create/Modify

| Action | File                                     |
| ------ | ---------------------------------------- |
| Modify | `src/solver/types.ts`                    |
| Modify | `src/solver/techniques/coloring.ts`      |
| Modify | `src/solver/techniques/coloring.test.ts` |
| Modify | `src/game/types.ts`                      |
| Modify | `src/game/reducers.ts`                   |
| Modify | `src/game/reducers.test.ts`              |
| Modify | `src/game/store.ts`                      |
| Modify | `src/game/persistence.ts`                |
| Modify | `src/game/persistence.test.ts`           |
| Modify | `src/game/highlights.ts`                 |
| Modify | `src/game/highlights.test.ts`            |
| Modify | `src/game/Board.tsx`                     |
| Modify | `src/game/ActionBar.tsx`                 |
| Modify | `src/game/ActionBar.test.tsx`            |
| Modify | `src/game/ActionBar.css`                 |
| Modify | `src/game/Cell.css`                      |
| Modify | `src/settings/theme.ts`                  |
