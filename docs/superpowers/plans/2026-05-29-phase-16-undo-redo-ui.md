# Phase 16: Undo / Redo UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Undo/Redo buttons to the right of `ActionBar` and wire Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z keyboard shortcuts through the existing board-scoped `handleKey` function.

**Architecture:** `KeyActions` gains `undo` and `redo`; `handleKey` handles Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z / Ctrl+Y (redo). `ActionBar` subscribes to `history.past` and `history.future` lengths to drive disabled state on two new buttons. No new store state; everything derives from the existing `history` arrays in `GameState`.

**Tech Stack:** React, Zustand (`useGameStore`), Vitest, React Testing Library

---

## File map

| File                          | Action | Responsibility                                                              |
| ----------------------------- | ------ | --------------------------------------------------------------------------- |
| `src/game/keyboard.ts`        | Modify | Add `undo`/`redo` to `KeyActions`; handle Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z/Y |
| `src/game/keyboard.test.ts`   | Modify | 5 tests for Ctrl+Z, Cmd+Z, Ctrl+Shift+Z, Cmd+Shift+Z, Ctrl+Y                |
| `src/game/ActionBar.tsx`      | Modify | Subscribe to history lengths; add Undo/Redo buttons                         |
| `src/game/ActionBar.css`      | Modify | Style + disabled state for `action-bar__undo` and `action-bar__redo`        |
| `src/game/ActionBar.test.tsx` | Modify | 8 tests for render, disabled state, and click behavior                      |

No new files. `Board.tsx`, `store.ts`, `types.ts`, and `reducers.ts` untouched.

---

## Task 1: Keyboard shortcuts

**Files:**

- Modify: `src/game/keyboard.ts`
- Modify: `src/game/keyboard.test.ts`

- [ ] **Step 1: Add 5 failing tests to `keyboard.test.ts`**

Update `makeEvent` at the top of `src/game/keyboard.test.ts` to accept `ctrlKey` and `metaKey`:

```ts
function makeEvent(key: string, shiftKey = false, ctrlKey = false, metaKey = false) {
  return { key, shiftKey, ctrlKey, metaKey, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}
```

Update `makeActions` to include `undo` and `redo`:

```ts
function makeActions() {
  return {
    selectCell: vi.fn(),
    setSelectedNumber: vi.fn(),
    placeDigit: vi.fn(),
    eraseCell: vi.fn(),
    togglePencilMark: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  };
}
```

Append this `describe` block inside the existing `describe('handleKey', ...)` block, after the `'unrecognized keys'` block:

```ts
describe('undo / redo shortcuts', () => {
  it('Ctrl+Z calls undo and prevents default', () => {
    const e = makeEvent('z', false, true, false);
    const actions = makeActions();
    handleKey(e, makeState(), actions);
    expect(actions.undo).toHaveBeenCalled();
    expect(actions.redo).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('Cmd+Z calls undo', () => {
    const e = makeEvent('z', false, false, true);
    const actions = makeActions();
    handleKey(e, makeState(), actions);
    expect(actions.undo).toHaveBeenCalled();
  });

  it('Ctrl+Shift+Z calls redo, not undo', () => {
    const e = makeEvent('z', true, true, false);
    const actions = makeActions();
    handleKey(e, makeState(), actions);
    expect(actions.redo).toHaveBeenCalled();
    expect(actions.undo).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('Cmd+Shift+Z calls redo', () => {
    const e = makeEvent('z', true, false, true);
    const actions = makeActions();
    handleKey(e, makeState(), actions);
    expect(actions.redo).toHaveBeenCalled();
    expect(actions.undo).not.toHaveBeenCalled();
  });

  it('Ctrl+Y calls redo', () => {
    const e = makeEvent('y', false, true, false);
    const actions = makeActions();
    handleKey(e, makeState(), actions);
    expect(actions.redo).toHaveBeenCalled();
    expect(actions.undo).not.toHaveBeenCalled();
    expect(e.preventDefault).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/game/keyboard.test.ts
```

Expected: 5 failures — `actions.undo is not a function` or similar.

- [ ] **Step 3: Implement the shortcuts in `keyboard.ts`**

Replace the entire content of `src/game/keyboard.ts` with:

```ts
import type { Digit } from '../types';
import type { GameState, GameStore } from './types';

type KeyState = Pick<GameState, 'cells' | 'given' | 'selection' | 'pencilMode'>;
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

export function handleKey(event: KeyboardEvent, state: KeyState, actions: KeyActions): void {
  const { key, shiftKey, ctrlKey, metaKey } = event;
  const { selection, pencilMode } = state;

  if ((ctrlKey || metaKey) && key === 'z') {
    event.preventDefault();
    if (shiftKey) {
      actions.redo();
    } else {
      actions.undo();
    }
    return;
  }

  if (ctrlKey && key === 'y') {
    event.preventDefault();
    actions.redo();
    return;
  }

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
    event.preventDefault();
    if (selection.cell === null) return;
    const { row, col } = selection.cell;
    const next =
      key === 'ArrowUp'
        ? { row: Math.max(0, row - 1), col }
        : key === 'ArrowDown'
          ? { row: Math.min(8, row + 1), col }
          : key === 'ArrowLeft'
            ? { row, col: Math.max(0, col - 1) }
            : { row, col: Math.min(8, col + 1) };
    actions.selectCell(next);
    return;
  }

  if (key === 'Escape') {
    actions.selectCell(null);
    actions.setSelectedNumber(null);
    return;
  }

  if (key === 'Backspace' || key === 'Delete') {
    if (selection.cell !== null) {
      event.preventDefault();
      actions.eraseCell();
    }
    return;
  }

  const digit = parseDigit(key);
  if (digit !== null && selection.cell !== null) {
    event.preventDefault();
    if (shiftKey || pencilMode) {
      actions.togglePencilMark(digit);
    } else {
      actions.placeDigit(digit);
    }
    return;
  }
}

function parseDigit(key: string): Digit | null {
  const n = parseInt(key, 10);
  if (n >= 1 && n <= 9) return n as Digit;
  return null;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/game/keyboard.test.ts
```

