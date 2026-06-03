# my-sudoku

A single-page sudoku web app with four difficulty tiers, manual and auto pencil marks, and a technique-aware hint system that explains rather than reveals.

## Status

In active development. See [PLAN.md](./PLAN.md) for the full design and roadmap.

[![CI](https://github.com/TheDleo/my-sudoku/actions/workflows/ci.yml/badge.svg)](https://github.com/TheDleo/my-sudoku/actions/workflows/ci.yml)

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
