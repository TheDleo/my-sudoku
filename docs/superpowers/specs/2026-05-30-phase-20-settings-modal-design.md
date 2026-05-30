# Phase 20: Settings Modal — Design Spec

**Date:** 2026-05-30
**Phase:** 20
**Status:** Approved

---

## Overview

Expose all user-configurable settings through a gear-icon modal. Settings persist independently of game state in their own localStorage key and survive new games. A separate Zustand store owns settings; the game store reads from it at action time.

---

## 1. Settings Types

**File:** `src/settings/types.ts`

```ts
export type Theme = 'auto' | 'light' | 'dark';

export type Settings = {
  autoCandidates: boolean; // default false
  possiblePlacements: boolean; // default true
  showTimer: boolean; // default true
  showMistakes: boolean; // default true
  theme: Theme; // default 'auto'
};
```

`seenHintTooltip` and `seenPencilTooltip` (from the original plan spec) are deferred — no tooltip UI exists yet. They will be added in Phase 23 or as a follow-up.

---

## 2. Settings Store

**File:** `src/settings/store.ts`

- Zustand store using the built-in `persist` middleware.
- localStorage key: `'sudoku-settings'`.
- Single action: `updateSetting<K extends keyof Settings>(key: K, value: Settings[K])`.
- Defaults: `autoCandidates: false`, `possiblePlacements: true`, `showTimer: true`, `showMistakes: true`, `theme: 'auto'`.
- Separate from game state — survives `loadPuzzle` and new games without reset.

---

## 3. Theme Module

**File:** `src/settings/theme.ts`

`applyTheme(theme: Theme): void` — pure function. Sets `document.documentElement.dataset.theme`:

- `'light'` → always `data-theme="light"`
- `'dark'` → always `data-theme="dark"`
- `'auto'` → clears the attribute entirely, letting the `@media (prefers-color-scheme: dark)` block in `tokens.css` take effect

`useThemeSync()` — a React hook called in `App`. Runs a `useEffect` that:

1. Subscribes to the settings store and calls `applyTheme` whenever `theme` changes.
2. Attaches a `matchMedia` listener for `prefers-color-scheme` changes so `'auto'` mode reacts to OS changes at runtime.

`applyTheme` is also called once synchronously at app startup (before first render) in `src/main.tsx` to prevent a flash of the wrong theme.

---

## 4. Settings Modal

**Files:** `src/settings/SettingsModal.tsx`, `src/settings/SettingsModal.css`

### Modal state

Open/close state is a `useState<boolean>` inside `ActionBar`. The gear button sets it to `true`. `ActionBar` renders `<SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />` inline. No React portal — `position: fixed` handles visual stacking.

### Structure

Matches the `WinModal` pattern: full-viewport backdrop (`position: fixed`, semi-transparent) that closes on click, containing a centered card that stops propagation. An × close button sits in the top-right corner of the card.

### Contents

```
Settings                              [×]
────────────────────────────────────────
Auto-candidates                [toggle]
Possible placements            [toggle]
Show timer                     [toggle]
Show mistakes                  [toggle]
────────────────────────────────────────
Theme
  [Auto]  [Light]  [Dark]   ← segmented button group
```

Toggle rows use a CSS-only switch (`<input type="checkbox">`, visually styled). Each toggle calls `updateSetting(key, !value)` on change.

The theme picker is a 3-button segmented control (radio semantics). Each option calls `updateSetting('theme', value)`.

### Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-label="Settings"` on the card.
- Escape key closes the modal (keydown listener while open).
- Focus moves to the modal card on open; returns to the gear button on close.

---

## 5. Integration Changes

### `src/game/GameHeader.tsx`

- Reads `showTimer` and `showMistakes` from the settings store.
- Timer span renders only when `showTimer` is true.
- Mistakes renders as a new span (e.g. `✕ {mistakes}`) only when `showMistakes` is true.
- Final header layout: `Expert · 02:14 · ✕3 · New Game` — each stat conditionally omitted.

