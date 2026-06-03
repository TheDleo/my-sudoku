# Design: Mobile Layout Improvements

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Three targeted layout changes to improve the mobile experience:

1. **Title row** — h1 "Sudoku" + ⚙ Settings + New Game all on one row inside `GameHeader`
2. **ActionBar** — remove Settings (moved to title row), color buttons icon-only, all items visible without scrolling
3. **NumberPad** — two rows (1–5 top, 6–9 + erase bottom) for ~double the tap-target width

---

## 1. Title row (GameHeader)

**File:** `src/game/GameHeader.tsx` + `src/game/GameHeader.css`

`GameHeader` gains an h1 and the Settings button. Layout becomes two rows:

**Row 1 — `game-header__top`:**

```
[ ⚙ ]    Sudoku    [ New Game ]
```

- Settings button (icon only, `⚙`) flush left
- `<h1>` centered via `flex: 1; text-align: center`, font-size `1.25rem`
- New Game button flush right, smaller padding (`min-height: 36px`)

**Row 2 — `game-header__stats`:**

```
Easy   0:41   ✕0
```

- Centered, `font-size: 0.75rem`, `color: var(--fg-muted)`
- Conditional on settings: timer and mistakes shown/hidden as before

**`SettingsModal`** and its `isSettingsOpen` state move from `ActionBar` into `GameHeader`.

**`App.tsx`:** Remove the standalone `<h1>Sudoku</h1>`. The game screen gets it from `GameHeader`; the landing screen already has its own `.landing-title`. The `h1` global style in `global.css` can be removed or scoped to `GameHeader`.

---

## 2. ActionBar

**File:** `src/game/ActionBar.tsx` + `src/game/ActionBar.css`

- **Remove** the Settings button (`action-bar__settings`) and `SettingsModal` import — Settings is now in GameHeader.
- **Color buttons** drop the letter label: `🔵 A` → `🔵`, `🟡 B` → `🟡`. Add `aria-label="Color A"` and `aria-label="Color B"` to preserve accessibility (the emoji alone is not a reliable accessible name). Width: `flex: 0 0 44px`.
- **Text buttons** (Pencil, Candidates, Undo, Redo) keep their labels; `flex: 1` so they share remaining space equally.
- With 6 items instead of 7, and two items being compact 44px icons, all buttons fit on a 390px screen without scrolling.

---

## 3. NumberPad

**File:** `src/game/NumberPad.tsx` + `src/game/NumberPad.css`

Split into two flex rows inside a column wrapper:

- **Row 1:** digits 1–5 (`flex: 1` each)
- **Row 2:** digits 6–9 + Erase (`flex: 1` each)

Each button gains more width (~66px on 390px vs ~37px currently) while keeping `min-height: 52px` for a generous tap target. The remaining-count sub-label stays.

```tsx
<div className="number-pad">
  <div className="number-pad__row">{/* digits 1–5 */}</div>
  <div className="number-pad__row">{/* digits 6–9 + erase */}</div>
</div>
```

---

## Files to Create / Modify

| File                      | Change                                                          |
| ------------------------- | --------------------------------------------------------------- |
| `src/game/GameHeader.tsx` | Add h1, Settings button + SettingsModal state; two-row layout   |
| `src/game/GameHeader.css` | Add `.game-header__top` and `.game-header__stats` layout styles |
| `src/game/ActionBar.tsx`  | Remove Settings; color buttons icon-only                        |
| `src/game/ActionBar.css`  | Color buttons `flex: 0 0 44px`                                  |
| `src/game/NumberPad.tsx`  | Two-row layout                                                  |
| `src/game/NumberPad.css`  | `.number-pad__row` flex row; `min-height: 52px`                 |
| `src/App.tsx`             | Remove `<h1>Sudoku</h1>`                                        |
| `src/styles/global.css`   | Remove the global `h1 { font-size: 2rem; margin: 0; }` rule     |

---

## Out of Scope

- Desktop layout (unchanged — these changes only affect the small-screen experience)
- LandingScreen layout (has its own title, unaffected)
- HintPanel layout (unchanged)
