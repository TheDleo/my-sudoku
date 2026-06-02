# Design: Phase 23 Accessibility Pass

**Date:** 2026-06-01  
**Status:** Approved

---

## Overview

Four targeted changes bring the app to the WCAG AA / ARIA baseline defined in §6 of PLAN.md:

1. **Cell ARIA labels** — every cell is described for screen readers
2. **Live region announcer** — hint technique names are announced at level 2
3. **Focus rings + modal focus management** — keyboard navigation is fully visible
4. **WinModal dialog role** — the win modal is properly labelled as a dialog

`prefers-reduced-motion` is already handled (global.css blanket rule + Confetti component check) — no changes needed.

---

## 1. Cell ARIA Labels

**File:** `src/game/Cell.tsx`

Each cell `<div>` receives:

- `role="gridcell"` (pairs with the board's existing `role="grid"`)
- `aria-label` computed from the cell's state:

| State                         | Label                                 |
| ----------------------------- | ------------------------------------- |
| Given digit 5 at row 3, col 7 | `"Row 3, column 7, given 5"`          |
| User-placed digit 5           | `"Row 3, column 7, your 5"`           |
| Pencil marks 1, 4, 7          | `"Row 3, column 7, candidates 1 4 7"` |
| Empty                         | `"Row 3, column 7, empty"`            |

Row and column numbers are 1-indexed (matching human-readable convention).

The `aria-label` is computed as a function `cellAriaLabel(row, col, cell, isGiven): string` co-located in `Cell.tsx`.

**Tests:** Add unit tests for `cellAriaLabel` covering all four states.

---

## 2. Live Region Announcer

**New file:** `src/game/Announcer.tsx`

A visually-hidden `<div>` with `aria-live="polite"` and `aria-atomic="true"`. Rendered once in `App.tsx`.

Internally subscribes to `useGameStore` — when `hintLevel` changes to `2` and `currentHint` is non-null, sets announcement text to:

> `"Hint: {TECHNIQUE_LABELS[currentHint.technique]}. Press Show more for details."`

When the hint is dismissed (`currentHint` becomes null) or a new puzzle loads, clears to empty string.

The `sr-only` positioning (visually hidden but present in the accessibility tree):

```css
position: absolute;
width: 1px;
height: 1px;
padding: 0;
margin: -1px;
overflow: hidden;
clip: rect(0, 0, 0, 0);
white-space: nowrap;
border: 0;
```

Added as `.sr-only` to `global.css`.

**Tests:** Test the `Announcer` by asserting the hidden element's text content under store state transitions (hintLevel 1→2 with a hint, hint dismiss).

---

## 3. Focus Rings + Modal Focus Management

### 3a. Global focus ring

Add to `src/styles/global.css`:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

This applies to all interactive elements (buttons, the board div, number pad buttons) automatically.

### 3b. TechniqueExplainer focus management

**File:** `src/hints/TechniqueExplainer.tsx`

Current: focuses the card div (`cardRef.current?.focus()`).  
Change: add a `closeRef` to the close button and focus that instead (`closeRef.current?.focus()`).

Remove `outline: none` from `src/hints/TechniqueExplainer.css` (the card no longer receives programmatic focus).

### 3c. SettingsModal focus management

**File:** `src/settings/SettingsModal.tsx`

Current: no programmatic focus management.  
Change: add a `useEffect` that focuses the close button when the modal opens.

Remove `outline: none` from `src/settings/SettingsModal.css`.

### 3d. WinModal focus management

**File:** `src/game/WinModal.tsx`

Current: no focus management.  
Change: add a `useEffect` that focuses the "New Game" button on mount.

---

## 4. WinModal Dialog Role

**File:** `src/game/WinModal.tsx`

Add to the win card div:

```tsx
role="dialog"
aria-modal="true"
aria-labelledby="win-modal-title"
```

Add `id="win-modal-title"` to the `<h2 className="win-title">` element.

---

## Files to Create / Modify

| File                               | Change                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `src/game/Cell.tsx`                | Add `role="gridcell"` + `aria-label`; extract `cellAriaLabel` helper |
| `src/game/Cell.test.tsx`           | Add unit tests for `cellAriaLabel` (4 cases) — file already exists   |
| `src/game/Announcer.tsx`           | New — `aria-live="polite"` announcer component                       |
| `src/game/Announcer.test.tsx`      | New — tests for announcement text transitions                        |
| `src/App.tsx`                      | Render `<Announcer />`                                               |
| `src/styles/global.css`            | Add `.sr-only` class + `:focus-visible` rule                         |
| `src/hints/TechniqueExplainer.tsx` | Focus close button instead of card on open                           |
| `src/hints/TechniqueExplainer.css` | Remove `outline: none`                                               |
| `src/settings/SettingsModal.tsx`   | Focus close button on open                                           |
| `src/settings/SettingsModal.css`   | Remove `outline: none`                                               |
| `src/game/WinModal.tsx`            | Add dialog role + aria-labelledby + focus New Game button            |

---

## Out of Scope

- Full WCAG AA contrast audit (dark mode `--cell-peer` is known marginal; left for a dedicated colour pass)
- Axe Playwright integration (deferred to Phase 25 final QA)
- LandingScreen focus management (no modal/dialog present)
