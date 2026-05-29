import { describe, it, expect } from 'vitest';
import { initialEmptyState } from './reducers';
import { getHighlights } from './highlights';
import { cloneCells } from './helpers';
import type { Digit } from '../types';

describe('getHighlights', () => {
  describe('empty state', () => {
    it('returns an all-null 9×9 map when there is no selection', () => {
      const map = getHighlights(initialEmptyState);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(map[r]![c]).toBeNull();
        }
      }
    });
  });

  describe('selected', () => {
    it('marks the selected cell as "selected"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 2, col: 3 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[2]![3]).toBe('selected');
    });

    it('returns all-null when selection.cell is null', () => {
      const map = getHighlights(initialEmptyState);
      expect(map[4]![4]).toBeNull();
    });
  });

  describe('peer', () => {
    it('marks cells in the same row as the selected cell as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[0]![1]).toBe('peer');
      expect(map[0]![8]).toBe('peer');
    });

    it('marks cells in the same column as the selected cell as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[1]![0]).toBe('peer');
      expect(map[8]![0]).toBe('peer');
    });

    it('marks cells in the same box as the selected cell as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[1]![1]).toBe('peer');
      expect(map[2]![2]).toBe('peer');
    });

    it('does not mark unrelated cells as "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[3]![3]).toBeNull();
      expect(map[5]![7]).toBeNull();
    });

    it('the selected cell itself is "selected", not "peer"', () => {
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('selected');
    });
  });

  describe('conflict', () => {
    it('marks both cells as "conflict" when two cells share the same digit in the same row', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      cells[0]![3]!.value = 5 as Digit;
      const state = { ...initialEmptyState, cells };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('conflict');
      expect(map[0]![3]).toBe('conflict');
      expect(map[1]![0]).toBeNull();
    });

    it('marks both cells as "conflict" when two cells share the same digit in the same column', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 3 as Digit;
      cells[5]![0]!.value = 3 as Digit;
      const state = { ...initialEmptyState, cells };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('conflict');
      expect(map[5]![0]).toBe('conflict');
    });

    it('marks both cells as "conflict" when two cells share the same digit in the same box', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 7 as Digit;
      cells[2]![2]!.value = 7 as Digit;
      const state = { ...initialEmptyState, cells };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('conflict');
      expect(map[2]![2]).toBe('conflict');
    });

    it('does not mark unique digits as conflicts', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      cells[0]![3]!.value = 6 as Digit;
      const state = { ...initialEmptyState, cells };
      const map = getHighlights(state);
      expect(map[0]![0]).toBeNull();
      expect(map[0]![3]).toBeNull();
    });
  });

  describe('possible', () => {
    it('marks empty cells whose candidates include selection.number as "possible"', () => {
      // Empty board: every cell is a valid candidate for every digit
      const state = {
        ...initialEmptyState,
        selection: { cell: null, number: 5 as Digit },
      };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('possible');
      expect(map[4]![4]).toBe('possible');
      expect(map[8]![8]).toBe('possible');
    });

    it('does not mark filled cells as "possible"', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      const state = {
        ...initialEmptyState,
        cells,
        selection: { cell: null, number: 5 as Digit },
      };
      const map = getHighlights(state);
      expect(map[0]![0]).toBeNull();
    });

    it('does not mark cells eliminated from candidates as "possible"', () => {
      // Placing 5 at (0,0) eliminates 5 from all of row 0, col 0, and box 0
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      const state = {
        ...initialEmptyState,
        cells,
        selection: { cell: null, number: 5 as Digit },
      };
      const map = getHighlights(state);
      expect(map[0]![3]).toBeNull(); // same row as (0,0) — 5 eliminated
      expect(map[4]![0]).toBeNull(); // same col as (0,0) — 5 eliminated
      expect(map[1]![1]).toBeNull(); // same box as (0,0) — 5 eliminated
    });

    it('returns all-null when selection.number is null', () => {
      const map = getHighlights(initialEmptyState);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(map[r]![c]).toBeNull();
        }
      }
    });
  });

  describe('priority', () => {
    it('"selected" beats "conflict": a conflicted cell that is also selected shows "selected"', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      cells[0]![1]!.value = 5 as Digit; // conflict in row 0
      const state = {
        ...initialEmptyState,
        cells,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[0]![0]).toBe('selected');
      expect(map[0]![1]).toBe('conflict');
    });

    it('"conflict" beats "peer": a peer cell that also conflicts shows "conflict"', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      cells[0]![1]!.value = 5 as Digit; // (0,1) is a peer of (0,0) AND conflicts
      const state = {
        ...initialEmptyState,
        cells,
        selection: { cell: { row: 0, col: 0 }, number: null },
      };
      const map = getHighlights(state);
      expect(map[0]![1]).toBe('conflict');
    });

    it('"peer" beats "possible": a peer cell that is also a possible placement shows "peer"', () => {
      // Empty board: all cells are candidates for 5
      // (0,1) is both a peer of (0,0) and a possible placement for 5
      const state = {
        ...initialEmptyState,
        selection: { cell: { row: 0, col: 0 }, number: 5 as Digit },
      };
      const map = getHighlights(state);
      expect(map[0]![1]).toBe('peer'); // peer beats possible
      expect(map[0]![0]).toBe('selected'); // selected beats peer and possible
      expect(map[3]![3]).toBe('possible'); // non-peer empty cell with 5 as candidate
    });
  });
});
