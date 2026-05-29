import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit } from '../types';
import * as persistence from './persistence';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { makePuzzle } from './testHelpers';

describe('useGameStore', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy first so the reset's subscriber fire goes to the spy, not real localStorage.
    saveSpy = vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    // Reset the module-level store's GameState fields so tests don't leak.
    // Default merge (not replace) preserves the action methods set up by create().
    useGameStore.setState({ ...initialEmptyState });
    saveSpy.mockClear();
  });

  it('selectCell does NOT trigger save', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    saveSpy.mockClear();
    useGameStore.getState().selectCell({ row: 4, col: 4 });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit DOES trigger save when it modifies cells', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('placeDigit on a given cell does NOT trigger save', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 0, col: 0 }); // given
    saveSpy.mockClear();
    useGameStore.getState().placeDigit(3 as Digit);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('placeDigit pushes a snapshot onto history.past', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    expect(useGameStore.getState().history.past.length).toBe(1);
  });

  it('loadPuzzle triggers save', () => {
    saveSpy.mockClear();
    useGameStore.getState().loadPuzzle(makePuzzle());
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  it('undo through the store reverts placeDigit', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    useGameStore.getState().selectCell({ row: 1, col: 1 });
    useGameStore.getState().placeDigit(3 as Digit);
    useGameStore.getState().undo();
    expect(useGameStore.getState().cells[1]![1]!.value).toBe(null);
  });
});
