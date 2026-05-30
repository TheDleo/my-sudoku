# Phase 24 — Mobile & Responsive Design

**Date:** 2026-05-30

## Overview

Fix two readability complaints on mobile: digits are too small on narrow phones, and the board is hard to read in dark mode. All changes are CSS-only — no logic, no new state, no new components.

## Changes

### 1. Cell digit font size — `src/game/Cell.css`

```css
/* Before */
font-size: clamp(0.875rem, 3vw, 1.5rem);

/* After */
font-size: clamp(1.125rem, 4vw, 1.5rem);
```

Raises the minimum from 14px to 18px. On a 375px iPhone SE the clamp minimum kicks in, giving each digit ~47% of its ~40px cell (up from ~37%). Max stays 24px on desktop.

### 2. Number pad font sizes — `src/game/NumberPad.css`

Two rules share `.number-pad__digit` and `.number-pad__erase`:

```css
/* Before: digit+erase shared rule */
font-size: clamp(0.875rem, 3vw, 1.25rem);

/* After */
font-size: clamp(1.125rem, 4vw, 1.25rem);
```

```css
/* Before: erase override */
font-size: clamp(1rem, 3.5vw, 1.5rem);

/* After */
font-size: clamp(1.125rem, 4vw, 1.5rem);
```

Raises the minimum to 18px on both, matching the board digit floor.

### 3. Mobile padding — `src/styles/global.css`

```css
@media (max-width: 420px) {
  main {
    padding: 0.5rem;
  }
}
```

Halves the side padding on narrow phones (from 1rem to 0.5rem per side), freeing ~16px of board width. On an iPhone SE the board grows from ~343px to ~359px.

### 4. Dark mode border and peer-cell tokens — `src/styles/tokens.css`

Applied to **both** the `html[data-theme='dark']` block and the `@media (prefers-color-scheme: dark)` block:

```css
/* Before */
--border: #2a2a2e;
--cell-peer: #1f1f23;

/* After */
--border: #606065;
--cell-peer: #252529;
```

`--border` at `#606065` makes thin inner cell lines clearly visible against `--cell-bg: #1c1c1f` while staying meaningfully darker than the thick 2px outer/box borders (which use `var(--fg): #e8e8e8`). `--cell-peer` at `#252529` adds just enough contrast to distinguish peer-highlighted cells from default cells.

## Files changed

| File                     | Change                                                       |
| ------------------------ | ------------------------------------------------------------ |
| `src/game/Cell.css`      | Bump cell font-size clamp                                    |
| `src/game/NumberPad.css` | Bump digit and erase font-size clamps                        |
| `src/styles/global.css`  | Add `@media (max-width: 420px)` padding reduction            |
| `src/styles/tokens.css`  | Update `--border` and `--cell-peer` in both dark mode blocks |

## Testing

CSS-only changes — no unit tests. Verify:

1. `npx vitest run` — all existing tests pass (no regressions)
2. Dev server at 375px viewport: board digits and number pad legibly sized in both light and dark mode
3. Dark mode: thin cell borders clearly visible, peer highlighting distinguishable
