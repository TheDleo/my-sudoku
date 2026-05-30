import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Digit } from '../types';
import * as persistence from './persistence';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { makePuzzle } from './testHelpers';

describe('useGameStore', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    saveSpy = vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({ ...initialEmptyState });
    useSettingsStore.setState({
      autoCandidates: false,
      possiblePlacements: true,
      showTimer: true,
      showMistakes: true,
      theme: 'auto',
    });
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

  it('tickTimer increments elapsedMs and triggers save', () => {
    useGameStore.getState().loadPuzzle(makePuzzle());
    saveSpy.mockClear();
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().elapsedMs).toBe(1000);
    expect(saveSpy).toHaveBeenCalledOnce();
  });

  describe('auto-candidates', () => {
    it('placeDigit with autoCandidates=true fills candidates on remaining empty cells', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useSettingsStore.setState({ autoCandidates: true });
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().placeDigit(3 as Digit);
      // cells[2][2] is empty in makePuzzle; auto-candidates must have filled it
      expect(useGameStore.getState().cells[2]![2]!.pencilMarks.size).toBeGreaterThan(0);
    });

    it('eraseCell with autoCandidates=true refills candidates after erase', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().placeDigit(3 as Digit);
      useSettingsStore.setState({ autoCandidates: true });
      useGameStore.getState().selectCell({ row: 1, col: 1 });
      useGameStore.getState().eraseCell();
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
    });

    it('toggling autoCandidates from false to true immediately fills candidates', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      // Start with no candidates
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBe(0);
      // Toggle on via the store action
      useSettingsStore.getState().updateSetting('autoCandidates', true);
      // Subscriber fires synchronously — candidates must be filled now
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
    });

    it('toggling autoCandidates from true to false does NOT clear existing candidates', () => {
      useGameStore.getState().loadPuzzle(makePuzzle());
      useSettingsStore.getState().updateSetting('autoCandidates', true);
      const sizeBefore = useGameStore.getState().cells[1]![1]!.pencilMarks.size;
      useSettingsStore.getState().updateSetting('autoCandidates', false);
      expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBe(sizeBefore);
    });
  });
});
