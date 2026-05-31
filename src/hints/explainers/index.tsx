import type { TechniqueName } from '../../solver/types';

export type ExplainerContent = {
  title: string;
  summary: string;
  Diagram: React.FC;
};

export const EXPLAINERS: Record<TechniqueName, ExplainerContent> = {
  nakedSingle: {
    title: 'Naked Single',
    summary:
      "A cell where only one digit is possible. Every other digit has been eliminated by the cell's row, column, or box. When you find one, place the digit.",
    Diagram: () => (
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
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
        <rect x="3" y="3" width="114" height="114" fill="none" stroke="var(--fg)" strokeWidth="2" />
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
        <text x="78" y="60" textAnchor="middle" fontSize="7" fill="var(--fg-muted)">
          {`quad: {1,3,6,9} → eliminate from rest of unit`}
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
