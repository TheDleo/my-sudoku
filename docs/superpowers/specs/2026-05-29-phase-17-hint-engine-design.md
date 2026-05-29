# Phase 17: Hint Engine — Design Spec

## Goal

Add a hint system that runs the solver on the current board state, returns the easiest applicable technique, and reveals it progressively across 4 levels. Hints are purely educational — the user applies them manually. Works for all 16 techniques including elimination-only patterns like X-Wing.

## Out of scope

- Auto-applying hints (user always applies manually)
- Per-technique explainer modals (Phase 18)
- Hint history or multiple hints

---

## Hint Levels

| Level | What's revealed                                                             |
| ----- | --------------------------------------------------------------------------- |
| 1     | "There is a technique you can apply."                                       |
| 2     | Technique name (e.g. "X-Wing")                                              |
| 3     | Technique name + relevant cells highlighted on the board                    |
| 4     | Technique name + highlights + full explanation text from `Step.explanation` |

No "Apply" button at any level. The hint auto-dismisses on any board mutation (including undo/redo).

---

## Architecture

### Hint engine — `src/hints/engine.ts`

Pure function:

```ts
export function getHint(cells: Cell[][]): Step | null;
```

1. Extract `values: (Digit | null)[][]` from `cells`
2. `computeCandidates(values)` → `candidates: Set<Digit>[][]`
3. Run `ALL_TECHNIQUES` in order with `{ values, candidates }`
4. Return the first non-null `Step`, or `null` if none applies

### Store additions

`GameState` gains two fields:

```ts
currentHint: Step | null;
hintLevel: 1 | 2 | 3 | 4;
```

`initialEmptyState`: `currentHint: null, hintLevel: 1`.

`GameSnapshot` does **not** include hint fields — undo/redo restores board state only, not hint state.

Three new reducers:

- `requestHint(state)` — calls `getHint(state.cells)`, sets `currentHint` and resets `hintLevel` to `1`
- `advanceHint(state)` — increments `hintLevel` up to max `4`; no-op if `currentHint` is null
- `dismissHint(state)` — sets `currentHint: null`, resets `hintLevel: 1`

**Auto-dismiss:** `withSnapshot` adds `currentHint: null, hintLevel: 1` to the state it returns (one line change). The `undo` and `redo` reducers also explicitly clear `currentHint: null, hintLevel: 1` in their return values.

Three new store actions (not wrapped in `withSnapshot` — hint mutations are not undoable):

```ts
requestHint: () => set((s) => reducers.requestHint(s)),
advanceHint: () => set((s) => reducers.advanceHint(s)),
dismissHint: () => set((s) => reducers.dismissHint(s)),
```

### Highlights integration

`getHighlights` accepts two new optional fields from `GameState`:

```ts
state: Pick<
  GameState,
  'cells' | 'given' | 'selection' | 'pencilMode' | 'currentHint' | 'hintLevel'
>;
```

New `'hint'` tier added to `CellHighlight`. When `hintLevel >= 3` and `currentHint !== null`, cells in `currentHint.highlights` are marked `'hint'` — applied before the conflict tier so `'conflict'` and `'selected'` still win.

`Board.tsx` subscribes to `currentHint` and `hintLevel` and passes them to `getHighlights`.

### HintPanel component — `src/hints/HintPanel.tsx`

Always rendered (replaces the absence of a row with a "Hint" button).

**When `currentHint` is null:**

```
[ Hint ]
```

**When `currentHint` is non-null:**

```
[ × ]  <level-appropriate content>  [ Show more ]   ← Show more hidden at level 4
```

Level content:

- Level 1: "There is a technique you can apply."
- Level 2: `step.technique` (formatted name, e.g. "Naked Single")
- Level 3: same as level 2 (cells highlighted on board)
- Level 4: same as level 2 + `step.explanation` paragraph

---

## File Map

