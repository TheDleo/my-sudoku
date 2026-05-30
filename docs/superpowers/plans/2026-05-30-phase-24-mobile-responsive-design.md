# Phase 24 — Mobile & Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile readability by bumping font size minimums in the board and number pad, reducing padding on narrow phones, and improving dark mode border contrast.

**Architecture:** Pure CSS changes across four files — no logic, no state, no new components. Existing Vitest suite confirms no regressions; visual verification is done in a browser at 375px viewport width.

**Tech Stack:** CSS custom properties, `clamp()`, media queries

---

## File Map

| File                     | Change                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| `src/game/Cell.css`      | Bump cell digit font-size clamp minimum and preferred value      |
| `src/game/NumberPad.css` | Bump digit and erase font-size clamp minimum and preferred value |
| `src/styles/global.css`  | Add `@media (max-width: 420px)` padding reduction                |
| `src/styles/tokens.css`  | Lighten `--border` and `--cell-peer` in both dark mode blocks    |

---

## Task 1: Bump cell and number pad font sizes

**Files:**

- Modify: `src/game/Cell.css`
- Modify: `src/game/NumberPad.css`

- [ ] **Step 1: Update cell font size in `Cell.css`**

Find this line in `src/game/Cell.css`:

```css
font-size: clamp(0.875rem, 3vw, 1.5rem);
```

Replace it with:

```css
font-size: clamp(1.125rem, 4vw, 1.5rem);
```

The full `.cell` rule after the change:

```css
.cell {
  background: var(--cell-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1.125rem, 4vw, 1.5rem);
  position: relative;
  user-select: none;
}
```

- [ ] **Step 2: Update number pad font sizes in `NumberPad.css`**

In `src/game/NumberPad.css` there are two font-size rules to change.

**Change 1** — the shared `.number-pad__digit, .number-pad__erase` rule:

```css
/* Before */
font-size: clamp(0.875rem, 3vw, 1.25rem);

/* After */
font-size: clamp(1.125rem, 4vw, 1.25rem);
```

**Change 2** — the `.number-pad__erase` override at the bottom:

```css
/* Before */
font-size: clamp(1rem, 3.5vw, 1.5rem);

/* After */
font-size: clamp(1.125rem, 4vw, 1.5rem);
```

The full `NumberPad.css` after both changes:

```css
.number-pad {
  display: flex;
  width: min(100%, 500px);
  gap: 4px;
  margin-top: 12px;
}

.number-pad__digit,
.number-pad__erase {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-size: clamp(1.125rem, 4vw, 1.25rem);
  line-height: 1;
  gap: 2px;
  min-height: 44px;
}

.number-pad__digit:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.number-pad__count {
  font-size: 0.6em;
  color: var(--fg-muted);
}

.number-pad__erase {
  font-size: clamp(1.125rem, 4vw, 1.5rem);
}
```

- [ ] **Step 3: Run tests to confirm no regressions**

```bash
npx vitest run
```

Expected: all 459 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/game/Cell.css src/game/NumberPad.css
git commit -m "style(mobile): bump cell and number pad font-size clamp minimums to 1.125rem"
```

---

## Task 2: Mobile padding and dark mode tokens

**Files:**

- Modify: `src/styles/global.css`
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Add mobile padding media query to `global.css`**

Append this block at the end of `src/styles/global.css` (after the existing `@media (prefers-reduced-motion: reduce)` block):

```css
@media (max-width: 420px) {
  main {
    padding: 0.5rem;
  }
}
```

The full `global.css` after the change:

```css
@import './tokens.css';

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  padding: 1rem;
}

h1 {
  font-size: 2rem;
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 420px) {
  main {
    padding: 0.5rem;
  }
}
```

- [ ] **Step 2: Update dark mode tokens in `tokens.css`**

In `src/styles/tokens.css` there are **two** places to update — the explicit `html[data-theme='dark']` block and the `@media (prefers-color-scheme: dark)` block. Both need the same two changes:

- `--border: #2a2a2e` → `--border: #606065`
- `--cell-peer: #1f1f23` → `--cell-peer: #252529`

The full `tokens.css` after both changes:

```css
:root {
  --bg: #fafafa;
  --fg: #1a1a1a;
  --fg-muted: #555;
  --surface: #ffffff;
  --border: #d4d4d4;
  --accent: #2563eb;
  --accent-fg: #ffffff;
  --cell-bg: #ffffff;
  --cell-given: #1a1a1a;
  --cell-user: #2563eb;
  --cell-selected: #dbeafe;
  --cell-selected-pencil: #dcfce7;
  --cell-peer: #f1f5f9;
  --cell-highlight: #fef3c7;
  --cell-conflict: #fee2e2;
  --cell-conflict-fg: #b91c1c;
  --cell-hint: #e0f2fe;
  --cell-pencil-highlight: #4ade80;
}

html[data-theme='dark'] {
  --bg: #0f0f10;
  --fg: #e8e8e8;
  --fg-muted: #999;
  --surface: #18181b;
  --border: #606065;
  --accent: #60a5fa;
  --accent-fg: #0f0f10;
  --cell-bg: #1c1c1f;
  --cell-given: #e8e8e8;
  --cell-user: #60a5fa;
  --cell-selected: #1e3a5f;
  --cell-selected-pencil: #1a3a2a;
  --cell-peer: #252529;
  --cell-highlight: #3d3416;
  --cell-conflict: #4a1f1f;
  --cell-conflict-fg: #fca5a5;
  --cell-hint: #0c4a6e;
  --cell-pencil-highlight: #16a34a;
}

@media (prefers-color-scheme: dark) {
  html:not([data-theme='light']):not([data-theme='dark']) {
    --bg: #0f0f10;
    --fg: #e8e8e8;
    --fg-muted: #999;
    --surface: #18181b;
    --border: #606065;
    --accent: #60a5fa;
    --accent-fg: #0f0f10;
    --cell-bg: #1c1c1f;
    --cell-given: #e8e8e8;
    --cell-user: #60a5fa;
    --cell-selected: #1e3a5f;
    --cell-selected-pencil: #1a3a2a;
    --cell-peer: #252529;
    --cell-highlight: #3d3416;
    --cell-conflict: #4a1f1f;
    --cell-conflict-fg: #fca5a5;
    --cell-hint: #0c4a6e;
    --cell-pencil-highlight: #16a34a;
  }
}
```

- [ ] **Step 3: Run tests to confirm no regressions**

```bash
npx vitest run
```

Expected: all 459 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/styles/tokens.css
git commit -m "style(mobile): add narrow-phone padding reduction and improve dark mode border contrast"
```

---

## Final verification

After both tasks are complete, start the dev server and visually verify:

```bash
npm run dev
```

Open in browser, set viewport to 375px width (Chrome DevTools → responsive mode), and confirm:

- Board digits are clearly readable
- Number pad digits are clearly readable
- In dark mode (toggle OS preference or use DevTools): thin cell lines are clearly visible
