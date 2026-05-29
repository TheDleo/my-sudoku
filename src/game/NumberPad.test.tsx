import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { makePuzzle } from './testHelpers';
import { cloneCells } from './helpers';
import { NumberPad } from './NumberPad';

describe('NumberPad', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders 9 digit buttons and an erase button', () => {
    const { getAllByRole } = render(<NumberPad />);
    expect(getAllByRole('button')).toHaveLength(10);
  });

  describe('digit tap — cell selected, normal mode', () => {
    it('places the digit in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      const { container } = render(<NumberPad />);
      const btn = container.querySelector('[data-digit="3"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(useGameStore.getState().cells[1]![1]!.value).toBe(3);
    });
  });

  describe('digit tap — cell selected, pencil mode', () => {
    it('toggles a pencil mark in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.setState({ ...useGameStore.getState(), pencilMode: true });
      const { container } = render(<NumberPad />);
      const btn = container.querySelector('[data-digit="4"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.has(4 as Digit)).toBe(true);
    });
  });

  describe('digit tap — no cell selected', () => {
    it('sets selection.number for highlight-only mode', () => {
      const { container } = render(<NumberPad />);
      const btn = container.querySelector('[data-digit="7"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(useGameStore.getState().selection.number).toBe(7);
      expect(useGameStore.getState().selection.cell).toBeNull();
    });
  });

  describe('erase button', () => {
    it('clears the value in the selected cell', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().placeDigit(3 as Digit);
      const { container } = render(<NumberPad />);
      const eraseBtn = container.querySelector('.number-pad__erase') as HTMLButtonElement;
      fireEvent.click(eraseBtn);
      expect(useGameStore.getState().cells[1]![1]!.value).toBeNull();
    });
  });

  describe('remaining counts', () => {
    it('shows the remaining count on each digit button', () => {
      const cells = cloneCells(initialEmptyState.cells);
      cells[0]![0]!.value = 5 as Digit;
      cells[1]![3]!.value = 5 as Digit;
      useGameStore.setState({ ...initialEmptyState, cells });
      const { container } = render(<NumberPad />);
      const btn5 = container.querySelector('[data-digit="5"]')!;
      expect(btn5.querySelector('.number-pad__count')?.textContent).toBe('7');
    });

    it('disables a digit button when remaining count reaches 0', () => {
      const cells = cloneCells(initialEmptyState.cells);
      // Place digit 1 in all 9 cells of row 0 (9 placements → 0 remaining)
      for (let c = 0; c < 9; c++) {
        cells[0]![c]!.value = 1 as Digit;
      }
      useGameStore.setState({ ...initialEmptyState, cells });
      const { container } = render(<NumberPad />);
      const btn1 = container.querySelector('[data-digit="1"]') as HTMLButtonElement;
      expect(btn1.disabled).toBe(true);
    });
  });

  describe('click propagation', () => {
    it('does not bubble digit taps to the parent element', () => {
      const parentClick = vi.fn();
      const { container } = render(
        <div onClick={parentClick}>
          <NumberPad />
        </div>,
      );
      const btn = container.querySelector('[data-digit="1"]') as HTMLButtonElement;
      fireEvent.click(btn);
      expect(parentClick).not.toHaveBeenCalled();
    });
  });
});
