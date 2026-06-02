import './Cell.css';
import type { Digit } from '../types';
import type { CellHighlight } from './highlights';
import { useGameStore } from './store';

type Props = { row: number; col: number; highlight: CellHighlight };

const PENCIL_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function cellAriaLabel(
  row: number,
  col: number,
  cell: { value: Digit | null; pencilMarks: Set<Digit> },
  isGiven: boolean,
): string {
  const prefix = `Row ${row + 1}, column ${col + 1}`;
  if (cell.value !== null) {
    return `${prefix}, ${isGiven ? 'given' : 'your'} ${cell.value}`;
  }
  if (cell.pencilMarks.size > 0) {
    const marks = [...cell.pencilMarks].sort((a, b) => a - b).join(' ');
    return `${prefix}, candidates ${marks}`;
  }
  return `${prefix}, empty`;
}

export function Cell({ row, col, highlight }: Props) {
  const cell = useGameStore((s) => s.cells[row]![col]!);
  const isGiven = useGameStore((s) => s.given[row]![col]!);
  const selectedNumber = useGameStore((s) => s.selection.number);

  const highlightClass = highlight !== null ? `cell--${highlight}` : '';

  return (
    <div
      className={`cell ${highlightClass}`.trim()}
      data-row={row}
      data-col={col}
      role="gridcell"
      aria-label={cellAriaLabel(row, col, cell, isGiven)}
    >
      {cell.value !== null ? (
        <span className={`cell__digit ${isGiven ? 'cell__digit--given' : 'cell__digit--user'}`}>
          {cell.value}
        </span>
      ) : cell.pencilMarks.size > 0 ? (
        <div className="cell__pencil-grid">
          {PENCIL_POSITIONS.map((d) => {
            const isHighlighted = selectedNumber === d && cell.pencilMarks.has(d as Digit);
            return (
              <span
                key={d}
                className={`cell__pencil-mark${isHighlighted ? ' cell__pencil-mark--highlighted' : ''}`}
              >
                {cell.pencilMarks.has(d as Digit) ? d : ''}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
