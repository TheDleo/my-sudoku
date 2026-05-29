# Phase 10: Board and Cell Rendering — Design Spec

**Date:** 2026-05-28
**Status:** Approved
**Builds on:** Phase 9 (Zustand game store, `src/game/store.ts`)

---

## Goal

Render a static board from store state. No interaction yet — just visual. Wires `Board` and `Cell` React components to `useGameStore`, including four highlight layers: selected, peer, conflict, and possible-placement.

---

## Scope

### Included in Phase 10

- `src/game/highlights.ts` — pure `getHighlights()` selector + types
- `src/game/Board.tsx` — 9×9 CSS Grid component
- `src/game/Cell.tsx` — single cell (digit or pencil marks + highlight)
- `src/game/testHelpers.ts` — shared `makePuzzle()` extracted from 3 existing test files
- Modify `src/app.tsx` — mount `<Board />` below the heading
- Test files: `highlights.test.ts`, `Board.test.tsx`, `Cell.test.tsx`

### Deferred to later phases

- **Possible-placement highlights** — **included in Phase 10** (not deferred; reversed during brainstorming)
- Cell click/keyboard interaction — Phase 11
- Number pad — Phase 12
- Auto-pencil-mark removal on placement — Phase 13
- Full 5-layer highlight system with settings toggle — Phase 15
- Responsive layout (side panel) — Phase 24
- Persistence restore on load — Phase 21

---

## 1. Highlights Selector

### New file: `src/game/highlights.ts`

```ts
import type { GameState } from './types';

export type CellHighlight = 'selected' | 'conflict' | 'peer' | 'possible' | null;
export type HighlightMap = CellHighlight[][];

export function getHighlights(
  state: Pick<GameState, 'cells' | 'given' | 'selection'>,
): HighlightMap;
```

**Algorithm** (applied in ascending priority — later tiers overwrite earlier ones):

1. **Possible** — if `selection.number` is set:
   - Build `values: (Digit | null)[][]` from `state.cells`
   - Call `computeCandidates(values)` from `src/solver/candidates.ts`
   - Mark every empty cell (`cells[r][c].value === null`) whose candidate set includes `selection.number`

2. **Peer** — if `selection.cell` is set:
   - Call `peersOf(selection.cell)` from `src/solver/units.ts`
   - Mark each peer coord as `'peer'`

3. **Conflict** — scan every row, col, and box:
   - For each unit, collect cells with non-null values
   - Any value appearing more than once → mark all cells in that unit holding that value as `'conflict'`

4. **Selected** — mark `selection.cell` itself as `'selected'`

**Priority** (highest wins): `selected` > `conflict` > `peer` > `possible`

The function is a pure function of `GameState` — no React, fully unit-testable without rendering.

---

## 2. Board Component

### New file: `src/game/Board.tsx`

**Store subscriptions:**

```tsx
const cells = useGameStore((s) => s.cells);
const given = useGameStore((s) => s.given);
const selection = useGameStore((s) => s.selection);
```

**Highlights:** computed once per render via `getHighlights({ cells, given, selection })`.

**Grid structure:** flat 9×9 CSS Grid — no box-group wrapper elements.

```css
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  aspect-ratio: 1;
  width: min(100%, 500px);
  border: 2px solid var(--fg); /* outer thick border */
}
```

**Cell borders** via CSS `nth-child` selectors on `.cell`:

- All cells: `border-right: 1px solid var(--border); border-bottom: 1px solid var(--border)`
- After column 3 and 6 (`nth-child(9n+3)`, `nth-child(9n+6)`): `border-right: 2px solid var(--fg)`
- After row 3 and 6 (cells 28–36 and 55–63, i.e., `nth-child(n+28):nth-child(-n+36)` etc.): `border-bottom: 2px solid var(--fg)`
- Leftmost cells (`nth-child(9n+1)`): no left border (outer border handles it)
- Top row cells (1–9): no top border

Board renders 81 `<Cell row={r} col={c} highlight={highlights[r][c]} />` elements in row-major order.

---

## 3. Cell Component

### New file: `src/game/Cell.tsx`

