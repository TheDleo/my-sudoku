# Phase 18: Technique Explainers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "What is this?" link to the HintPanel at hint levels 2 and 3 that opens a per-technique explainer modal with an SVG diagram and summary text for all 16 techniques.

**Architecture:** A single `src/hints/explainers/index.tsx` data file exports `EXPLAINERS: Record<TechniqueName, ExplainerContent>` where each entry has a title, summary string, and a Diagram React component rendering a themed SVG. `TechniqueExplainer.tsx` is a thin modal that looks up the technique and renders it. `HintPanel.tsx` gets local `useState` for which technique to explain and renders the modal inline.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library. No new dependencies.

---

## File Map

| Action | File                                    |
| ------ | --------------------------------------- |
| Create | `src/hints/explainers/index.tsx`        |
| Create | `src/hints/explainers/index.test.tsx`   |
| Create | `src/hints/TechniqueExplainer.tsx`      |
| Create | `src/hints/TechniqueExplainer.css`      |
| Create | `src/hints/TechniqueExplainer.test.tsx` |
| Modify | `src/hints/HintPanel.tsx`               |
| Modify | `src/hints/HintPanel.css`               |
| Modify | `src/hints/HintPanel.test.tsx`          |

---

## Task 1: Explainer content data file

**Files:**

- Create: `src/hints/explainers/index.tsx`
- Create: `src/hints/explainers/index.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/hints/explainers/index.test.tsx
import { describe, it, expect } from 'vitest';
import { EXPLAINERS } from './index';
import { TECHNIQUE_DIFFICULTY } from '../../solver/types';

const ALL_TECHNIQUES = Object.keys(TECHNIQUE_DIFFICULTY) as Array<
  keyof typeof TECHNIQUE_DIFFICULTY
>;

describe('EXPLAINERS', () => {
  it('has an entry for every TechniqueName', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(EXPLAINERS[t], `missing entry for ${t}`).toBeDefined();
    }
  });

  it('every entry has a non-empty title', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(EXPLAINERS[t]!.title.length, `empty title for ${t}`).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty summary', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(EXPLAINERS[t]!.summary.length, `empty summary for ${t}`).toBeGreaterThan(0);
    }
  });

  it('every entry has a Diagram function', () => {
    for (const t of ALL_TECHNIQUES) {
      expect(typeof EXPLAINERS[t]!.Diagram, `missing Diagram for ${t}`).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/hints/explainers/index.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create the explainer content file**

```tsx
// src/hints/explainers/index.tsx
import type { TechniqueName } from '../../solver/types';

export type ExplainerContent = {
  title: string;
  summary: string;
  Diagram: React.FC;
};

// ─── SVG colour tokens (all themed via CSS custom properties) ───────────────
// var(--cell-bg)       empty cell background
// var(--cell-selected) key cell highlight (blue)
// var(--cell-hint)     secondary highlight (light blue)
// var(--border)        grid lines
// var(--accent)        placed digit / key text
// var(--fg-muted)      candidate digits / annotations

