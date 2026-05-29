import { describe, it, expect } from 'vitest';
import { initialEmptyState } from './reducers';
import { getHighlights } from './highlights';

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
});
