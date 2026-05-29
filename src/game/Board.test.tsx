import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { makePuzzle } from './testHelpers';
import { Board } from './Board';

describe('Board', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders exactly 81 cells', () => {
    const { container } = render(<Board />);
    expect(container.querySelectorAll('.cell')).toHaveLength(81);
  });

  it('applies given styling to cells whose given flag is true', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    const { container } = render(<Board />);
    // makePuzzle sets (0,0)=5 as a given
    const cell00 = container.querySelector('[data-row="0"][data-col="0"]');
    expect(cell00?.querySelector('.cell__digit--given')).toBeTruthy();
  });

  it('applies user styling to a non-given placed digit', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    const { container } = render(<Board />);
    const cell11 = container.querySelector('[data-row="1"][data-col="1"]');
    expect(cell11?.querySelector('.cell__digit--user')).toBeTruthy();
  });

  it('applies .cell--selected to the selected cell', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 2, col: 3 }, number: null },
    });
    const { container } = render(<Board />);
    const cell = container.querySelector('[data-row="2"][data-col="3"]');
    expect(cell).toHaveClass('cell--selected');
  });

  it('applies .cell--peer to peers of the selected cell and not to unrelated cells', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: null },
    });
    const { container } = render(<Board />);
    // (0,1) shares row 0 with (0,0) — it is a peer
    const peer = container.querySelector('[data-row="0"][data-col="1"]');
    expect(peer).toHaveClass('cell--peer');
    // (3,3) is not a peer of (0,0)
    const notPeer = container.querySelector('[data-row="3"][data-col="3"]');
    expect(notPeer).not.toHaveClass('cell--peer');
  });

  describe('click handling', () => {
    it('clicking an empty cell selects it and clears selection.number', () => {
      const { container } = render(<Board />);
      const cell = container.querySelector('[data-row="1"][data-col="1"]')!;
      fireEvent.click(cell);
      const { selection } = useGameStore.getState();
      expect(selection.cell).toEqual({ row: 1, col: 1 });
      expect(selection.number).toBeNull();
    });

    it('clicking a filled cell selects it and sets selection.number to that digit', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      const { container } = render(<Board />);
      // makePuzzle places given digit 5 at (0,0)
      const cell = container.querySelector('[data-row="0"][data-col="0"]')!;
      fireEvent.click(cell);
      const { selection } = useGameStore.getState();
      expect(selection.cell).toEqual({ row: 0, col: 0 });
      expect(selection.number).toBe(5);
    });

    it('clicking the already-selected cell deselects it', () => {
      useGameStore.setState({
        ...initialEmptyState,
        selection: { cell: { row: 2, col: 3 }, number: null },
      });
      const { container } = render(<Board />);
      const cell = container.querySelector('[data-row="2"][data-col="3"]')!;
      fireEvent.click(cell);
      expect(useGameStore.getState().selection.cell).toBeNull();
    });

    it('clicking the board background deselects', () => {
      useGameStore.setState({
        ...initialEmptyState,
        selection: { cell: { row: 2, col: 3 }, number: null },
      });
      const { container } = render(<Board />);
      // Click the .board div itself — its target has no data-row/data-col
      fireEvent.click(container.querySelector('.board')!);
      expect(useGameStore.getState().selection.cell).toBeNull();
    });
  });

  describe('keyboard handling', () => {
    it('ArrowRight moves selection right', () => {
      useGameStore.setState({
        ...initialEmptyState,
        selection: { cell: { row: 3, col: 3 }, number: null },
      });
      const { container } = render(<Board />);
      const board = container.querySelector('.board') as HTMLElement;
      fireEvent.keyDown(board, { key: 'ArrowRight' });
      expect(useGameStore.getState().selection.cell).toEqual({ row: 3, col: 4 });
    });

    it('digit key places a digit in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      const { container } = render(<Board />);
      const board = container.querySelector('.board') as HTMLElement;
      fireEvent.keyDown(board, { key: '3' });
      expect(useGameStore.getState().cells[1]![1]!.value).toBe(3);
    });

    it('Escape deselects the selected cell', () => {
      useGameStore.setState({
        ...initialEmptyState,
        selection: { cell: { row: 2, col: 2 }, number: null },
      });
      const { container } = render(<Board />);
      const board = container.querySelector('.board') as HTMLElement;
      fireEvent.keyDown(board, { key: 'Escape' });
      expect(useGameStore.getState().selection.cell).toBeNull();
    });
  });
});