**Props:**

```ts
type Props = { row: number; col: number; highlight: CellHighlight };
```

**Store subscriptions (fine-grained):**

```tsx
const cell = useGameStore((s) => s.cells[row][col]);
const isGiven = useGameStore((s) => s.given[row][col]);
```

**Rendering:**

| Cell state                                           | Renders                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `cell.value !== null`                                | Digit. Bold + `var(--cell-given)` if given; normal weight + `var(--cell-user)` if user-entered |
| `cell.value === null && cell.pencilMarks.size > 0`   | 3×3 inner grid, digits 1–9 in fixed positions. Present marks shown; absent marks are blank     |
| `cell.value === null && cell.pencilMarks.size === 0` | Nothing inside                                                                                 |

**Pencil mark layout** (inner 3×3 grid, fixed positions):

```
1 2 3
4 5 6
7 8 9
```

Pencil digit font size ≈ 30–33% of cell size.

**Highlight CSS classes:**

| `highlight` prop | CSS class         | Effect                                                               |
| ---------------- | ----------------- | -------------------------------------------------------------------- |
| `'selected'`     | `.cell--selected` | background: `var(--cell-selected)`                                   |
| `'peer'`         | `.cell--peer`     | background: `var(--cell-peer)`                                       |
| `'conflict'`     | `.cell--conflict` | background: `var(--cell-conflict)`, color: `var(--cell-conflict-fg)` |
| `'possible'`     | `.cell--possible` | background: `var(--cell-highlight)`                                  |
| `null`           | —                 | background: `var(--cell-bg)`                                         |

No click handler in Phase 10 — interaction is Phase 11.

---

## 4. App Wiring

`src/app.tsx` mounts `<Board />` below the heading:

```tsx
import { Board } from './game/Board';

export function App() {
  return (
    <main>
      <h1>Sudoku</h1>
      <Board />
    </main>
  );
}
```

The store starts with `initialEmptyState` (blank sentinel board). Board renders 81 empty cells — visually correct for Phase 10. Phase 21 will call `loadPuzzle()` to populate the board.

---

## 5. Shared Test Helper

### New file: `src/game/testHelpers.ts`

Extracts `makePuzzle()` from the three existing test files (`reducers.test.ts`, `persistence.test.ts`, `store.test.ts`) into one canonical export. Existing test files updated to import from here.

```ts
export function makePuzzle(overrides?: Partial<Puzzle>): Puzzle;
```

---

## 6. Testing

### `src/game/highlights.test.ts` — pure unit tests, no React

- Empty state → all `null`
- `selection.cell` set → that cell is `'selected'`, all peers are `'peer'`
- Duplicate value in a row/col/box → both cells are `'conflict'`
- `selection.number` set → empty cells with that candidate are `'possible'`
- Priority: `'selected'` beats `'conflict'` on a cell that is both selected and conflicted
- Priority: `'conflict'` beats `'peer'` on a peer cell that also conflicts
- Priority: `'peer'` beats `'possible'` on a peer cell that is also a possible placement

### `src/game/Board.test.tsx` — RTL component tests

- Renders exactly 81 cells
- Given digit cells have the given CSS class; user-entered cells have the user class
- When `selection.cell` is set in store, that cell has `.cell--selected` and peers have `.cell--peer`
- Store seeded via `useGameStore.setState()` (pattern established in Phase 9)

### `src/game/Cell.test.tsx` — RTL component tests

- Renders the digit for a filled cell
- Applies bold/given styling vs normal/user styling correctly
- Renders pencil marks in correct 3×3 positions
- Renders nothing for an empty cell with no marks
- Applies correct CSS class for each `highlight` prop value

**Estimated test count:** +20–25 new tests → total ~285–290 (from 264).

---

## Acceptance Criteria

- Given a seeded puzzle in the store, the board renders all 81 cells with correct digit/given/user styling in both light and dark themes.
- `getHighlights()` correctly computes all four highlight tiers and respects priority ordering.
- All new tests pass; existing 264 tests continue to pass.
- `npm run typecheck` and `npm run lint` are clean.
