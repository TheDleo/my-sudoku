import { describe, it, expect } from 'vitest';
import type { Digit } from '../../types';
import type { SolverState } from '../types';
import { coloring } from './coloring';

const ALL: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function emptyState(): SolverState {
  return {
    values: Array.from({ length: 9 }, () => Array.from({ length: 9 }, (): Digit | null => null)),
    candidates: Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set<Digit>(ALL)),
    ),
  };
}

function clearAllCandidates(state: SolverState): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      state.candidates[r]![c] = new Set<Digit>();
    }
  }
}

describe('coloring (simple)', () => {
  it('returns null on an empty board', () => {
    expect(coloring(emptyState())).toBeNull();
  });

  it('returns null when no conjugate pairs exist for any digit', () => {
    const state = emptyState();
    clearAllCandidates(state);
    state.candidates[0]![0] = new Set<Digit>([5]);
    expect(coloring(state)).toBeNull();
  });

  it('color trap: chain creates a cell visible to both colors → eliminate', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 5;
    // Chain: (0,0) – (0,8) – (8,8) – (8,0). Row 0, col 8, row 8 are conjugate.
    // Col 0 has THREE cells with d: (0,0), (8,0), (4,0). Col 0 NOT conjugate; no col-0 edge.
    state.candidates[0]![0] = new Set<Digit>([d]);
    state.candidates[0]![8] = new Set<Digit>([d]);
    state.candidates[8]![8] = new Set<Digit>([d]);
    state.candidates[8]![0] = new Set<Digit>([d]);
    state.candidates[4]![0] = new Set<Digit>([d, 1]); // sees (0,0)=A and (8,0)=B via col 0
    const step = coloring(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('coloring');
    expect(step?.placements).toEqual([]);
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 0 }, digit: d });
    expect(step?.colorGroups).toBeDefined();
    expect(step?.colorGroups!.a.length).toBeGreaterThan(0);
    expect(step?.colorGroups!.b.length).toBeGreaterThan(0);
    const allGroupCells = [...step!.colorGroups!.a, ...step!.colorGroups!.b]
      .map((c) => `${c.row},${c.col}`)
      .sort();
    const highlightCells = step!.highlights.map((c) => `${c.row},${c.col}`).sort();
    expect(allGroupCells).toEqual(highlightCells);
  });

  it('color wrap: two same-colored cells share a unit → eliminate that color', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 7;
    // Cells with d=7: (0,0), (0,4), (4,0), (4,2), (4,4).
    // Edges: row 0 ((0,0)-(0,4)); col 0 ((0,0)-(4,0)); col 4 ((0,4)-(4,4)); box 3 ((4,0)-(4,2)).
    // Coloring from (0,0)=A: (0,4)=B, (4,0)=B, (4,4)=A, (4,2)=A.
    // A-cells (4,4) and (4,2) share row 4 → WRAP fires → eliminate d from A cells.
    state.candidates[0]![0] = new Set<Digit>([d]);
    state.candidates[0]![4] = new Set<Digit>([d]);
    state.candidates[4]![4] = new Set<Digit>([d]);
    state.candidates[4]![0] = new Set<Digit>([d]);
    state.candidates[4]![2] = new Set<Digit>([d]);
    const step = coloring(state);
    expect(step).not.toBeNull();
    expect(step?.technique).toBe('coloring');
    expect(step?.eliminations).toContainEqual({ cell: { row: 0, col: 0 }, digit: d });
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 4 }, digit: d });
    expect(step?.eliminations).toContainEqual({ cell: { row: 4, col: 2 }, digit: d });
    expect(step?.eliminations.length).toBe(3);
    expect(step?.colorGroups).toBeDefined();
    expect(step?.colorGroups!.a.length).toBeGreaterThan(0);
    expect(step?.colorGroups!.b.length).toBeGreaterThan(0);
    const allGroupCells = [...step!.colorGroups!.a, ...step!.colorGroups!.b]
      .map((c) => `${c.row},${c.col}`)
      .sort();
    const highlightCells = step!.highlights.map((c) => `${c.row},${c.col}`).sort();
    expect(allGroupCells).toEqual(highlightCells);
  });

  it('does not fire when the chain is fully contained (no outside cells with d)', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 5;
    state.candidates[0]![0] = new Set<Digit>([d]);
    state.candidates[0]![4] = new Set<Digit>([d]);
    expect(coloring(state)).toBeNull();
  });

  it('does not double-fire on a 2-node component alone', () => {
    const state = emptyState();
    clearAllCandidates(state);
    const d: Digit = 3;
    state.candidates[0]![0] = new Set<Digit>([d, 5]);
    state.candidates[0]![1] = new Set<Digit>([d, 7]);
    state.candidates[5]![5] = new Set<Digit>([d, 9]);
    expect(coloring(state)).toBeNull();
  });
});