### `src/game/ActionBar.tsx`

- Adds a gear button (⚙) at the right end of the action bar.
- Hides the "Candidates" button when `autoCandidates` is true (reads from settings store).
- Holds `isSettingsOpen` state; renders `<SettingsModal isOpen={...} onClose={...} />`.

### `src/game/highlights.ts`

- `getHighlights` gains a `possiblePlacements: boolean` parameter.
- When `false`, skips computing the `possible` highlight tier entirely.
- **`src/game/Board.tsx`** passes `useSettingsStore(s => s.possiblePlacements)` when calling `getHighlights`.

### `src/game/store.ts`

After `placeDigit`, `eraseCell`, `undo`, and `redo`: if `useSettingsStore.getState().autoCandidates` is true, also apply `reducers.fillCandidates` to the resulting state. This keeps candidates in sync after every board mutation without making reducers aware of settings.

When `autoCandidates` is toggled ON, `game/store.ts` detects the change via a `useSettingsStore.subscribe` listener and calls `fillCandidates()` immediately to populate existing empty cells. The listener lives in `game/store.ts` (not `settings/store.ts`) to keep the import direction one-way: game → settings.

### `src/app.tsx`

Calls `useThemeSync()` at the top of `App` to wire up the theme side-effect.

### `src/main.tsx`

Calls `applyTheme(useSettingsStore.getState().theme)` once before `ReactDOM.createRoot(...).render(...)` to apply the persisted theme before the first paint.

---

## 6. Files Created / Modified

| Action | File                             |
| ------ | -------------------------------- |
| Create | `src/settings/types.ts`          |
| Create | `src/settings/store.ts`          |
| Create | `src/settings/theme.ts`          |
| Create | `src/settings/SettingsModal.tsx` |
| Create | `src/settings/SettingsModal.css` |
| Modify | `src/game/GameHeader.tsx`        |
| Modify | `src/game/GameHeader.css`        |
| Modify | `src/game/ActionBar.tsx`         |
| Modify | `src/game/ActionBar.css`         |
| Modify | `src/game/highlights.ts`         |
| Modify | `src/game/Board.tsx`             |
| Modify | `src/game/store.ts`              |
| Modify | `src/app.tsx`                    |
| Modify | `src/main.tsx`                   |

---

## 7. Testing

- **`src/settings/store.test.ts`** — defaults correct; `updateSetting` mutates the right key; persist round-trip is lossless.
- **`src/settings/theme.test.ts`** — `applyTheme('light')` sets attribute; `applyTheme('dark')` sets attribute; `applyTheme('auto')` clears it.
- **`src/settings/SettingsModal.test.tsx`** — renders closed when `isOpen=false`; renders open when `isOpen=true`; Escape closes; backdrop click closes; each toggle calls `updateSetting` with the right args; theme buttons call `updateSetting('theme', ...)`.
- **`src/game/highlights.test.ts`** — `possiblePlacements: false` produces no `possible` highlights.
- **`src/game/GameHeader.test.tsx`** — timer hidden when `showTimer=false`; mistakes hidden when `showMistakes=false`; mistakes shown with correct count when `showMistakes=true`.
- **`src/game/ActionBar.test.tsx`** — gear button present; Candidates button absent when `autoCandidates=true`; Candidates button present when `autoCandidates=false`; gear click opens modal.
- **`src/game/store.test.ts`** (extended) — `placeDigit` with `autoCandidates=true` recomputes candidates for peers; `fillCandidates` called on toggle-ON.

---

## 8. Out of Scope

- `seenHintTooltip` / `seenPencilTooltip` settings fields (deferred to Phase 23).
- Pause/resume timer UI (timer always counts when game is running; pause button not in scope for this phase).
- React portal for the modal (not needed; `position: fixed` suffices).
