# Phase 25: Coloring Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independent coloring systems: (1) enhanced hint visualization that shows color A / color B chain cells at hint level 3, and (2) a manual color-marking tool (🔵 A / 🟡 B buttons in ActionBar) for freeform chain annotation.

**Architecture:** `colorGroups` added to `Step` type; four new `CellHighlight` tiers (`hint-a`, `hint-b`, `color-a`, `color-b`); `colorMarks` + `colorMode` added to `GameState`; Board click handler paints cells when `colorMode` is active.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library. No new dependencies.

---

## File Map

| Action | File                                     |
| ------ | ---------------------------------------- |
| Modify | `src/solver/types.ts`                    |
| Modify | `src/solver/techniques/coloring.ts`      |
| Modify | `src/solver/techniques/coloring.test.ts` |
| Modify | `src/game/types.ts`                      |
| Modify | `src/game/reducers.ts`                   |
| Modify | `src/game/reducers.test.ts`              |
| Modify | `src/game/store.ts`                      |
| Modify | `src/game/persistence.ts`                |
| Modify | `src/game/persistence.test.ts`           |
| Modify | `src/game/highlights.ts`                 |
| Modify | `src/game/highlights.test.ts`            |
| Modify | `src/game/Board.tsx`                     |
| Modify | `src/game/ActionBar.tsx`                 |
| Modify | `src/game/ActionBar.test.tsx`            |
| Modify | `src/game/ActionBar.css`                 |
| Modify | `src/game/Cell.css`                      |
| Modify | `src/settings/theme.ts`                  |

---

## Task 1: Extend Step type and coloring detector

**Files:** `src/solver/types.ts`, `src/solver/techniques/coloring.ts`, `src/solver/techniques/coloring.test.ts`

- [ ] **Step 1: Add `colorGroups` to `Step` in `src/solver/types.ts`**

  ```ts
  colorGroups?: { a: CellCoord[]; b: CellCoord[] };
  ```

- [ ] **Step 2: Update `src/solver/techniques/coloring.ts`**

  In `scanDigit`, populate `colorGroups` in both return paths (wrap-color elimination and outside-peer elimination). The arrays `colorA` and `colorB` are already computed. Add to each returned `Step`:

  ```ts
  colorGroups: { a: colorA, b: colorB },
  ```

- [ ] **Step 3: Add tests to `src/solver/techniques/coloring.test.ts`**

  For the existing passing fixtures, assert:
  - `step.colorGroups` is defined
  - `step.colorGroups.a.length > 0` and `step.colorGroups.b.length > 0`
  - `[...colorGroups.a, ...colorGroups.b]` sorted equals `step.highlights` sorted (same cells)

- [ ] **Step 4: Run tests**

  ```bash
  npx vitest run src/solver/techniques/coloring.test.ts
  ```

  Expected: all pass.

