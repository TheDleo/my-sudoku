import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
});
