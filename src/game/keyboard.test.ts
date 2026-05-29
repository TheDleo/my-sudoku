import { describe, it, expect, vi } from 'vitest';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { handleKey } from './keyboard';

function makeEvent(key: string, shiftKey = false) {
  return { key, shiftKey, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

function makeState(overrides: Partial<typeof initialEmptyState> = {}) {
  return { ...initialEmptyState, ...overrides };
}

function makeActions() {
  return {
    selectCell: vi.fn(),
    setSelectedNumber: vi.fn(),
    placeDigit: vi.fn(),
    eraseCell: vi.fn(),
    togglePencilMark: vi.fn(),
  };
}

describe('handleKey', () => {
  describe('arrow keys', () => {
    it('ArrowUp moves cursor up by 1', () => {
      const e = makeEvent('ArrowUp');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 2, col: 3 });
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('ArrowDown moves cursor down by 1', () => {
      const e = makeEvent('ArrowDown');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 4, col: 3 });
    });

    it('ArrowLeft moves cursor left by 1', () => {
      const e = makeEvent('ArrowLeft');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 2 });
    });

    it('ArrowRight moves cursor right by 1', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 4 });
    });

    it('ArrowUp clamps at row 0', () => {
      const e = makeEvent('ArrowUp');
      const state = makeState({ selection: { cell: { row: 0, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 0, col: 3 });
    });

    it('ArrowDown clamps at row 8', () => {
      const e = makeEvent('ArrowDown');
      const state = makeState({ selection: { cell: { row: 8, col: 3 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 8, col: 3 });
    });

    it('ArrowLeft clamps at col 0', () => {
      const e = makeEvent('ArrowLeft');
      const state = makeState({ selection: { cell: { row: 3, col: 0 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 0 });
    });

    it('ArrowRight clamps at col 8', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: { row: 3, col: 8 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith({ row: 3, col: 8 });
    });

    it('arrow keys are no-op (no selectCell) when no cell selected, but still call preventDefault', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).not.toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('arrow keys do not call setSelectedNumber (preserve selection.number)', () => {
      const e = makeEvent('ArrowRight');
      const state = makeState({ selection: { cell: { row: 3, col: 3 }, number: 5 as Digit } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.setSelectedNumber).not.toHaveBeenCalled();
    });
  });

  describe('Escape', () => {
    it('Escape deselects and clears selected number', () => {
      const e = makeEvent('Escape');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: 5 as Digit } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith(null);
      expect(actions.setSelectedNumber).toHaveBeenCalledWith(null);
    });

    it('Escape works even when no cell is selected', () => {
      const e = makeEvent('Escape');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.selectCell).toHaveBeenCalledWith(null);
      expect(actions.setSelectedNumber).toHaveBeenCalledWith(null);
    });
  });

  describe('Backspace / Delete', () => {
    it('Backspace calls eraseCell when a cell is selected', () => {
      const e = makeEvent('Backspace');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.eraseCell).toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('Delete calls eraseCell when a cell is selected', () => {
      const e = makeEvent('Delete');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.eraseCell).toHaveBeenCalled();
    });

    it('Backspace is no-op when no cell is selected', () => {
      const e = makeEvent('Backspace');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.eraseCell).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('digit keys', () => {
    it('digit key calls placeDigit when pencilMode is false', () => {
      const e = makeEvent('5');
      const state = makeState({
        selection: { cell: { row: 2, col: 2 }, number: null },
        pencilMode: false,
      });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.placeDigit).toHaveBeenCalledWith(5 as Digit);
      expect(actions.togglePencilMark).not.toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('digit key calls togglePencilMark when pencilMode is true', () => {
      const e = makeEvent('3');
      const state = makeState({
        selection: { cell: { row: 2, col: 2 }, number: null },
        pencilMode: true,
      });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.togglePencilMark).toHaveBeenCalledWith(3 as Digit);
      expect(actions.placeDigit).not.toHaveBeenCalled();
    });

    it('Shift+digit calls togglePencilMark regardless of pencilMode', () => {
      const e = makeEvent('7', true);
      const state = makeState({
        selection: { cell: { row: 2, col: 2 }, number: null },
        pencilMode: false,
      });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.togglePencilMark).toHaveBeenCalledWith(7 as Digit);
      expect(actions.placeDigit).not.toHaveBeenCalled();
    });

    it('digit key is no-op when no cell is selected', () => {
      const e = makeEvent('5');
      const state = makeState({ selection: { cell: null, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.placeDigit).not.toHaveBeenCalled();
      expect(actions.togglePencilMark).not.toHaveBeenCalled();
    });
  });

  describe('unrecognized keys', () => {
    it('letter keys are no-ops and do not call preventDefault', () => {
      const e = makeEvent('a');
      const state = makeState({ selection: { cell: { row: 2, col: 2 }, number: null } });
      const actions = makeActions();
      handleKey(e, state, actions);
      expect(actions.placeDigit).not.toHaveBeenCalled();
      expect(actions.eraseCell).not.toHaveBeenCalled();
      expect(actions.selectCell).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
    });
  });
});
