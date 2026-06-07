# Auto-candidates side effects are applied inline in the game store

When the `autoCandidates` setting is enabled, `fillCandidates()` is called directly inside `placeDigit`, `eraseCell`, `undo`, and `redo` in `game/store.ts` — not via middleware or a unified mutation wrapper. A separate subscriber handles the "autoCandidates toggled ON" case. This keeps the store flat and avoids middleware machinery for what is currently a single setting affecting a single behavior.

**Considered Options**

- Zustand middleware that wraps all mutations — rejected: adds significant complexity for one setting
- Handling autoCandidates in each reducer — rejected: reducers are pure functions and should not read from a separate store

**When to revisit:** If a second setting needs to intercept mutations (e.g. auto-erase pencil marks on placement, or a strict-mode that rejects conflicting placements), the inline pattern becomes difficult to maintain and a middleware or subscription consolidation is warranted.
