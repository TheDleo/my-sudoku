import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { Digit } from '../types';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { cloneCells } from './helpers';
import { Cell } from './Cell';
import { cellAriaLabel } from './cellAriaLabel';

function seedCell(
  row: number,
  col: number,
  value: Digit | null,
  pencilMarks: Digit[] = [],
  isGiven = false,
) {
  const cells = cloneCells(initialEmptyState.cells);
  cells[row]![col]!.value = value;
  cells[row]![col]!.pencilMarks = new Set(pencilMarks);
  const given = initialEmptyState.given.map((r) => [...r]);
  given[row]![col] = isGiven;
  useGameStore.setState({ cells, given });
}

describe('cellAriaLabel', () => {
  it('labels a given digit', () => {
    const cell = { value: 5 as Digit, pencilMarks: new Set<Digit>() };
    expect(cellAriaLabel(2, 6, cell, true)).toBe('Row 3, column 7, given 5');
  });

  it('labels a user-placed digit', () => {
    const cell = { value: 5 as Digit, pencilMarks: new Set<Digit>() };
    expect(cellAriaLabel(2, 6, cell, false)).toBe('Row 3, column 7, your 5');
  });

  it('labels pencil marks sorted', () => {
    const cell = { value: null, pencilMarks: new Set([7, 1, 4] as Digit[]) };
    expect(cellAriaLabel(2, 6, cell, false)).toBe('Row 3, column 7, candidates 1 4 7');
  });

  it('labels an empty cell', () => {
    const cell = { value: null, pencilMarks: new Set<Digit>() };
    expect(cellAriaLabel(2, 6, cell, false)).toBe('Row 3, column 7, empty');
  });
});

describe('Cell', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  describe('digit rendering', () => {
    it('renders the digit text when cell has a value', () => {
      seedCell(0, 0, 5 as Digit);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toHaveTextContent('5');
    });

    it('applies the given class to a given digit', () => {
      seedCell(0, 0, 5 as Digit, [], true);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toHaveClass('cell__digit--given');
      expect(container.querySelector('.cell__digit')).not.toHaveClass('cell__digit--user');
    });

    it('applies the user class to a user-entered digit', () => {
      seedCell(0, 0, 5 as Digit, [], false);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toHaveClass('cell__digit--user');
      expect(container.querySelector('.cell__digit')).not.toHaveClass('cell__digit--given');
    });

    it('renders nothing when cell is empty with no pencil marks', () => {
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__digit')).toBeNull();
      expect(container.querySelector('.cell__pencil-grid')).toBeNull();
    });
  });

  describe('pencil marks', () => {
    it('renders 9 pencil-mark slots when pencilMarks is non-empty', () => {
      seedCell(0, 0, null, [1, 5, 9] as Digit[]);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelectorAll('.cell__pencil-mark')).toHaveLength(9);
    });

    it('shows each mark at its fixed position in the 3×3 grid', () => {
      seedCell(0, 0, null, [1, 5, 9] as Digit[]);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      // Positions 0–8 correspond to digits 1–9
      expect(marks[0]?.textContent).toBe('1');
      expect(marks[4]?.textContent).toBe('5');
      expect(marks[8]?.textContent).toBe('9');
    });

    it('leaves absent marks blank', () => {
      seedCell(0, 0, null, [1] as Digit[]);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      expect(marks[1]?.textContent).toBe(''); // digit 2 not set
    });

    it('does not render the pencil grid when cell has a value', () => {
      seedCell(0, 0, 5 as Digit);
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect(container.querySelector('.cell__pencil-grid')).toBeNull();
    });

    it('applies cell__pencil-mark--highlighted to the pencil mark matching selection.number', () => {
      seedCell(0, 0, null, [3, 5, 7] as Digit[]);
      useGameStore.setState({ selection: { cell: null, number: 5 as Digit } });
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      // PENCIL_POSITIONS = [1,2,3,4,5,6,7,8,9] → digit 5 is at index 4, 3 at index 2, 7 at index 6
      expect(marks[4]).toHaveClass('cell__pencil-mark--highlighted');
      expect(marks[2]).not.toHaveClass('cell__pencil-mark--highlighted');
      expect(marks[6]).not.toHaveClass('cell__pencil-mark--highlighted');
    });

    it('does not apply the highlighted class when selection.number is null', () => {
      seedCell(0, 0, null, [5] as Digit[]);
      useGameStore.setState({ selection: { cell: null, number: null } });
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      expect(marks[4]).not.toHaveClass('cell__pencil-mark--highlighted');
    });

    it('does not apply the highlighted class when selectedNumber is not in pencilMarks', () => {
      seedCell(0, 0, null, [3, 7] as Digit[]);
      useGameStore.setState({ selection: { cell: null, number: 5 as Digit } });
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      const marks = container.querySelectorAll('.cell__pencil-mark');
      expect(marks[4]).not.toHaveClass('cell__pencil-mark--highlighted'); // 5 not in pencilMarks
    });
  });

  describe('highlight classes', () => {
    it('applies .cell--selected for "selected"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="selected" />);
      expect(container.firstElementChild).toHaveClass('cell--selected');
    });

    it('applies .cell--peer for "peer"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="peer" />);
      expect(container.firstElementChild).toHaveClass('cell--peer');
    });

    it('applies .cell--conflict for "conflict"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="conflict" />);
      expect(container.firstElementChild).toHaveClass('cell--conflict');
    });

    it('applies .cell--possible for "possible"', () => {
      const { container } = render(<Cell row={0} col={0} highlight="possible" />);
      expect(container.firstElementChild).toHaveClass('cell--possible');
    });

    it('applies no highlight class when highlight is null', () => {
      const { container } = render(<Cell row={0} col={0} highlight={null} />);
      expect((container.firstElementChild as HTMLElement).className).not.toMatch(/cell--/);
    });
  });
});