Expected: all tests pass (existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/game/keyboard.ts src/game/keyboard.test.ts
git commit -m "feat(game): add Ctrl/Cmd+Z undo and Ctrl/Cmd+Shift+Z redo shortcuts"
```

---

## Task 2: Undo/Redo buttons in ActionBar

**Files:**

- Modify: `src/game/ActionBar.tsx`
- Modify: `src/game/ActionBar.css`
- Modify: `src/game/ActionBar.test.tsx`

- [ ] **Step 1: Add 8 failing tests to `ActionBar.test.tsx`**

Append these 8 tests inside the existing `describe('ActionBar', ...)` block, before the closing `});`:

```ts
  it('renders an undo button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /^undo$/i })).toBeTruthy();
  });

  it('renders a redo button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /^redo$/i })).toBeTruthy();
  });

  it('undo button is disabled when history.past is empty', () => {
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^undo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('undo button is enabled when history.past has entries', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [{ cells: initialEmptyState.cells, pencilMode: false }], future: [] },
    });
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^undo$/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('redo button is disabled when history.future is empty', () => {
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^redo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('redo button is enabled when history.future has entries', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [], future: [{ cells: initialEmptyState.cells, pencilMode: false }] },
    });
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^redo$/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking undo removes the last entry from history.past', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [{ cells: initialEmptyState.cells, pencilMode: false }], future: [] },
    });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /^undo$/i }));
    expect(useGameStore.getState().history.past.length).toBe(0);
  });

  it('clicking redo removes the last entry from history.future', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: { past: [], future: [{ cells: initialEmptyState.cells, pencilMode: false }] },
    });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /^redo$/i }));
    expect(useGameStore.getState().history.future.length).toBe(0);
  });
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/game/ActionBar.test.tsx
```

Expected: 8 failures — buttons not found.

- [ ] **Step 3: Add Undo/Redo buttons to `ActionBar.tsx`**

Replace the contents of `src/game/ActionBar.tsx` with:

```tsx
import './ActionBar.css';
import { useGameStore } from './store';

export function ActionBar() {
  const pencilMode = useGameStore((s) => s.pencilMode);
  const past = useGameStore((s) => s.history.past);
  const future = useGameStore((s) => s.history.future);

  const handlePencilToggle = () => {
    useGameStore.getState().togglePencilMode();
  };

  const handleFillCandidates = () => {
    useGameStore.getState().fillCandidates();
  };

  const handleUndo = () => {
    useGameStore.getState().undo();
  };

  const handleRedo = () => {
    useGameStore.getState().redo();
  };

  return (
    <div className="action-bar" onClick={(e) => e.stopPropagation()}>
      <button
        className={`action-bar__pencil${pencilMode ? ' action-bar__pencil--active' : ''}`}
        aria-pressed={pencilMode}
        onClick={handlePencilToggle}
      >
        ✏️ Pencil
      </button>
      <button className="action-bar__candidates" onClick={handleFillCandidates}>
        Candidates
      </button>
      <button className="action-bar__undo" onClick={handleUndo} disabled={past.length === 0}>
        Undo
      </button>
      <button className="action-bar__redo" onClick={handleRedo} disabled={future.length === 0}>
        Redo
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add CSS rules to `ActionBar.css`**

Append to the end of `src/game/ActionBar.css`:

```css
.action-bar__undo,
.action-bar__redo {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: 0.875rem;
  min-height: 44px;
}

.action-bar__undo:disabled,
.action-bar__redo:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Run all tests to confirm they pass**

```bash
npx vitest run
```

Expected: all tests pass (364 existing + 5 keyboard + 8 ActionBar = 377 total).

- [ ] **Step 6: Commit**

```bash
git add src/game/ActionBar.tsx src/game/ActionBar.css src/game/ActionBar.test.tsx
git commit -m "feat(game): add Undo/Redo buttons to ActionBar"
```

---

## Acceptance checklist

- [ ] Ctrl+Z undoes the last action when the board is focused
- [ ] Cmd+Z (Mac) undoes the last action when the board is focused
- [ ] Ctrl+Shift+Z and Cmd+Shift+Z redo when the board is focused
- [ ] Ctrl+Y redoes when the board is focused
- [ ] Undo button appears to the right of Candidates in ActionBar
- [ ] Redo button appears to the right of Undo
- [ ] Undo button is visually disabled when there is nothing to undo
- [ ] Redo button is visually disabled when there is nothing to redo
- [ ] All 377 tests pass
- [ ] `npm run typecheck` is clean
- [ ] No regressions in any earlier-phase tests
