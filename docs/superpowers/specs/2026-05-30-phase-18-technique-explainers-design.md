# Phase 18: Technique Explainers — Design Spec

**Date:** 2026-05-30
**Phase:** 18
**Status:** Approved

---

## Overview

Add a "What is this?" link to the HintPanel at hint levels 2 and 3. Clicking it opens a per-technique explainer modal with a short prose summary and a hand-crafted SVG diagram. All 16 techniques get an explainer. Content lives in a single data file; the modal is a thin lookup-and-render layer.

---

## 1. Files Created / Modified

| Action | File                                    |
| ------ | --------------------------------------- |
| Create | `src/hints/explainers/index.tsx`        |
| Create | `src/hints/TechniqueExplainer.tsx`      |
| Create | `src/hints/TechniqueExplainer.css`      |
| Create | `src/hints/TechniqueExplainer.test.tsx` |
| Modify | `src/hints/HintPanel.tsx`               |
| Modify | `src/hints/HintPanel.css`               |
| Modify | `src/hints/HintPanel.test.tsx`          |

---

## 2. Content Data Structure

**File:** `src/hints/explainers/index.tsx`

(Must be `.tsx` because the `Diagram` components contain JSX.)

```ts
import type { TechniqueName } from '../../solver/types';

export type ExplainerContent = {
  title: string;      // human-readable name, e.g. "Naked Single"
  summary: string;    // 1–3 sentences of plain text
  Diagram: React.FC;  // JSX SVG component
};

export const EXPLAINERS: Record<TechniqueName, ExplainerContent> = {
  nakedSingle: { ... },
  hiddenSingle: { ... },
  // ... 14 more
};
```

All 16 `TechniqueName` values must have entries. A test enforces exhaustiveness.

The `title` field mirrors `TECHNIQUE_LABELS` in `engine.ts` but is not imported from there — both key on `TechniqueName` and stay in sync naturally.

### SVG Diagram Conventions

Each `Diagram` is a React functional component rendering a `<svg viewBox="0 0 120 120">` (or up to `160 160` for complex expert techniques). Diagrams use CSS custom properties for colours so they respond to light/dark theme automatically:

- `fill="var(--cell-bg)"` — empty cell background
- `fill="var(--cell-selected)"` — key/target cell highlight (blue)
- `fill="var(--cell-hint)"` — secondary highlighted cell (light blue)
- `stroke="var(--border)"` — grid lines
- `fill="var(--accent)"` — placed digit colour
- `fill="var(--fg-muted)"` — candidate digits, annotation text
- `fill="var(--cell-conflict)"` — eliminated-candidate annotation (where used)

Diagrams show a schematic fragment of the board — typically a 3×3 box or a 3×9 row/column strip, not a full 9×9 grid. They label key cells with digit values or small candidate text. They are not pixel-perfect; they are illustrative.

### Summary Text (all 16 techniques)

| Technique          | Summary                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Naked Single       | A cell where only one digit is possible. Every other digit has been eliminated by the cell's row, column, or box. When you find one, place the digit.                                                                             |
| Hidden Single      | A digit that can only go in one cell within a row, column, or box — even though that cell may appear to have multiple candidates. Scan each unit for a digit that appears as a candidate in exactly one cell.                     |
| Naked Pair         | Two cells in the same unit that together contain exactly two candidates, and those candidates are the same two digits. Those digits can be eliminated from all other cells in that unit.                                          |
| Naked Triple       | Three cells in a unit whose candidates are a subset of three digits. The same three digits can be eliminated from every other cell in that unit.                                                                                  |
| Hidden Pair        | Two digits that appear as candidates in exactly two cells within a unit. All other candidates in those two cells can be eliminated.                                                                                               |
| Hidden Triple      | Three digits that appear only in three cells within a unit. All other candidates in those three cells can be eliminated.                                                                                                          |
| Pointing Pair      | Two cells in the same box that are the only cells in that box where a digit can go, and both cells are also in the same row or column. That digit can be eliminated from the rest of that row or column outside the box.          |
| Naked Quad         | Four cells in a unit whose candidates are a subset of four digits. Those four digits can be eliminated from all other cells in the unit.                                                                                          |
| Hidden Quad        | Four digits that appear only in four cells within a unit. All other candidates in those four cells can be eliminated.                                                                                                             |
| X-Wing             | A digit that appears as a candidate in exactly two cells in each of two rows, and those cells share the same two columns. The digit can be eliminated from all other cells in those two columns.                                  |
| Box-Line Reduction | A digit that is confined to one box within a row or column. It can be eliminated from all other cells in that box outside the row or column.                                                                                      |
| Swordfish          | Like X-Wing but across three rows and three columns. A digit that appears in exactly two or three cells in each of three rows, all confined to the same three columns. Eliminate the digit from all other cells in those columns. |
| XY-Wing            | Three cells forming a chain: a pivot cell with candidates XY, and two wings with candidates XZ and YZ. Any cell that sees both wings cannot contain Z.                                                                            |
| XYZ-Wing           | Like XY-Wing but the pivot contains three candidates XYZ. The pivot and both wings share candidate Z. Any cell that sees all three cannot contain Z.                                                                              |
| Coloring           | Assign alternating colours to a digit's conjugate pairs (cells forced to be opposites). If two same-coloured cells see each other, that colour is wrong — eliminate the digit from all cells of that colour.                      |
| Unique Rectangle   | A pattern of four cells forming a rectangle across two boxes, with the same two candidates. Allowing both candidates in all four cells would create two solutions; use this to make eliminations that preserve uniqueness.        |

