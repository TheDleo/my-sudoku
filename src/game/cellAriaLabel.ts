import type { Digit } from '../types';

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
