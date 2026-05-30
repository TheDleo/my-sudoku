# Phase 21: Landing Screen and New Game Flow — Design Spec

## Goal

Make the app playable end-to-end: a landing modal lets users pick a difficulty (or resume a saved game), loads a real generated puzzle from the worker, and a header button allows starting a new game mid-puzzle.

## Out of scope

- First-time tooltips on Hint/Pencil buttons (deferred to after Phases 18–20)
- Keyboard: Enter starts highlighted difficulty (deferred)
- Win state / completion detection (Phase 22)
- Timer display (Phase 19)

---

## Architecture

### `screen` state

`GameState` gains `screen: 'landing' | 'game'`. `initialEmptyState` has `screen: 'landing'`. Persistence always deserializes to `screen: 'landing'` — reloading always shows the landing first.

`loadPuzzle` preserves the current `screen` value from `state` (since it is immediately followed by `setScreen('game')` in the store action). Note: this requires renaming the unused `_state` parameter to `state` in `reducers.ts`.

Two new store actions:

- `setScreen(s: 'landing' | 'game')` — simple reducer, dispatched explicitly
- `resumeGame()` — store-level action that calls `persistence.load()` and merges the saved state with `screen: 'game'`

### Worker client singleton

`src/generator/client.ts` exports:

```ts
export const workerClient = createWorkerClient();
```

Pre-generation of all 4 difficulties begins at module import time. By the time the user picks a difficulty, the puzzle is almost certainly ready in cache.

### `LandingScreen` overlay

Conditionally rendered when `screen === 'landing'`. On render checks `persistence.load()` — if it returns a non-null state with `puzzle.id !== ''`, a "Resume" button is shown alongside the 4 difficulty buttons.

**Difficulty flow:** `workerClient.getPuzzle(difficulty)` → `store.loadPuzzle(puzzle)` → `store.setScreen('game')`. While awaiting the promise the clicked button shows a brief "Generating…" disabled state.

**Resume flow:** `store.resumeGame()` (restores full saved state with `screen: 'game'`).

### `GameHeader`

Rendered above `<Board />` when `screen === 'game'`. Shows the current puzzle difficulty as a human-readable label (`Easy`, `Medium`, `Hard`, `Expert`) and a "New Game" button. Clicking "New Game" shows `window.confirm('Start a new game? Your current progress will be lost.')`. If confirmed: `store.setScreen('landing')`.

---

## File Map

| File                                 | Action | Responsibility                                                                                                    |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/generator/client.ts`            | Create | Module-level `workerClient` singleton                                                                             |
| `src/game/types.ts`                  | Modify | Add `screen` to `GameState`; `setScreen`/`resumeGame` to `GameStore`                                              |
| `src/game/reducers.ts`               | Modify | Add `screen: 'landing'` to `initialEmptyState`; update `loadPuzzle` to preserve `screen`; add `setScreen` reducer |
| `src/game/reducers.test.ts`          | Modify | 2 tests for `setScreen`                                                                                           |
| `src/game/store.ts`                  | Modify | Wire `setScreen` and `resumeGame` actions                                                                         |
| `src/landing/LandingScreen.tsx`      | Create | Difficulty picker + optional Resume                                                                               |
| `src/landing/LandingScreen.css`      | Create | Full-screen modal overlay styles                                                                                  |
| `src/landing/LandingScreen.test.tsx` | Create | RTL tests                                                                                                         |
| `src/game/GameHeader.tsx`            | Create | Difficulty label + New Game button                                                                                |
| `src/game/GameHeader.css`            | Create | Header styles                                                                                                     |
| `src/game/GameHeader.test.tsx`       | Create | Tests                                                                                                             |
| `src/app.tsx`                        | Modify | Render `<LandingScreen />` and `<GameHeader />`                                                                   |

---

## Component Details

### `LandingScreen`

```
┌─────────────────────────────┐
│         Sudoku              │
│                             │
│  [Resume]  ← only if saved  │
│                             │
│  [Easy]  [Medium]           │
│  [Hard]  [Expert]           │
└─────────────────────────────┘
```

Full-screen fixed overlay (`position: fixed; inset: 0; z-index: 100`) with a centred content card. Uses `--bg`, `--surface`, `--fg`, `--border` tokens.

### `GameHeader`

```
┌─────────────────────────────┐
│  Medium           [New Game]│
└─────────────────────────────┘
```

`width: min(100%, 500px)` matching the board. Difficulty label on the left, New Game button on the right.

---

## Testing

### `reducers.test.ts`

- `setScreen('game')` sets `screen` to `'game'`
- `setScreen('landing')` sets `screen` to `'landing'`

### `LandingScreen.test.tsx`

- Renders 4 difficulty buttons
- No "Resume" button when `persistence.load()` returns null
- Shows "Resume" button when a non-sentinel saved game exists
- Clicking "Easy" calls `workerClient.getPuzzle('easy')`, then `loadPuzzle`, then `setScreen('game')`
- Clicking "Resume" calls `resumeGame`

### `GameHeader.test.tsx`

- Renders the puzzle difficulty label
- Renders "New Game" button
- Clicking "New Game" with `window.confirm` returning `true` calls `setScreen('landing')`
- Clicking "New Game" with `window.confirm` returning `false` does not change screen

---

## Acceptance Criteria

- `npx vitest run` — all tests pass (~412 existing + ~9 new ≈ 421 total)
- `npm run typecheck` — clean
- Fresh load (no localStorage): landing screen shows, difficulty pick generates and starts a puzzle
- Reload with saved game: landing shows with Resume button; Resume restores the mid-game state
- Mid-game "New Game" → confirm → landing screen; cancel → stays in game
- No regressions in any earlier-phase tests
