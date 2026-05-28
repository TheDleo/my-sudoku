import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit, Puzzle } from '../types';
import * as persistence from './persistence';

function makePuzzle(): Puzzle {
  const initialBoard: (Digit | null)[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => null),
  );
  initialBoard[0]![0] = 5;
  const solution = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => (((r + c) % 9) + 1) as Digit),
  );
  return { id: 'p', difficulty: 'easy', initialBoard, solution };
}

describe('useGameStore', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    saveSpy = vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    // Re-import the store fresh each test to reset internal state.
    vi.resetModules();
  });

  it('selectCell does NOT trigger save', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    saveSpy.mockClear();
    useGameStore.getState().selectCell({ row: 4, col: 4 });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit DOES trigger save when it modifies cells', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('placeDigit on a given cell does NOT trigger save', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 0, col: 0 }); // given
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit pushes a snapshot onto history.past', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    expect(useGameStore.getState().history.past.length).toBe(1);
  });

  it('loadPuzzle triggers save', async () => {
    const { useGameStore } = await import('./store');
    saveSpy.mockClear();
    useGameStore.getState().loadPuzzle(makePuzzle());
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('undo through the store reverts placeDigit', async () => {
    const { useGameStore } = await import('./store');
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    useGameStore.getState().undo();
    expect(useGameStore.getState().cells[1]![1]!.value).toBe(null);
  });
});