- [ ] **Step 5: Run full suite**

  ```bash
  npx vitest run
  ```

  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/solver/types.ts src/solver/techniques/coloring.ts src/solver/techniques/coloring.test.ts
  git commit -m "feat(solver): expose colorGroups on coloring Step"
  ```

---

## Task 2: Game state — types, reducers, store, persistence

**Files:** `src/game/types.ts`, `src/game/reducers.ts`, `src/game/reducers.test.ts`, `src/game/store.ts`, `src/game/persistence.ts`, `src/game/persistence.test.ts`

- [ ] **Step 1: Update `src/game/types.ts`**

  Add to `GameState`:

  ```ts
  colorMarks: ('A' | 'B' | null)[][];
  colorMode: 'A' | 'B' | null;
  ```

  Update `GameSnapshot`:

  ```ts
  export type GameSnapshot = {
    cells: Cell[][];
    pencilMode: boolean;
    colorMarks: ('A' | 'B' | null)[][];
  };
  ```

  Add to `GameStore`:

  ```ts
  setColorMark: (coord: CellCoord, color: 'A' | 'B' | null) => void;
  toggleColorMode: (color: 'A' | 'B') => void;
  ```

- [ ] **Step 2: Update `src/game/reducers.ts`**
  - Add to `initialEmptyState`:

    ```ts
    colorMarks: empty9x9<'A' | 'B' | null>(null),
    colorMode: null,
    ```

  - Add `setColorMark` reducer:

    ```ts
    export function setColorMark(
      state: GameState,
      coord: CellCoord,
      color: 'A' | 'B' | null,
    ): GameState {
      const next = state.colorMarks.map((row) => [...row]);
      next[coord.row]![coord.col] = color;
      return { ...state, colorMarks: next };
    }
    ```

  - Add `toggleColorMode` reducer:

    ```ts
    export function toggleColorMode(state: GameState, color: 'A' | 'B'): GameState {
      return { ...state, colorMode: state.colorMode === color ? null : color };
    }
    ```

  - Update `withSnapshot` to include `colorMarks`:

    ```ts
    const snapshot: GameSnapshot = {
      cells: cloneCells(state.cells),
      pencilMode: state.pencilMode,
      colorMarks: state.colorMarks.map((r) => [...r]),
    };
    ```

  - Update `undo` and `redo` to restore `colorMarks` from snapshot (same pattern as `cells`/`pencilMode`).

  - Update `loadPuzzle` to reset `colorMarks` and `colorMode`:

    ```ts
    colorMarks: empty9x9<'A' | 'B' | null>(null),
    colorMode: null,
    ```

  - Update `placeDigit`: after setting the cell value, clear its color mark:
    ```ts
    const nextColorMarks = state.colorMarks.map((row) => [...row]);
    nextColorMarks[sel.row]![sel.col] = null;
    // include nextColorMarks in the returned state
    ```

- [ ] **Step 3: Update `src/game/store.ts`**
  - Wire `setColorMark` (wrapped in `withSnapshot`) and `toggleColorMode` (not wrapped — it's not a board mutation).
  - Add `colorMarks` to the auto-save subscriber field list so localStorage saves on color mark changes.

- [ ] **Step 4: Update `src/game/persistence.ts`**
  - Add to `SerializedState`:
    ```ts
    colorMarks?: (('A' | 'B' | null)[])[];
    ```
  - Serialize: include `colorMarks: state.colorMarks`.
  - Deserialize: `colorMarks: saved.colorMarks ?? empty9x9<'A' | 'B' | null>(null)`.

- [ ] **Step 5: Add tests to `src/game/reducers.test.ts`**
  - `setColorMark` sets a mark and does not mutate other cells
  - `setColorMark` with `null` clears a mark
  - `toggleColorMode('A')` activates; calling again deactivates
  - `toggleColorMode('B')` while A is active sets B (not both)
  - `placeDigit` clears the color mark on the placed cell
  - `undo` restores `colorMarks` to state before `setColorMark`
  - `redo` re-applies the mark
  - `loadPuzzle` resets `colorMarks` and `colorMode`

- [ ] **Step 6: Add tests to `src/game/persistence.test.ts`**
  - `colorMarks` round-trips through serialize → deserialize unchanged
  - Saved state without `colorMarks` field deserializes to all-null grid

- [ ] **Step 7: Run tests**

  ```bash
  npx vitest run src/game/reducers.test.ts src/game/persistence.test.ts
  ```

  Expected: all pass.

- [ ] **Step 8: Run full suite**

  ```bash
  npx vitest run
  ```

  Expected: all pass.

- [ ] **Step 9: Commit**

  ```bash
  git add src/game/types.ts src/game/reducers.ts src/game/reducers.test.ts src/game/store.ts src/game/persistence.ts src/game/persistence.test.ts
  git commit -m "feat(game): add colorMarks and colorMode state with reducers and persistence"
  ```

---

## Task 3: Highlight system and Board

**Files:** `src/game/highlights.ts`, `src/game/highlights.test.ts`, `src/game/Board.tsx`

- [ ] **Step 1: Update `src/game/highlights.ts`**
  - Extend `CellHighlight` union with `'hint-a' | 'hint-b' | 'color-a' | 'color-b'`.
  - Update `getHighlights` signature to accept `colorMarks`:
    ```ts
    state: Pick<
      GameState,
      'cells' | 'given' | 'selection' | 'pencilMode' | 'currentHint' | 'hintLevel' | 'colorMarks'
    >;
    ```
  - Apply `color-a`/`color-b` after the peer pass, before the hint pass:
    ```ts
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const mark = state.colorMarks[r]![c];
        if (mark === 'A') map[r]![c] = 'color-a';
        else if (mark === 'B') map[r]![c] = 'color-b';
      }
    ```
  - Update the hint pass at level ≥ 3:
    ```ts
    if (state.hintLevel >= 3 && state.currentHint !== null) {
      if (state.currentHint.colorGroups) {
        for (const coord of state.currentHint.colorGroups.a) map[coord.row]![coord.col] = 'hint-a';
        for (const coord of state.currentHint.colorGroups.b) map[coord.row]![coord.col] = 'hint-b';
      } else {
        for (const coord of state.currentHint.highlights) map[coord.row]![coord.col] = 'hint';
      }
    }
    ```

- [ ] **Step 2: Update `src/game/Board.tsx`**
  - Subscribe to `colorMarks` and `colorMode` from `useGameStore`.
  - Pass `colorMarks` to `getHighlights`.
  - In `handleBoardClick`, when `colorMode !== null`, paint instead of select:
    ```ts
    if (store.colorMode !== null) {
      const current = store.colorMarks[row]![col];
      store.setColorMark({ row, col }, current === store.colorMode ? null : store.colorMode);
      return;
    }
    ```

- [ ] **Step 3: Add tests to `src/game/highlights.test.ts`**
  - `color-a` applied from `colorMarks`
  - `color-b` applied from `colorMarks`
  - `hint-a`/`hint-b` applied at level 3 for a Step with `colorGroups`
  - Hint overrides manual mark on same cell
  - Existing `hint` tier still used for techniques without `colorGroups`

- [ ] **Step 4: Run tests**

  ```bash
  npx vitest run src/game/highlights.test.ts
  ```

  Expected: all pass.

- [ ] **Step 5: Run full suite**

  ```bash
  npx vitest run
  ```

  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/game/highlights.ts src/game/highlights.test.ts src/game/Board.tsx
  git commit -m "feat(game): add hint-a/hint-b/color-a/color-b highlight tiers; Board paints on click when colorMode active"
  ```

