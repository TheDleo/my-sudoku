# Phase 22 — Win Detection Design

**Date:** 2026-05-30

## Overview

When the player places the final correct digit, a win modal appears over the completed board. The modal shows a congratulations message, difficulty, mistakes, and elapsed time. The player can start a new game or dismiss the modal to see the board.

## State

### New field: `won: boolean`

Added to `GameState` (default `false`). Not persisted — resuming a completed puzzle shows the board cleanly with no modal.

Added to `GameStore`: `dismissWin: () => void`.

### Why `won` rather than extending `screen`

`screen` is navigation state (`'landing' | 'game'`). `won` is game outcome state. Keeping them separate avoids conflating the two concerns and makes each independently readable.

## Reducers

### `placeDigit` (modified)

After placing a digit, call `isSolved(nextCells, state.puzzle.solution)`. If true, return state with `won: true`. The check is O(81) and only runs in `placeDigit` — the only mutation that can complete the puzzle.

```ts
function isSolved(cells: Cell[][], solution: SolvedGrid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (cells[r]![c]!.value !== solution[r]![c]) return false;
    }
  }
  return true;
}
```

### `loadPuzzle` (modified)

Add `won: false` to the returned state (already resets all other fields).

### `dismissWin` (new)

```ts
export function dismissWin(state: GameState): GameState {
  return { ...state, won: false };
}
```

### `initialEmptyState` (modified)

Add `won: false`.

## Component: WinModal

**Files:** `src/game/WinModal.tsx`, `WinModal.css`, `WinModal.test.tsx`

Co-located with other game components. Follows the same CSS variable and class-naming conventions as existing components.

### Structure

Backdrop (full-viewport overlay) + centered card:

```
┌─────────────────────────┐
│   Puzzle Complete!      │
│   Hard                  │
│                         │
│   Mistakes: 2           │
│   Time: 3:47            │
│                         │
│  [New Game]  [Close]    │
└─────────────────────────┘
```

- Heading: "Puzzle Complete!"
- Difficulty label from `puzzle.difficulty`
- Mistakes: `{mistakes} mistake(s)`
- Time: `formatTime(elapsedMs)` → `M:SS` (e.g. `0:00` until timer is wired)
- **"New Game"** → `setScreen('landing')`
- **"Close"** → `dismissWin()`
- Backdrop click → `dismissWin()` (card click stops propagation)

### Time formatting

Private helper in `WinModal.tsx`:

```ts
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

## App integration

`App` adds one conditional render:

```tsx
{
  won && screen === 'game' && <WinModal />;
}
```

No structural changes to `App` needed.

## Persistence

`won` is NOT added to `SerializedState`. The auto-save subscriber in `store.ts` does not need to change — `won` is not in the fields it watches.

## Testing

### `reducers.test.ts` additions

- `placeDigit` sets `won: true` when the last cell matches the solution
- `placeDigit` leaves `won: false` when puzzle is not yet complete
- `loadPuzzle` resets `won: false`
- `dismissWin` sets `won: false`

### `WinModal.test.tsx`

- Renders when `won: true, screen: 'game'`
- Shows difficulty, formatted mistakes, and time
- "New Game" button calls `setScreen('landing')`
- "Close" button calls `dismissWin()`
- Backdrop click calls `dismissWin()`

## Files changed

| File                         | Change                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/game/types.ts`          | Add `won: boolean` to `GameState`; add `dismissWin` to `GameStore`                              |
| `src/game/reducers.ts`       | Add `isSolved` helper; update `placeDigit`, `loadPuzzle`, `initialEmptyState`; add `dismissWin` |
| `src/game/store.ts`          | Wire `dismissWin` action                                                                        |
| `src/game/WinModal.tsx`      | New component                                                                                   |
| `src/game/WinModal.css`      | New styles                                                                                      |
| `src/game/WinModal.test.tsx` | New tests                                                                                       |
| `src/app.tsx`                | Render `<WinModal />` when `won && screen === 'game'`                                           |
