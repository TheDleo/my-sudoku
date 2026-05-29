# Phase 16: Undo / Redo UI — Design Spec

## Goal

Add Undo and Redo buttons to the right of `ActionBar`, and wire Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z keyboard shortcuts through the existing board-scoped `handleKey` function.

## Out of scope

- Global (document-level) keyboard shortcuts
- Separate undo/redo history display
- Per-action undo labels

---

## Architecture

No new store state. Everything derives from the existing `history.past` and `history.future` arrays already in `GameState`.

### Keyboard shortcuts

`KeyActions` in `keyboard.ts` gains `undo` and `redo`. `handleKey` handles two new cases:

- `Ctrl+Z` or `Cmd+Z` (no shift) → `actions.undo()`
- `Ctrl+Shift+Z`, `Cmd+Shift+Z`, or `Ctrl+Y` → `actions.redo()`

`Board.tsx` already passes `useGameStore.getState()` as both the state and actions arguments to `handleKey` — `undo` and `redo` are already on the store, so `Board.tsx` requires no changes.

### ActionBar buttons

`ActionBar` subscribes to `history.past` and `history.future` from the store (same pattern as `pencilMode`). Button order: **✏️ Pencil | Candidates | Undo | Redo**.

- Undo disabled when `history.past.length === 0`
- Redo disabled when `history.future.length === 0`
- Clicks call `useGameStore.getState().undo()` / `.redo()`

---

## File Map

| File                          | Action | Responsibility                                                              |
| ----------------------------- | ------ | --------------------------------------------------------------------------- |
| `src/game/keyboard.ts`        | Modify | Add `undo`/`redo` to `KeyActions`; handle Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z/Y |
| `src/game/keyboard.test.ts`   | Modify | Tests for Ctrl+Z and Ctrl+Shift+Z shortcuts                                 |
| `src/game/ActionBar.tsx`      | Modify | Subscribe to history lengths; add Undo/Redo buttons                         |
| `src/game/ActionBar.css`      | Modify | Shared style rule for `action-bar__undo` and `action-bar__redo`             |
| `src/game/ActionBar.test.tsx` | Modify | Tests for Undo/Redo buttons                                                 |

No new files. `Board.tsx`, `store.ts`, `types.ts`, and `reducers.ts` untouched.

---

## Component Design

### `ActionBar`

```tsx
const past = useGameStore((s) => s.history.past);
const future = useGameStore((s) => s.history.future);

<button
  className="action-bar__undo"
  onClick={() => useGameStore.getState().undo()}
  disabled={past.length === 0}
>
  Undo
</button>
<button
  className="action-bar__redo"
  onClick={() => useGameStore.getState().redo()}
  disabled={future.length === 0}
>
  Redo
</button>
```

### `keyboard.ts` additions

```ts
type KeyActions = Pick<
  GameStore,
  | 'selectCell'
  | 'setSelectedNumber'
  | 'placeDigit'
  | 'eraseCell'
  | 'togglePencilMark'
  | 'undo'
  | 'redo'
>;
```

```ts
if ((event.ctrlKey || event.metaKey) && key === 'z') {
  event.preventDefault();
  if (event.shiftKey) {
    actions.redo();
  } else {
    actions.undo();
  }
  return;
}

if (event.ctrlKey && key === 'y') {
  event.preventDefault();
  actions.redo();
  return;
}
```

---

## Testing

### `keyboard.test.ts`

- `Ctrl+Z` calls `undo`
- `Cmd+Z` (metaKey) calls `undo`
- `Ctrl+Shift+Z` calls `redo`
- `Cmd+Shift+Z` calls `redo`
- `Ctrl+Y` calls `redo`

### `ActionBar.test.tsx`

- Undo button renders
- Redo button renders
- Undo button is disabled when `history.past` is empty
- Undo button is enabled when `history.past` has entries
- Redo button is disabled when `history.future` is empty
- Redo button is enabled when `history.future` has entries
- Clicking Undo calls `undo` on the store
- Clicking Redo calls `redo` on the store

---

## Acceptance Criteria

- `npx vitest run` — all tests pass (364 existing + ~13 new ≈ 377 total)
- `npm run typecheck` — clean
- Undo/Redo buttons visible in ActionBar to the right of Candidates
- Buttons reflect disabled state correctly from history stack
- Ctrl/Cmd+Z undoes the last action when board is focused
- Ctrl/Cmd+Shift+Z and Ctrl+Y redo when board is focused
- No regressions in any earlier-phase tests
