import { create } from 'zustand';
import * as persistence from './persistence';
import * as reducers from './reducers';
import { initialEmptyState, withSnapshot } from './reducers';
import type { GameState, GameStore } from './types';

export const useGameStore = create<GameStore>()((set) => ({
  ...initialEmptyState,

  loadPuzzle: (puzzle) => set((s) => reducers.loadPuzzle(s, puzzle)),
  selectCell: (coord) => set((s) => reducers.selectCell(s, coord)),
  setSelectedNumber: (n) => set((s) => reducers.setSelectedNumber(s, n)),

  placeDigit: (d) => set((s) => withSnapshot(s, (st) => reducers.placeDigit(st, d))),
  eraseCell: () => set((s) => withSnapshot(s, reducers.eraseCell)),
  togglePencilMark: (d) => set((s) => withSnapshot(s, (st) => reducers.togglePencilMark(st, d))),
  togglePencilMode: () => set((s) => withSnapshot(s, reducers.togglePencilMode)),
  fillCandidates: () => set((s) => withSnapshot(s, reducers.fillCandidates)),

  requestHint: () => set((s) => reducers.requestHint(s)),
  advanceHint: () => set((s) => reducers.advanceHint(s)),
  dismissHint: () => set((s) => reducers.dismissHint(s)),

  undo: () => set(reducers.undo),
  redo: () => set(reducers.redo),

  setScreen: (s) => set((st) => ({ ...st, screen: s })),
  resumeGame: () => set((st) => ({ ...st, screen: 'game' })),
}));

// Auto-save subscriber. Only fires when persisted fields changed.
useGameStore.subscribe((state: GameStore, prev: GameStore) => {
  if (
    state.cells === prev.cells &&
    state.pencilMode === prev.pencilMode &&
    state.mistakes === prev.mistakes &&
    state.elapsedMs === prev.elapsedMs &&
    state.puzzle === prev.puzzle
  ) {
    return;
  }
  const snapshot: GameState = {
    puzzle: state.puzzle,
    cells: state.cells,
    given: state.given,
    selection: state.selection,
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    elapsedMs: state.elapsedMs,
    history: state.history,
    currentHint: null,
    hintLevel: 1,
    screen: state.screen,
  };
  persistence.save(snapshot);
});