---

## 3. TechniqueExplainer Modal

**Files:** `src/hints/TechniqueExplainer.tsx`, `src/hints/TechniqueExplainer.css`

### Props

```ts
type Props = {
  technique: TechniqueName | null;
  onClose: () => void;
};
```

Returns `null` when `technique` is `null`.

### Structure

Follows the `WinModal` / `SettingsModal` pattern:

- Full-viewport fixed backdrop (`z-index: 100`, semi-transparent) — click closes
- Centered card that stops propagation
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title heading
- × close button (`aria-label="Close"`)
- Escape key closes via `document` keydown listener in `useEffect`
- Focus moves to the card on open (`tabIndex={-1}`, `cardRef.current?.focus()`)

### Layout

```
[×]
Naked Single
────────────────────────────
[Diagram — ~120×120px SVG, centered]
────────────────────────────
A cell where only one digit
is possible. Every other digit
has been eliminated by its
row, column, or box.
```

The diagram is rendered between the title and the summary text. It is centered horizontally.

---

## 4. HintPanel Changes

At **hint levels 2 and 3**, a "What is this?" button (styled as an inline link) appears inline with the technique name. Clicking it sets `explainerTechnique` local state to the current technique name, rendering `<TechniqueExplainer>`.

At **level 1**: no link (technique name not yet revealed).
At **level 4**: no link (explanation already shown inline; user is about to apply the hint).

### State

```ts
const [explainerTechnique, setExplainerTechnique] = useState<TechniqueName | null>(null);
```

Local to `HintPanel`. No store changes.

### Rendered shape at level 2

```
[×]  Naked Single  [What is this?]     [Show more]
```

The "What is this?" element is a `<button>` with class `hint-panel__explainer-link`, styled as an inline underlined link (no border, no background, `color: var(--accent)`, `text-decoration: underline`, `cursor: pointer`).

---

## 5. Testing

### `src/hints/TechniqueExplainer.test.tsx`

- Renders nothing when `technique` is `null`
- Renders dialog when `technique` is `'nakedSingle'`
- Renders the correct title for the technique
- Renders an `<svg>` element (diagram present)
- Close button calls `onClose`
- Backdrop click calls `onClose`
- Card click does not call `onClose`
- Escape key calls `onClose`

### `src/hints/HintPanel.test.tsx` (additions)

- "What is this?" link is present at level 2
- "What is this?" link is present at level 3
- "What is this?" link is absent at level 1
- "What is this?" link is absent at level 4
- Clicking "What is this?" at level 2 opens the explainer dialog
- Closing the explainer dialog hides it

### `src/hints/explainers/index.test.tsx` (test file)

- All 16 `TechniqueName` values have an entry in `EXPLAINERS` (exhaustiveness check)
- Each entry has a non-empty `title` and `summary`
- Each entry has a `Diagram` function

---

## 6. Out of Scope

- Linking to external resources (e.g. Sudoku wiki pages)
- Animated diagrams
- Diagrams reusing the actual live board component
- Any changes to the hint engine or game store
