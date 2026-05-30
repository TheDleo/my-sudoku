# Phase 19 — Timer Design

**Date:** 2026-05-30

## Overview

Wire up a live elapsed-time counter that runs while the player is solving a puzzle. The time is displayed in `GameHeader` during play and on the `WinModal` at the end. The timer stops permanently when the puzzle is won.

## State

### Existing: `elapsedMs: number`

Already in `GameState`, already persisted, already reset to `0` by `loadPuzzle`. No new state fields needed.

### New reducer: `tickTimer`

```ts
export function tickTimer(state: GameState): GameState {
  return { ...state, elapsedMs: state.elapsedMs + 1000 };
}
```

New action `tickTimer: () => void` on `GameStore`.

## `formatTime` extraction

`formatTime(ms: number): string` moves from its current private location in `WinModal.tsx` to `src/game/helpers.ts` as an exported function. Both `WinModal.tsx` and `GameHeader.tsx` import it from there.

```ts
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

No hour cap — minutes grow unbounded (e.g. `3661000` → `"61:01"`).

## GameHeader changes

### Timer display

Subscribe to `elapsedMs` and render `formatTime(elapsedMs)` between the difficulty label and the New Game button.

### Timer driver

```ts
useEffect(() => {
  if (won) return;
  const id = setInterval(() => useGameStore.getState().tickTimer(), 1000);
  return () => clearInterval(id);
}, [won]);
```

- `GameHeader` only renders when `screen === 'game'`, so the effect is naturally scoped to in-game time.
- When `won` becomes `true`, the effect re-runs: cleanup clears the old interval, new run hits `if (won) return` and starts nothing. Timer is permanently stopped.
- When `screen` changes to `'landing'`, `GameHeader` unmounts and the cleanup clears the interval. `elapsedMs` is preserved in persisted state.
- On `resumeGame`, `elapsedMs` is loaded from localStorage and the timer continues from where it left off.

## Persistence

No changes needed. `elapsedMs` is already in `SerializedState` and included in `serialize`/`deserialize`.

## Testing

### `reducers.test.ts` additions

- `tickTimer` increments `elapsedMs` by 1000

### `helpers.test.ts` additions

- `formatTime(0)` → `"0:00"`
- `formatTime(59000)` → `"0:59"`
- `formatTime(60000)` → `"1:00"`
- `formatTime(227000)` → `"3:47"`
- `formatTime(3661000)` → `"61:01"`

### `GameHeader.test.tsx` additions

Using `vi.useFakeTimers()` / `vi.useRealTimers()`:

- Timer increments `elapsedMs` by 1000 per second (advance 3 seconds → `elapsedMs === 3000`)
- Timer stops when `won` becomes `true` (run 2 seconds, set `won: true`, advance 3 more → `elapsedMs` stays at `2000`)

### `WinModal.test.tsx`

No changes needed — the time display tests already pass with `formatTime` imported from helpers.

## Files changed

| File                           | Change                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `src/game/types.ts`            | Add `tickTimer: () => void` to `GameStore`                                       |
| `src/game/reducers.ts`         | Add `tickTimer` reducer                                                          |
| `src/game/store.ts`            | Wire `tickTimer` action                                                          |
| `src/game/helpers.ts`          | Add exported `formatTime` function                                               |
| `src/game/helpers.test.ts`     | Add `formatTime` tests                                                           |
| `src/game/WinModal.tsx`        | Import `formatTime` from `./helpers` instead of local definition                 |
| `src/game/GameHeader.tsx`      | Add `elapsedMs` selector, `won` selector, `useEffect` timer driver, time display |
| `src/game/GameHeader.test.tsx` | Add fake-timer tests                                                             |
| `src/game/reducers.test.ts`    | Add `tickTimer` test                                                             |
