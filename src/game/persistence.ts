import type { Cell, Digit, Puzzle } from '../types';
import type { GameState } from './types';

export const STORAGE_KEY = 'my-sudoku.game';

type SerializedCell = { value: Digit | null; pencilMarks: number[] };
type SerializedState = {
  puzzle: Puzzle;
  cells: SerializedCell[][];
  given: boolean[][];
  pencilMode: boolean;
  mistakes: number;
  elapsedMs: number;
};

export function serialize(state: GameState): string {
  const cells: SerializedCell[][] = state.cells.map((row) =>
    row.map((c) => ({
      value: c.value,
      pencilMarks: [...c.pencilMarks].sort((a, b) => a - b),
    })),
  );
  const payload: SerializedState = {
    puzzle: state.puzzle,
    cells,
    given: state.given,
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    elapsedMs: state.elapsedMs,
  };
  return JSON.stringify(payload);
}

function isSerializedState(x: unknown): x is SerializedState {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.pencilMode !== 'boolean') return false;
  if (typeof o.mistakes !== 'number') return false;
  if (typeof o.elapsedMs !== 'number') return false;
  if (!Array.isArray(o.cells) || o.cells.length !== 9) return false;
  if (!o.cells.every((row) => Array.isArray(row) && row.length === 9)) return false;
  if (!Array.isArray(o.given) || o.given.length !== 9) return false;
  if (!o.given.every((row) => Array.isArray(row) && row.length === 9)) return false;
  if (typeof o.puzzle !== 'object' || o.puzzle === null) return false;
  return true;
}

export function deserialize(json: string): GameState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isSerializedState(parsed)) return null;
  const cells: Cell[][] = parsed.cells.map((row) =>
    row.map((c) => ({ value: c.value, pencilMarks: new Set<Digit>(c.pencilMarks as Digit[]) })),
  );
  return {
    puzzle: parsed.puzzle,
    cells,
    given: parsed.given,
    selection: { cell: null, number: null },
    pencilMode: parsed.pencilMode,
    mistakes: parsed.mistakes,
    elapsedMs: parsed.elapsedMs,
    history: { past: [], future: [] },
  };
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return deserialize(raw);
  } catch (err) {
    console.warn('persistence.load failed:', err);
    return null;
  }
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch (err) {
    console.warn('persistence.save failed:', err);
  }
}
