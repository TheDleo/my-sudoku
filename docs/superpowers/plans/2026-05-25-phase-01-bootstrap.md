# Phase 1: Project Bootstrap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buildable, type-checked, lint-clean Vite + React + TypeScript project that renders "Sudoku" in both light and dark themes, passes its smoke test, and deploys to GitHub Pages via CI.

**Architecture:** Standard Vite SPA. CSS custom properties for theming via `data-theme` on `<html>`. Vitest + React Testing Library for component tests. Playwright for one e2e smoke test. ESLint + Prettier + Husky + lint-staged enforce style on commit. GitHub Actions runs typecheck → lint → test → build → deploy.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest 1, Playwright 1.40+, ESLint 8, Prettier 3, Husky 9, lint-staged 15, Zustand 4 (installed but not yet used).

**Working directory:** `/Users/dmartin/source/my-sudoku`

---

## Task 1: Git init and gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo on main branch**

```bash
cd /Users/dmartin/source/my-sudoku
git init -b main
```

Expected: "Initialized empty Git repository in ..."

- [ ] **Step 2: Write `.gitignore`**

Create `.gitignore` with:

```gitignore
node_modules/
dist/
coverage/
.DS_Store
*.log
.env
.env.local
.vite/
playwright-report/
test-results/
.husky/_
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore PLAN.md docs/superpowers/plans/2026-05-25-phase-01-bootstrap.md
git commit -m "chore: initialize repo with plan and gitignore"
```

Expected: a single commit on `main`.

---

## Task 2: package.json and dependencies

**Files:**
- Create: `package.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "my-sudoku",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "lint": "eslint . --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "prepare": "husky"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "@vitejs/plugin-react": "^4.3.2",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.37.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.12",
    "husky": "^9.1.6",
    "jsdom": "^25.0.1",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,css,md}": "prettier --write",
    "*.{ts,tsx,js,jsx}": "eslint --fix"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` generated, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add package.json with React/Vite/TS/Vitest/Playwright deps"
```

---

## Task 3: TypeScript configuration

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`

- [ ] **Step 1: Write `tsconfig.json`** (root, project references)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 2: Write `tsconfig.app.json`** (app code)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "src/**/*.test.ts", "src/**/*.test.tsx", "src/vitest-setup.ts"]
}
```

- [ ] **Step 3: Write `tsconfig.node.json`** (config files)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 4: Verify typecheck passes (no source files yet, so no errors)**

```bash
npm run typecheck
```

Expected: exit 0, no errors. (Will report no files to check; that's OK.)

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json tsconfig.app.json tsconfig.node.json
git commit -m "chore: add TypeScript configuration with strict mode"
```

---

## Task 4: Vite + minimal React app

**Files:**
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/app.tsx`

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <title>Sudoku</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/my-sudoku/',
  plugins: [react()],
});
```

- [ ] **Step 3: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Write `src/app.tsx`**

```tsx
export function App() {
  return (
    <main>
      <h1>Sudoku</h1>
    </main>
  );
}
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev -- --port 5173 &
sleep 3
curl -sf http://localhost:5173 | grep -q '<div id="root">' && echo OK
kill %1 2>/dev/null || true
```

Expected: prints `OK`.

Note: `src/styles/global.css` is created in Task 5. The build will fail without it; that's expected — we commit and proceed to Task 5 which makes the build pass.

- [ ] **Step 6: Commit**

```bash
git add index.html vite.config.ts src/main.tsx src/app.tsx
git commit -m "feat: bootstrap minimal Vite + React app rendering 'Sudoku'"
```

---

## Task 5: CSS tokens and global styles

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`

- [ ] **Step 1: Write `src/styles/tokens.css`**

CSS custom properties defining the theme palette. The dark theme overrides happen via `data-theme="dark"` on `<html>`, with `prefers-color-scheme: dark` as the fallback when `data-theme="auto"` (or unset).

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
  --cell-peer: #f1f5f9;
  --cell-highlight: #fef3c7;
  --cell-conflict: #fee2e2;
  --cell-conflict-fg: #b91c1c;
}

html[data-theme='dark'] {
  --bg: #0f0f10;
  --fg: #e8e8e8;
  --fg-muted: #999;
  --surface: #18181b;
  --border: #2a2a2e;
  --accent: #60a5fa;
  --accent-fg: #0f0f10;
  --cell-bg: #1c1c1f;
  --cell-given: #e8e8e8;
  --cell-user: #60a5fa;
  --cell-selected: #1e3a5f;
  --cell-peer: #1f1f23;
  --cell-highlight: #3d3416;
  --cell-conflict: #4a1f1f;
  --cell-conflict-fg: #fca5a5;
}

@media (prefers-color-scheme: dark) {
  html:not([data-theme='light']):not([data-theme='dark']) {
    --bg: #0f0f10;
    --fg: #e8e8e8;
    --fg-muted: #999;
    --surface: #18181b;
    --border: #2a2a2e;
    --accent: #60a5fa;
    --accent-fg: #0f0f10;
    --cell-bg: #1c1c1f;
    --cell-given: #e8e8e8;
    --cell-user: #60a5fa;
    --cell-selected: #1e3a5f;
    --cell-peer: #1f1f23;
    --cell-highlight: #3d3416;
    --cell-conflict: #4a1f1f;
    --cell-conflict-fg: #fca5a5;
  }
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

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
  align-items: center;
  justify-content: center;
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
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: TypeScript compiles, Vite builds, `dist/` produced, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/styles/global.css
git commit -m "feat: add CSS tokens and global styles with light/dark theming"
```

