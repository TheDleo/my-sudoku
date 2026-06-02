# Design: Confetti Animation + Hints Used Stat

**Date:** 2026-06-01  
**Status:** Approved

---

## Overview

Two additions to the win experience:

1. **Hints Used** — track how many times the user pressed the Hint button per puzzle and display it in the Win Modal alongside mistakes and time.
2. **Confetti Animation** — a brief canvas-based "corner cannons" celebration fires when the win modal appears. Respects `prefers-reduced-motion`.

---

## 1. `hintsUsed` in Game State

### State change

Add `hintsUsed: number` (default `0`) to `GameState` in `src/game/types.ts` and `initialEmptyState` in `src/game/reducers.ts`.

### Reducer changes (`src/game/reducers.ts`)

- `loadPuzzle`: reset `hintsUsed: 0`.
- `requestHint`: increment `hintsUsed` by 1 unconditionally (user definition: every button press counts).

### Persistence (`src/game/persistence.ts`)

Add `hintsUsed: number` to `SerializedState`. Serialize and deserialize it alongside `mistakes` and `elapsedMs`. Deserialize with `?? 0` fallback so existing saves without the field are handled gracefully.

### Auto-save subscriber (`src/game/store.ts`)

Add `hintsUsed` to the equality check that guards the auto-save subscriber, so saves fire when hints are requested.

---

## 2. `Confetti.tsx`

**File:** `src/game/Confetti.tsx`

### Props

```ts
interface ConfettiProps {
  onDone: () => void;
}
```

### Behaviour

- On mount, check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. If true, call `onDone()` immediately and return `null`.
- Otherwise, render a `<canvas>` with `position: fixed; inset: 0; pointer-events: none; z-index: 200` (above the win backdrop at z-index 100).
- Resize canvas to `window.innerWidth × window.innerHeight` on mount.
- Launch two particle streams: one from the top-left corner (~10% from left), one from the top-right (~10% from right). Initial velocities arc downward and inward toward the center.
- Particles are a mix of small rectangles (8×4px) and circles (r=4px) in 6 colors: `#ff4f4f`, `#ffcc00`, `#4caf50`, `#2196f3`, `#e91e63`, `#ff9800`.
- Each particle has: position, velocity (with gravity), rotation, rotational velocity, color, shape, and alpha.
- Total particle count: ~120 (60 per cannon).
- Animation runs via `requestAnimationFrame`. After 2500ms, fade all particles to 0 alpha over ~400ms, then call `onDone()` and stop the loop.
- Clean up: cancel the animation frame and remove the canvas on unmount.

---

## 3. WinModal updates

**File:** `src/game/WinModal.tsx`

- Subscribe to `hintsUsed` from `useGameStore`.
- Add a stat line: `<p className="win-stat">Hints: {hintsUsed}</p>` between Mistakes and Time.
- Add local state: `const [showConfetti, setShowConfetti] = useState(true)`.
- Render `{showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}` as a sibling of the win card inside the backdrop div.

---

## 4. Tests

- `reducers.test.ts`: add cases for `requestHint` incrementing `hintsUsed`; `loadPuzzle` resetting it; multiple calls accumulating correctly.
- `persistence.test.ts`: add round-trip for `hintsUsed`; verify `?? 0` fallback for missing field.
- `WinModal.test.tsx`: add test asserting "Hints:" label renders with the store value.
- No unit tests for `Confetti.tsx` (canvas animation — covered by e2e/manual QA).

---

## Files to create/modify

| File                           | Change                                      |
| ------------------------------ | ------------------------------------------- |
| `src/game/types.ts`            | Add `hintsUsed: number` to `GameState`      |
| `src/game/reducers.ts`         | Init + reset + increment `hintsUsed`        |
| `src/game/persistence.ts`      | Serialize/deserialize `hintsUsed`           |
| `src/game/store.ts`            | Add `hintsUsed` to auto-save equality check |
| `src/game/Confetti.tsx`        | New — canvas corner-cannon animation        |
| `src/game/WinModal.tsx`        | Add Hints stat + render Confetti            |
| `src/game/reducers.test.ts`    | New test cases                              |
| `src/game/persistence.test.ts` | New round-trip cases                        |
| `src/game/WinModal.test.tsx`   | Assert Hints stat renders                   |