---

## Task 4: ActionBar UI, CSS, and theme tokens

**Files:** `src/game/ActionBar.tsx`, `src/game/ActionBar.css`, `src/game/ActionBar.test.tsx`, `src/game/Cell.css`, `src/settings/theme.ts`

- [ ] **Step 1: Update `src/settings/theme.ts`**

  Add amber and blue cell tokens to the light and dark theme objects. Reference existing blue values from `--cell-selected` / `--accent` for color A. Add amber for color B. Example values (adjust to match visual quality of existing hints):
  - Light: `--cell-hint-a: hsl(213, 90%, 88%)`, `--cell-hint-b: hsl(38, 92%, 83%)`, `--cell-color-a: hsl(213, 75%, 85%)`, `--cell-color-b: hsl(38, 80%, 80%)`, `--color-b: hsl(38, 80%, 40%)`
  - Dark: `--cell-hint-a: hsl(213, 50%, 30%)`, `--cell-hint-b: hsl(38, 55%, 28%)`, `--cell-color-a: hsl(213, 40%, 27%)`, `--cell-color-b: hsl(38, 45%, 25%)`, `--color-b: hsl(38, 70%, 55%)`

- [ ] **Step 2: Update `src/game/Cell.css`**

  Add four new classes (same pattern as `.cell--hint`):

  ```css
  .cell--hint-a {
    background: var(--cell-hint-a);
  }
  .cell--hint-b {
    background: var(--cell-hint-b);
  }
  .cell--color-a {
    background: var(--cell-color-a);
  }
  .cell--color-b {
    background: var(--cell-color-b);
  }
  ```

- [ ] **Step 3: Update `src/game/ActionBar.tsx`**
  - Subscribe to `colorMode`.
  - Add two buttons after Redo, before Settings:
    ```tsx
    <button
      className={`action-bar__color-a${colorMode === 'A' ? ' action-bar__color-a--active' : ''}`}
      aria-pressed={colorMode === 'A'}
      onClick={() => useGameStore.getState().toggleColorMode('A')}
    >
      🔵 A
    </button>
    <button
      className={`action-bar__color-b${colorMode === 'B' ? ' action-bar__color-b--active' : ''}`}
      aria-pressed={colorMode === 'B'}
      onClick={() => useGameStore.getState().toggleColorMode('B')}
    >
      🟡 B
    </button>
    ```

- [ ] **Step 4: Update `src/game/ActionBar.css`**

  Add base + active styles for both buttons (same base as `.action-bar__pencil`):

  ```css
  .action-bar__color-a,
  .action-bar__color-b {
    /* same base as action-bar__pencil */
  }

  .action-bar__color-a--active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .action-bar__color-b--active {
    background: var(--color-b);
    color: #fff;
    border-color: var(--color-b);
  }
  ```

- [ ] **Step 5: Add tests to `src/game/ActionBar.test.tsx`**
  - 🔵 A button renders with `aria-pressed="false"` by default
  - Clicking 🔵 A sets `colorMode` to `'A'`; `aria-pressed` becomes `true`
  - Clicking 🔵 A again sets `colorMode` back to `null`
  - Clicking 🟡 B while A is active switches `colorMode` to `'B'` (A becomes inactive)

- [ ] **Step 6: Run tests**

  ```bash
  npx vitest run src/game/ActionBar.test.tsx
  ```

  Expected: all pass.

- [ ] **Step 7: Run full suite — note final count**

  ```bash
  npx vitest run
  ```

  Expected: all pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/game/ActionBar.tsx src/game/ActionBar.css src/game/ActionBar.test.tsx src/game/Cell.css src/settings/theme.ts
  git commit -m "feat(game): add color A/B marking buttons to ActionBar with theme tokens"
  ```