---

## Task 6: Vitest setup + component smoke test

**Files:**
- Create: `vitest.config.ts`
- Create: `src/vitest-setup.ts`
- Create: `src/app.test.tsx`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/vitest-setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 2: Write `src/vitest-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Write the failing test `src/app.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app';

describe('App', () => {
  it('renders the Sudoku heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test**

```bash
npm test
```

Expected: 1 test passes (the app already renders "Sudoku" from Task 4).

- [ ] **Step 5: Verify typecheck still passes**

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/vitest-setup.ts src/app.test.tsx
git commit -m "test: add Vitest + RTL setup with App smoke test"
```

---

## Task 7: ESLint + Prettier

**Files:**
- Create: `.eslintrc.cjs`
- Create: `.eslintignore`
- Create: `.prettierrc.json`
- Create: `.prettierignore`

- [ ] **Step 1: Write `.eslintrc.cjs`**

```js
/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-refresh'],
  settings: { react: { version: 'detect' } },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {},
    },
  ],
};
```

- [ ] **Step 2: Write `.eslintignore`**

```
dist
node_modules
coverage
playwright-report
test-results
```

- [ ] **Step 3: Write `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

- [ ] **Step 4: Write `.prettierignore`**

```
dist
node_modules
coverage
playwright-report
test-results
package-lock.json
```

- [ ] **Step 5: Format all files and verify lint passes**

```bash
npm run format
npm run lint
```

Expected: format completes without errors; lint exits 0.

- [ ] **Step 6: Commit**

```bash
git add .eslintrc.cjs .eslintignore .prettierrc.json .prettierignore
git add -u  # in case formatting changed any committed files
git commit -m "chore: add ESLint and Prettier configuration"
```

---

## Task 8: Husky + lint-staged pre-commit hook

**Files:**
- Create: `.husky/pre-commit`

- [ ] **Step 1: Initialize Husky**

```bash
npx husky init
```

Expected: Creates `.husky/pre-commit` and adds `prepare` script (already in package.json).

- [ ] **Step 2: Overwrite `.husky/pre-commit`**

```sh
npx lint-staged
npx tsc -b --noEmit
```

- [ ] **Step 3: Verify the hook runs cleanly**

Create a trivial change, stage it, run the hook manually:

```bash
echo "" >> README.md 2>/dev/null || echo "# my-sudoku" > README.md
git add README.md
sh .husky/pre-commit
```

Expected: lint-staged runs (or reports nothing to do), tsc exits 0.

Clean up:

```bash
git restore --staged README.md
rm -f README.md
```

- [ ] **Step 4: Commit Husky files**

```bash
git add .husky/pre-commit
git commit -m "chore: add Husky pre-commit hook running lint-staged and typecheck"
```

---

## Task 9: Playwright + e2e smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

Expected: chromium downloads.

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/my-sudoku/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/my-sudoku/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('renders Sudoku heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeVisible();
});
```

- [ ] **Step 4: Run e2e**

```bash
npm run test:e2e
```

Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts
git commit -m "test: add Playwright e2e smoke test for app rendering"
```

---

## Task 10: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        if: github.ref == 'refs/heads/main'
        with:
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: verify
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow with verify and Pages deploy"
```

---

## Task 11: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# my-sudoku

A single-page sudoku web app with four difficulty tiers, manual and auto pencil marks, and a technique-aware hint system that explains rather than reveals.

## Status

In active development. See [PLAN.md](./PLAN.md) for the full design and roadmap.

## Develop

```bash
npm install
npm run dev          # start dev server
npm test             # unit tests (watch: npm run test:watch)
npm run test:e2e     # Playwright e2e
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run format       # Prettier write
npm run build        # production bundle
npm run preview      # serve built bundle locally
```

## Stack

React 18, TypeScript, Vite, Zustand, Vitest, Playwright. Deployed to GitHub Pages.
```

- [ ] **Step 2: Run full verification before commit**

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with project overview and dev commands"
```

---

## Acceptance Criteria (whole phase)

After all 11 tasks complete, verify:

- [ ] `npm run dev` serves the page at http://localhost:5173 (manual check).
- [ ] `npm test` passes with at least one test (the App smoke test).
- [ ] `npm run test:e2e` passes the Playwright smoke test.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0 with no warnings.
- [ ] `npm run format:check` exits 0.
- [ ] `npm run build` produces a `dist/` bundle.
- [ ] The git log shows clean, conventional commits for each task.
- [ ] The CI workflow file is present and well-formed (will be verified once pushed to GitHub).

**Out of scope for this phase:** any sudoku-specific code (cells, solver, generator, store). Those start in Phase 2.