| File                           | Action | Responsibility                                                          |
| ------------------------------ | ------ | ----------------------------------------------------------------------- |
| `src/hints/engine.ts`          | Create | Pure `getHint(cells)` function                                          |
| `src/hints/engine.test.ts`     | Create | Unit tests for hint engine                                              |
| `src/hints/HintPanel.tsx`      | Create | Hint panel component                                                    |
| `src/hints/HintPanel.css`      | Create | Styles for hint panel                                                   |
| `src/hints/HintPanel.test.tsx` | Create | RTL tests for hint panel                                                |
| `src/game/types.ts`            | Modify | Add `currentHint`, `hintLevel` to `GameState`; 3 actions to `GameStore` |
| `src/game/reducers.ts`         | Modify | Add 3 reducers; clear hint in `withSnapshot`, `undo`, `redo`            |
| `src/game/reducers.test.ts`    | Modify | Tests for 3 reducers + auto-dismiss                                     |
| `src/game/store.ts`            | Modify | Wire 3 new actions                                                      |
| `src/game/highlights.ts`       | Modify | Add `'hint'` tier; accept `currentHint`/`hintLevel`                     |
| `src/game/highlights.test.ts`  | Modify | Tests for `'hint'` tier                                                 |
| `src/game/Board.tsx`           | Modify | Subscribe to and pass `currentHint`/`hintLevel` to `getHighlights`      |
| `src/styles/tokens.css`        | Modify | Add `--cell-hint` token (light + dark)                                  |
| `src/game/Cell.css`            | Modify | Add `.cell--hint` rule                                                  |
| `src/app.tsx`                  | Modify | Render `<HintPanel />` below `<ActionBar />`                            |

---

## Technique Name Formatting

`Step.technique` is a camelCase string. Display as a human-readable label using a lookup table — camelCase regex conversion handles mixed-case names like `'xyWing'` poorly. Define a `const TECHNIQUE_LABELS: Record<TechniqueName, string>` in `src/hints/engine.ts`:

```ts
export const TECHNIQUE_LABELS: Record<TechniqueName, string> = {
  nakedSingle: 'Naked Single',
  hiddenSingle: 'Hidden Single',
  nakedPair: 'Naked Pair',
  nakedTriple: 'Naked Triple',
  hiddenPair: 'Hidden Pair',
  hiddenTriple: 'Hidden Triple',
  pointingPair: 'Pointing Pair',
  nakedQuad: 'Naked Quad',
  hiddenQuad: 'Hidden Quad',
  xWing: 'X-Wing',
  boxLineReduction: 'Box-Line Reduction',
  swordfish: 'Swordfish',
  xyWing: 'XY-Wing',
  xyzWing: 'XYZ-Wing',
  coloring: 'Coloring',
  uniqueRectangle: 'Unique Rectangle',
};
```

---

## Testing

### `engine.test.ts`

- Returns `null` on a fully empty board (no techniques applicable)
- Returns a `Step` with `technique: 'nakedSingle'` when exactly one candidate remains in a cell
- Returns the first applicable technique in `ALL_TECHNIQUES` order (not a harder one if an easier one applies)

### `reducers.test.ts` additions

- `requestHint` sets `currentHint` to a `Step` and `hintLevel` to `1` on a hintable board
- `requestHint` sets `currentHint` to `null` when no technique applies (empty board)
- `advanceHint` increments `hintLevel` 1→2, 2→3, 3→4
- `advanceHint` does not go past `4`
- `advanceHint` is a no-op when `currentHint` is null
- `dismissHint` sets `currentHint: null` and `hintLevel: 1`
- `withSnapshot` clears `currentHint` when a board mutation commits
- `undo` clears `currentHint`
- `redo` clears `currentHint`

### `highlights.test.ts` additions

- `step.highlights` cells get `'hint'` when `hintLevel >= 3`
- `step.highlights` cells do NOT get `'hint'` when `hintLevel < 3`
- `'selected'` beats `'hint'`
- `'conflict'` beats `'hint'`

### `HintPanel.test.tsx`

- Shows "Hint" button when `currentHint` is null
- Shows level-1 text when `hintLevel` is `1`
- Shows technique name at level `2`
- Shows "Show more" at levels 1–3
- Hides "Show more" at level `4`
- Shows "×" dismiss button when hint is active
- Clicking "Hint" calls `requestHint`
- Clicking "Show more" calls `advanceHint`
- Clicking "×" calls `dismissHint`

---

## Acceptance Criteria

- `npx vitest run` — all tests pass (~379 existing + ~20 new ≈ 399 total)
- `npm run typecheck` — clean
- "Hint" button visible in the hint panel row below ActionBar
- Pressing it reveals a level-1 hint if a technique applies, nothing if not
- "Show more" advances through levels 1→2→3→4
- At level 3+, relevant cells are highlighted on the board
- At level 4, `step.explanation` text is shown
- Any board action (digit placement, erase, undo, redo) auto-dismisses the hint
- No regressions in any earlier-phase tests
