import type { Digit } from '../types';
import type { GameState, GameStore } from './types';

type KeyState = Pick<GameState, 'cells' | 'given' | 'selection' | 'pencilMode'>;
type KeyActions = Pick<
  GameStore,
  'selectCell' | 'setSelectedNumber' | 'placeDigit' | 'eraseCell' | 'togglePencilMark'
>;

export function handleKey(event: KeyboardEvent, state: KeyState, actions: KeyActions): void {
  const { key, shiftKey } = event;
  const { selection, pencilMode } = state;

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
    event.preventDefault();
    if (selection.cell === null) return;
    const { row, col } = selection.cell;
    const next =
      key === 'ArrowUp'
        ? { row: Math.max(0, row - 1), col }
        : key === 'ArrowDown'
          ? { row: Math.min(8, row + 1), col }
          : key === 'ArrowLeft'
            ? { row, col: Math.max(0, col - 1) }
            : { row, col: Math.min(8, col + 1) };
    actions.selectCell(next);
    return;
  }

  if (key === 'Escape') {
    actions.selectCell(null);
    actions.setSelectedNumber(null);
    return;
  }

  if (key === 'Backspace' || key === 'Delete') {
    event.preventDefault();
    if (selection.cell !== null) actions.eraseCell();
    return;
  }

  const digit = parseDigit(key);
  if (digit !== null && selection.cell !== null) {
    event.preventDefault();
    if (shiftKey || pencilMode) {
      actions.togglePencilMark(digit);
    } else {
      actions.placeDigit(digit);
    }
    return;
  }
}

function parseDigit(key: string): Digit | null {
  const n = parseInt(key, 10);
  if (n >= 1 && n <= 9) return n as Digit;
  return null;
}