export const EXPLAINERS: Record<TechniqueName, ExplainerContent> = {
  nakedSingle: {
    title: 'Naked Single',
    summary:
      "A cell where only one digit is possible. Every other digit has been eliminated by the cell's row, column, or box. When you find one, place the digit.",
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        {/* 3×3 box — centre cell is the naked single */}
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="24" y="28" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          1 3
        </text>
        <rect
          x="42"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="60" y="28" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          2 4
        </text>
        <rect
          x="78"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="96" y="28" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          6 9
        </text>
        <rect
          x="6"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="24" y="64" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          3 7
        </text>
        <rect
          x="42"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="66"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="var(--accent)"
        >
          5
        </text>
        <rect
          x="78"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="96" y="64" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          8 9
        </text>
        <rect
          x="6"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="24" y="100" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          6 8
        </text>
        <rect
          x="42"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="60" y="100" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          2 9
        </text>
        <rect
          x="78"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="96" y="100" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          1 4
        </text>
      </svg>
    ),
  },

  hiddenSingle: {
    title: 'Hidden Single',
    summary:
      'A digit that can only go in one cell within a unit (row, column, or box) — even though that cell has multiple candidates. Scan each unit for a digit that appears as a candidate in exactly one cell.',
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        {/* 3×3 box — digit 7 is a candidate in only the top-right cell */}
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="24" y="22" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          1 3
        </text>
        <text x="24" y="33" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          5 9
        </text>
        <rect
          x="42"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="60" y="22" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          2 4
        </text>
        <text x="60" y="33" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          6 8
        </text>
        <rect
          x="78"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="96" y="20" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          3 5
        </text>
        <text x="96" y="31" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          7
        </text>
        <rect
          x="6"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="24" y="64" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          1 2 9
        </text>
        <rect
          x="42"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="60" y="64" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          4 6
        </text>
        <rect
          x="78"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="96" y="64" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          2 8
        </text>
        <rect
          x="6"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="24" y="100" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          3 5
        </text>
        <rect
          x="42"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="60" y="100" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          1 9
        </text>
        <rect
          x="78"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="96" y="100" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          4 6
        </text>
      </svg>
    ),
  },

  nakedPair: {
    title: 'Naked Pair',
    summary:
      'Two cells in the same unit that each contain exactly the same two candidates. Those two digits can be eliminated from every other cell in that unit.',
    Diagram: () => (
      <svg viewBox="0 0 120 72" width="120" height="72" aria-hidden="true">
        {/* Row strip: cells A,B are the pair {1,7}; cell C has 1,4,7,9 — 1 and 7 must go */}
        <rect
          x="3"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="21"
          y="30"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1
        </text>
        <text
          x="21"
          y="48"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          7
        </text>
        <rect
          x="42"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="30"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1
        </text>
        <text
          x="60"
          y="48"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          7
        </text>
        <rect
          x="81"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="99" y="22" textAnchor="middle" fontSize="8" fill="var(--cell-conflict-fg)">
          ✕1
        </text>
        <text x="99" y="36" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          4
        </text>
        <text x="99" y="50" textAnchor="middle" fontSize="8" fill="var(--cell-conflict-fg)">
          ✕7
        </text>
        <text x="99" y="64" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          9
        </text>
      </svg>
    ),
  },

  nakedTriple: {
    title: 'Naked Triple',
    summary:
      'Three cells in the same unit whose combined candidates are a subset of exactly three digits. Those three digits can be eliminated from every other cell in that unit.',
    Diagram: () => (
      <svg viewBox="0 0 156 72" width="156" height="72" aria-hidden="true">
        {/* Row strip: cells A,B,C are the triple over {1,5,8}; cell D has extras */}
        <rect
          x="3"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="21"
          y="30"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1
        </text>
        <text
          x="21"
          y="48"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          5
        </text>
        <rect
          x="42"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="24"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1
        </text>
        <text
          x="60"
          y="39"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          5
        </text>
        <text
          x="60"
          y="54"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          8
        </text>
        <rect
          x="81"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="99"
          y="30"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          5
        </text>
        <text
          x="99"
          y="48"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="var(--accent)"
        >
          8
        </text>
        <rect
          x="120"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="138" y="22" textAnchor="middle" fontSize="8" fill="var(--cell-conflict-fg)">
          ✕1
        </text>
        <text x="138" y="35" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          3
        </text>
        <text x="138" y="48" textAnchor="middle" fontSize="8" fill="var(--cell-conflict-fg)">
          ✕5
        </text>
        <text x="138" y="61" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          9
        </text>
      </svg>
    ),
  },

  hiddenPair: {
    title: 'Hidden Pair',
    summary:
      'Two digits that appear as candidates in exactly two cells within a unit. All other candidates in those two cells can be eliminated — only those two digits belong there.',
    Diagram: () => (
      <svg viewBox="0 0 120 72" width="120" height="72" aria-hidden="true">
        {/* Two highlighted cells share digits 3 and 7 exclusively */}
        <rect
          x="3"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="21" y="39" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          2 6 9
        </text>
        <rect
          x="42"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="60" y="24" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕2
        </text>
        <text
          x="60"
          y="36"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <text
          x="60"
          y="50"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          7
        </text>
        <rect
          x="81"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="99"
          y="24"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <text
          x="99"
          y="38"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          7
        </text>
        <text x="99" y="52" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕6
        </text>
      </svg>
    ),
  },

  hiddenTriple: {
    title: 'Hidden Triple',
    summary:
      'Three digits that appear as candidates only within three cells in a unit. All other candidates in those three cells can be eliminated.',
    Diagram: () => (
      <svg viewBox="0 0 120 72" width="120" height="72" aria-hidden="true">
        {/* Three cells — digits 2,6,9 appear only here; extras eliminated */}
        <rect
          x="3"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="21" y="24" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕1
        </text>
        <text
          x="21"
          y="37"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          2
        </text>
        <text
          x="21"
          y="52"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          6
        </text>
        <rect
          x="42"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="30"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          2
        </text>
        <text
          x="60"
          y="48"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          9
        </text>
        <rect
          x="81"
          y="3"
          width="36"
          height="66"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="99"
          y="24"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          6
        </text>
        <text
          x="99"
          y="38"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          9
        </text>
        <text x="99" y="52" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕4
        </text>
      </svg>
    ),
  },

  pointingPair: {
    title: 'Pointing Pair',
    summary:
      'Two cells in the same box where a digit is confined to one row or column. Since the digit must go in one of those two cells, it can be eliminated from every other cell in that row or column outside the box.',
    Diagram: () => (
      <svg viewBox="0 0 156 120" width="156" height="120" aria-hidden="true">
        {/* 3×3 box left, plus 2 extra cells showing elimination to the right */}
        {/* Box cells — row 2 has the pointing pair for digit 4 */}
        <rect
          x="3"
          y="3"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="3"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="81"
          y="3"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="3"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="81"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        {/* Row 2 — pointing pair */}
        <rect
          x="3"
          y="81"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="81"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="103"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          4
        </text>
        <rect
          x="81"
          y="81"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="99"
          y="103"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          4
        </text>
        {/* Box border */}
        <rect x="3" y="3" width="114" height="114" fill="none" stroke="var(--fg)" strokeWidth="2" />
        {/* Extension cells — 4 eliminates here */}
        <rect
          x="120"
          y="81"
          width="33"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="136" y="103" textAnchor="middle" fontSize="9" fill="var(--cell-conflict-fg)">
          ✕4
        </text>
      </svg>
    ),
  },

  nakedQuad: {
    title: 'Naked Quad',
    summary:
      'Four cells in the same unit whose combined candidates are a subset of exactly four digits. Those four digits can be eliminated from every other cell in that unit.',
    Diagram: () => (
      <svg viewBox="0 0 156 60" width="156" height="60" aria-hidden="true">
        {/* Four quad cells + one victim */}
        <rect
          x="3"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="19" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          1
        </text>
        <text x="19" y="40" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          3
        </text>
        <rect
          x="39"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="55" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          1
        </text>
        <text x="55" y="40" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          6
        </text>
        <rect
          x="75"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="91" y="20" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          3
        </text>
        <text x="91" y="34" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          6
        </text>
        <text x="91" y="48" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          9
        </text>
        <rect
          x="111"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="127"
          y="24"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1
        </text>
        <text
          x="127"
          y="40"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="var(--accent)"
        >
          9
        </text>
        {/* No room for victim here — label below */}
        <text x="78" y="60" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          quad: {'{1,3,6,9}'} → eliminate from rest of unit
        </text>
      </svg>
    ),
  },

  hiddenQuad: {
    title: 'Hidden Quad',
    summary:
      'Four digits that appear as candidates only within four cells in a unit. All other candidates in those four cells can be eliminated.',
    Diagram: () => (
      <svg viewBox="0 0 156 60" width="156" height="60" aria-hidden="true">
        {/* Four cells — digits 2,4,7,8 appear only here */}
        <rect
          x="3"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="19" y="20" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          2
        </text>
        <text x="19" y="34" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          4
        </text>
        <text x="19" y="48" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕5
        </text>
        <rect
          x="39"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="55" y="20" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          2
        </text>
        <text x="55" y="34" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          7
        </text>
        <text x="55" y="48" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕3
        </text>
        <rect
          x="75"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="91" y="20" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          4
        </text>
        <text x="91" y="34" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          8
        </text>
        <text x="91" y="48" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕6
        </text>
        <rect
          x="111"
          y="3"
          width="33"
          height="54"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="127"
          y="20"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="var(--accent)"
        >
          7
        </text>
        <text
          x="127"
          y="34"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="var(--accent)"
        >
          8
        </text>
        <text x="127" y="48" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          ✕1
        </text>
      </svg>
    ),
  },

  xWing: {
    title: 'X-Wing',
    summary:
      'A digit that appears as a candidate in exactly two cells in each of two rows, and those cells share the same two columns. The digit can be eliminated from all other cells in those two columns.',
    Diagram: () => (
      <svg viewBox="0 0 120 90" width="120" height="90" aria-hidden="true">
        {/* 2 rows × 3 cols, corners of the X highlighted */}
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          4
        </text>
        <rect
          x="42"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="78"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="96"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          4
        </text>
        {/* X lines */}
        <line
          x1="24"
          y1="42"
          x2="96"
          y2="48"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3,2"
          opacity="0.5"
        />
        <line
          x1="96"
          y1="42"
          x2="24"
          y2="48"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3,2"
          opacity="0.5"
        />
        <rect
          x="6"
          y="48"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="70"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          4
        </text>
        <rect
          x="42"
          y="48"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="78"
          y="48"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="96"
          y="70"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          4
        </text>
      </svg>
    ),
  },

  boxLineReduction: {
    title: 'Box-Line Reduction',
    summary:
      'A digit confined to one row or column within a box. Since it must go somewhere in that row/column inside the box, it can be eliminated from all other cells in that row/column outside the box.',
    Diagram: () => (
      <svg viewBox="0 0 156 120" width="156" height="120" aria-hidden="true">
        {/* 3×3 box (left) + extra cells (right), digit 6 confined to row 2 in box */}
        <rect
          x="3"
          y="3"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="3"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="81"
          y="3"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="3"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="81"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="3"
          y="81"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="81"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="103"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          6
        </text>
        <rect
          x="81"
          y="81"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="99"
          y="103"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          6
        </text>
        <rect x="3" y="3" width="114" height="114" fill="none" stroke="var(--fg)" strokeWidth="2" />
        {/* Elimination cells outside the box */}
        <rect
          x="120"
          y="81"
          width="33"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text x="136" y="103" textAnchor="middle" fontSize="9" fill="var(--cell-conflict-fg)">
          ✕6
        </text>
      </svg>
    ),
  },

  swordfish: {
    title: 'Swordfish',
    summary:
      'Like X-Wing across three rows and three columns. A digit that appears in at most three cells in each of three rows, all confined to the same three columns. The digit can be eliminated from all other cells in those three columns.',
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        {/* 3×3 grid showing swordfish pattern — highlighted cells form the fish */}
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <rect
          x="42"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="78"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="96"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <rect
          x="6"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="64"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <rect
          x="78"
          y="42"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="96"
          y="64"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <rect
          x="6"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <rect
          x="42"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="60"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          3
        </text>
        <rect
          x="78"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-bg)"
          stroke="var(--border)"
          strokeWidth="1"
        />
      </svg>
    ),
  },

  xyWing: {
    title: 'XY-Wing',
    summary:
      'Three cells forming a chain: a pivot with candidates XY, a wing with XZ, and a wing with YZ. Any cell that can see both wings cannot contain Z — it would conflict with whichever wing holds Z.',
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        {/* Pivot top-centre, two wings bottom-left and bottom-right */}
        <rect
          x="42"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="60" y="20" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          pivot
        </text>
        <text
          x="60"
          y="34"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1 7
        </text>
        <line
          x1="60"
          y1="42"
          x2="24"
          y2="78"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <line
          x1="60"
          y1="42"
          x2="96"
          y2="78"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <rect
          x="6"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--accent)"
          strokeWidth="1"
        />
        <text x="24" y="92" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          wing
        </text>
        <text
          x="24"
          y="106"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1 5
        </text>
        <rect
          x="78"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--accent)"
          strokeWidth="1"
        />
        <text x="96" y="92" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          wing
        </text>
        <text
          x="96"
          y="106"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          7 5
        </text>
        <text x="60" y="118" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          cells seeing both wings: ✕5
        </text>
      </svg>
    ),
  },

  xyzWing: {
    title: 'XYZ-Wing',
    summary:
      'Like XY-Wing but the pivot has three candidates XYZ. All three cells (pivot and both wings) share candidate Z. Any cell that can see all three cannot contain Z.',
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        {/* Same layout as XY-Wing but pivot has 3 candidates */}
        <rect
          x="42"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="60" y="19" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          pivot
        </text>
        <text x="60" y="31" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--accent)">
          1 5 7
        </text>
        <line
          x1="60"
          y1="42"
          x2="24"
          y2="78"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <line
          x1="60"
          y1="42"
          x2="96"
          y2="78"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <rect
          x="6"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--accent)"
          strokeWidth="1"
        />
        <text x="24" y="92" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          wing
        </text>
        <text
          x="24"
          y="106"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          1 5
        </text>
        <rect
          x="78"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--accent)"
          strokeWidth="1"
        />
        <text x="96" y="92" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          wing
        </text>
        <text
          x="96"
          y="106"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          5 7
        </text>
        <text x="60" y="118" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          sees all three: ✕5
        </text>
      </svg>
    ),
  },

  coloring: {
    title: 'Coloring',
    summary:
      "Assign alternating colours to a digit's conjugate pairs — cells in the same unit where the digit can only go in one of two places. If two same-coloured cells see each other, that colour is wrong and the digit can be eliminated from all cells of that colour.",
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        {/* Chain of cells alternating between two highlight states */}
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          9
        </text>
        <line
          x1="42"
          y1="24"
          x2="78"
          y2="24"
          stroke="var(--fg-muted)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <rect
          x="78"
          y="6"
          width="36"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <text
          x="96"
          y="28"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--fg-muted)"
        >
          9
        </text>
        <line
          x1="96"
          y1="42"
          x2="96"
          y2="78"
          stroke="var(--fg-muted)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <rect
          x="78"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="96"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--accent)"
        >
          9
        </text>
        <line
          x1="78"
          y1="96"
          x2="42"
          y2="96"
          stroke="var(--fg-muted)"
          strokeWidth="1"
          strokeDasharray="3,2"
        />
        <rect
          x="6"
          y="78"
          width="36"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <text
          x="24"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="var(--fg-muted)"
        >
          9
        </text>
        <text x="60" y="60" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          conjugate
        </text>
        <text x="60" y="70" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          pairs
        </text>
      </svg>
    ),
  },

  uniqueRectangle: {
    title: 'Unique Rectangle',
    summary:
      'Four cells forming a rectangle across two boxes, where the same two candidates appear in all four cells. Allowing all four cells to hold both candidates would create two solutions. Use this constraint to eliminate candidates and preserve a unique solution.',
    Diagram: () => (
      <svg viewBox="0 0 120 90" width="120" height="90" aria-hidden="true">
        {/* 2×2 rectangle of cells, two boxes side by side */}
        <rect
          x="6"
          y="6"
          width="48"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="30"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          2 8
        </text>
        <rect
          x="66"
          y="6"
          width="48"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="90"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          2 8
        </text>
        <rect
          x="6"
          y="48"
          width="48"
          height="36"
          fill="var(--cell-selected)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text
          x="30"
          y="70"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="var(--accent)"
        >
          2 8
        </text>
        <rect
          x="66"
          y="48"
          width="48"
          height="36"
          fill="var(--cell-hint)"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <text x="82" y="68" textAnchor="middle" fontSize="8" fill="var(--fg-muted)">
          2 8
        </text>
        <text x="100" y="68" textAnchor="middle" fontSize="9" fill="var(--accent)">
          +X
        </text>
        <text x="60" y="88" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          4th cell must differ to keep solution unique
        </text>
      </svg>
    ),
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/hints/explainers/index.test.tsx`
Expected: all 4 tests PASS

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/hints/explainers/index.tsx src/hints/explainers/index.test.tsx
git commit -m "feat(hints): add technique explainer content for all 16 techniques"
```

---

## Task 2: TechniqueExplainer modal

**Files:**

- Create: `src/hints/TechniqueExplainer.tsx`
- Create: `src/hints/TechniqueExplainer.css`
- Create: `src/hints/TechniqueExplainer.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/hints/TechniqueExplainer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechniqueExplainer } from './TechniqueExplainer';

describe('TechniqueExplainer', () => {
  it('renders nothing when technique is null', () => {
    render(<TechniqueExplainer technique={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog when technique is provided', () => {
    render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the correct title for the technique', () => {
    render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /naked single/i })).toBeInTheDocument();
  });

  it('renders the summary text', () => {
    render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(screen.getByText(/only one digit is possible/i)).toBeInTheDocument();
  });

  it('renders an svg diagram', () => {
    const { container } = render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('card click does not call onClose', () => {
    const onClose = vi.fn();
    render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders correctly for a different technique', () => {
    render(<TechniqueExplainer technique="xWing" onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /x-wing/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/hints/TechniqueExplainer.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create TechniqueExplainer.tsx**

```tsx
// src/hints/TechniqueExplainer.tsx
import './TechniqueExplainer.css';
import { useEffect, useRef } from 'react';
import type { TechniqueName } from '../solver/types';
import { EXPLAINERS } from './explainers/index';

type Props = {
  technique: TechniqueName | null;
  onClose: () => void;
};

export function TechniqueExplainer({ technique, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!technique) return;
    cardRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [technique, onClose]);

  if (!technique) return null;

  const { title, summary, Diagram } = EXPLAINERS[technique];

  return (
    <div className="technique-explainer__backdrop" onClick={onClose}>
      <div
        className="technique-explainer__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="technique-explainer-title"
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="technique-explainer__header">
          <h2 id="technique-explainer-title" className="technique-explainer__title">
            {title}
          </h2>
          <button className="technique-explainer__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="technique-explainer__diagram">
          <Diagram />
        </div>
        <p className="technique-explainer__summary">{summary}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TechniqueExplainer.css**

```css
/* src/hints/TechniqueExplainer.css */
.technique-explainer__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.technique-explainer__card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 280px;
  max-width: 360px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  outline: none;
}

.technique-explainer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.technique-explainer__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--fg);
}

.technique-explainer__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--fg-muted);
  padding: 4px 8px;
  line-height: 1;
  border-radius: 4px;
  min-height: 44px;
  min-width: 44px;
}

.technique-explainer__diagram {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.technique-explainer__summary {
  margin: 0;
  font-size: 0.875rem;
  color: var(--fg);
  line-height: 1.5;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/hints/TechniqueExplainer.test.tsx`
Expected: all 10 tests PASS

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/hints/TechniqueExplainer.tsx src/hints/TechniqueExplainer.css src/hints/TechniqueExplainer.test.tsx
git commit -m "feat(hints): add TechniqueExplainer modal"
```

---

## Task 3: Wire "What is this?" into HintPanel

**Files:**

- Modify: `src/hints/HintPanel.tsx`
- Modify: `src/hints/HintPanel.css`
- Modify: `src/hints/HintPanel.test.tsx`

- [ ] **Step 1: Write the new failing tests**

Replace the entire contents of `src/hints/HintPanel.test.tsx` with:

```tsx
// src/hints/HintPanel.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { initialEmptyState } from '../game/reducers';
import { useGameStore } from '../game/store';
import { HintPanel } from './HintPanel';
import type { Step } from '../solver/types';
import type { Digit } from '../types';

const mockStep: Step = {
  technique: 'nakedSingle',
  highlights: [{ row: 0, col: 8 }],
  placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
  eliminations: [],
  explanation: 'Cell (0,8) is the only cell in row 0 that can contain 9.',
};

describe('HintPanel', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('shows a Hint button when no hint is active', () => {
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /^hint$/i })).toBeTruthy();
  });

  it('shows level-1 text when hintLevel is 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByText } = render(<HintPanel />);
    expect(getByText(/there is a technique you can apply/i)).toBeTruthy();
  });

  it('shows technique name at level 2', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    const { getByText } = render(<HintPanel />);
    expect(getByText('Naked Single')).toBeTruthy();
  });

  it('shows Show more button at level 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /show more/i })).toBeTruthy();
  });

  it('hides Show more button at level 4', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 4 });
    const { queryByRole } = render(<HintPanel />);
    expect(queryByRole('button', { name: /show more/i })).toBeNull();
  });

  it('shows dismiss button when hint is active', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /dismiss hint/i })).toBeTruthy();
  });

  it('clicking Hint button on empty board leaves currentHint null', () => {
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /^hint$/i }));
    expect(useGameStore.getState().currentHint).toBeNull();
  });

  it('clicking Show more advances hintLevel', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /show more/i }));
    expect(useGameStore.getState().hintLevel).toBe(2);
  });

  it('clicking dismiss clears currentHint', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /dismiss hint/i }));
    expect(useGameStore.getState().currentHint).toBeNull();
  });

  it('shows technique name at level 3 (cells highlighted but no explanation yet)', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 3 });
    const { getByText, queryByText } = render(<HintPanel />);
    expect(getByText('Naked Single')).toBeTruthy();
    expect(queryByText(mockStep.explanation)).toBeNull();
  });

  // New tests for "What is this?" link
  it('shows "What is this?" link at level 2', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    render(<HintPanel />);
    expect(screen.getByRole('button', { name: /what is this/i })).toBeInTheDocument();
  });

  it('shows "What is this?" link at level 3', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 3 });
    render(<HintPanel />);
    expect(screen.getByRole('button', { name: /what is this/i })).toBeInTheDocument();
  });

  it('does not show "What is this?" link at level 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    render(<HintPanel />);
    expect(screen.queryByRole('button', { name: /what is this/i })).not.toBeInTheDocument();
  });

  it('does not show "What is this?" link at level 4', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 4 });
    render(<HintPanel />);
    expect(screen.queryByRole('button', { name: /what is this/i })).not.toBeInTheDocument();
  });

  it('clicking "What is this?" opens the explainer dialog', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    render(<HintPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /what is this/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closing the explainer dialog hides it', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    render(<HintPanel />);
    fireEvent.click(screen.getByRole('button', { name: /what is this/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm new ones fail**

Run: `npx vitest run src/hints/HintPanel.test.tsx`
Expected: the 6 new "What is this?" tests FAIL; existing 10 pass

- [ ] **Step 3: Update HintPanel.tsx**

```tsx
// src/hints/HintPanel.tsx
import './HintPanel.css';
import { useState } from 'react';
import { useGameStore } from '../game/store';
import { TECHNIQUE_LABELS } from './engine';
import { TechniqueExplainer } from './TechniqueExplainer';
import type { TechniqueName } from '../solver/types';

export function HintPanel() {
  const currentHint = useGameStore((s) => s.currentHint);
  const hintLevel = useGameStore((s) => s.hintLevel);
  const [explainerTechnique, setExplainerTechnique] = useState<TechniqueName | null>(null);

  const handleRequestHint = () => useGameStore.getState().requestHint();
  const handleAdvanceHint = () => useGameStore.getState().advanceHint();
  const handleDismissHint = () => useGameStore.getState().dismissHint();

  if (currentHint === null) {
    return (
      <div className="hint-panel" onClick={(e) => e.stopPropagation()}>
        <button className="hint-panel__request" onClick={handleRequestHint}>
          Hint
        </button>
      </div>
    );
  }

  return (
    <div className="hint-panel hint-panel--active" onClick={(e) => e.stopPropagation()}>
      <button className="hint-panel__dismiss" onClick={handleDismissHint} aria-label="Dismiss hint">
        ×
      </button>
      <div className="hint-panel__content">
        {hintLevel === 1 && <span>There is a technique you can apply.</span>}
        {hintLevel >= 2 && (
          <span className="hint-panel__technique-row">
            <span>{TECHNIQUE_LABELS[currentHint.technique]}</span>
            {hintLevel < 4 && (
              <button
                className="hint-panel__explainer-link"
                onClick={() => setExplainerTechnique(currentHint.technique)}
              >
                What is this?
              </button>
            )}
          </span>
        )}
        {hintLevel >= 4 && <p className="hint-panel__explanation">{currentHint.explanation}</p>}
      </div>
      {hintLevel < 4 && (
        <button className="hint-panel__more" onClick={handleAdvanceHint}>
          Show more
        </button>
      )}
      <TechniqueExplainer
        technique={explainerTechnique}
        onClose={() => setExplainerTechnique(null)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Update HintPanel.css — add link and row styles**

Add these rules at the end of `src/hints/HintPanel.css`:

```css
.hint-panel__technique-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hint-panel__explainer-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--accent);
  text-decoration: underline;
  line-height: 1;
}
```

- [ ] **Step 5: Run all HintPanel tests**

Run: `npx vitest run src/hints/HintPanel.test.tsx`
Expected: all 16 tests PASS

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS — note the final count

- [ ] **Step 7: Commit**

```bash
git add src/hints/HintPanel.tsx src/hints/HintPanel.css src/hints/HintPanel.test.tsx
git commit -m "feat(hints): add 'What is this?' link to HintPanel at levels 2 and 3"
```
