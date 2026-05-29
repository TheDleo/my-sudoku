# Phase 14: Auto-Candidates (One-Shot Fill) — Design Spec

## Goal

Add a "Candidates" button to `ActionBar` that stamps computed valid candidates into every empty cell's pencil marks in one undoable step. Marks are merged (union) with any existing manual pencil marks — nothing is removed.

## Out of scope

- Live / reactive candidate mode (marks staying in sync automatically)
- Filtering or removing invalid existing pencil marks
- Any new visual tier or highlight for computed vs manual marks

---

## Architecture

No new state is added to `GameState`. The feature is a pure one-shot mutation.

```
ActionBar (button click)
  → useGameStore.getState().fillCandidates()
    → withSnapshot(state, fillCandidatesReducer)
      → computeCandidates(cells)
        → for each empty cell: digits 1–9 minus peer values = valid candidates
        → union with existing pencilMarks
      → returns new cells grid
    → snapshot pushed to history.past (undo works for free)
```

### `computeCandidates(cells: Cell[][]): Cell[][]`

Pure function in `helpers.ts`. For each cell:

- If `cell.value !== null`: returned unchanged.
- If `cell.value === null`: compute `validCandidates = {1..9} minus values of all peers`. Return a new cell whose `pencilMarks` is `existing pencilMarks ∪ validCandidates`.

Requires a new import of `peersOf` from `src/solver/units` in `helpers.ts` (that module already uses it in `reducers.ts`).

---

## File Map

| File                          | Action | Responsibility                                  |
| ----------------------------- | ------ | ----------------------------------------------- |
| `src/game/helpers.ts`         | Modify | Add `computeCandidates(cells)` pure function    |
| `src/game/helpers.test.ts`    | Modify | Unit tests for `computeCandidates`              |
| `src/game/reducers.ts`        | Modify | Add `fillCandidates` reducer                    |
| `src/game/reducers.test.ts`   | Modify | Tests for `fillCandidates`                      |
| `src/game/types.ts`           | Modify | Add `fillCandidates: () => void` to `GameStore` |
| `src/game/store.ts`           | Modify | Wire `fillCandidates` action                    |
| `src/game/ActionBar.tsx`      | Modify | Add "Candidates" button                         |
| `src/game/ActionBar.test.tsx` | Modify | RTL test for button                             |

No new files. No CSS changes needed.

---

## Component Design

### `ActionBar`

Adds a second button alongside the existing pencil toggle:

```tsx
<button onClick={() => useGameStore.getState().fillCandidates()}>Candidates</button>
```

No `aria-pressed` needed (it's an action, not a toggle). Button is always enabled.

---

## Testing

### `helpers.test.ts` — `computeCandidates`

- Empty board: every empty cell gets all 9 candidates
- Partially filled board: a cell whose peers hold digits 1–5 gets `{6,7,8,9}` added
- Existing valid pencil mark: preserved (union semantics)
- Existing invalid pencil mark (digit already placed in a peer): preserved (merge only, no removal)
- Cell with a placed value: untouched

### `reducers.test.ts` — `fillCandidates`

- Calling `fillCandidates` on a board with placed digits populates peer-valid candidates
- Undo after `fillCandidates` restores prior pencil marks

### `ActionBar.test.tsx`

- "Candidates" button renders
- Clicking it calls `fillCandidates` on the store

---

## Acceptance Criteria

- `npx vitest run` — all tests pass (355 existing + ~9 new ≈ 364 total)
- `npm run typecheck` — clean
- "Candidates" button appears in `ActionBar` and stamps correct candidates
- Undo after fill restores previous pencil marks
- Existing manual pencil marks are never removed
- No regressions in any earlier-phase tests
