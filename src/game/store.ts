// src/game/store.ts
import { create } from 'zustand';
import * as persistence from './persistence';
import * as reducers from './reducers';
import { initialEmptyState, withSnapshot } from './reducers';
import type { GameState, GameStore } from './types';
import { useSettingsStore } from '../settings/store';

export const useGameStore = create<GameStore>()((set) => ({
  ...initialEmptyState,

  loadPuzzle: (puzzle) => set((s) => reducers.loadPuzzle(s, puzzle)),
  selectCell: (coord) => set((s) => reducers.selectCell(s, coord)),
  setSelectedNumber: (n) => set((s) => reducers.setSelectedNumber(s, n)),

  placeDigit: (d) =>
    set((s) => {
      const next = withSnapshot(s, (st) => reducers.placeDigit(st, d));
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),
  eraseCell: () =>
    set((s) => {
      const next = withSnapshot(s, reducers.eraseCell);
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),
  togglePencilMark: (d) => set((s) => withSnapshot(s, (st) => reducers.togglePencilMark(st, d))),
  togglePencilMode: () => set((s) => withSnapshot(s, reducers.togglePencilMode)),
  fillCandidates: () => set((s) => withSnapshot(s, reducers.fillCandidates)),

  requestHint: () => set((s) => reducers.requestHint(s)),
  advanceHint: () => set((s) => reducers.advanceHint(s)),
  dismissHint: () => set((s) => reducers.dismissHint(s)),

  undo: () =>
    set((s) => {
      const next = reducers.undo(s);
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),
  redo: () =>
    set((s) => {
      const next = reducers.redo(s);
      return useSettingsStore.getState().autoCandidates ? reducers.fillCandidates(next) : next;
    }),

  setScreen: (s) => set((st) => reducers.setScreen(st, s)),
  resumeGame: () =>
    set(() => {
      const saved = persistence.load();
      if (saved === null) return {};
      return { ...saved, screen: 'game' as const };
    }),
  dismissWin: () => set((s) => reducers.dismissWin(s)),
  tickTimer: () => set((s) => reducers.tickTimer(s)),

  setColorMark: (coord, color) =>
    set((s) => withSnapshot(s, (st) => reducers.setColorMark(st, coord, color))),
  toggleColorMode: (color) => set((s) => reducers.toggleColorMode(s, color)),
}));

// Auto-save subscriber. Only fires when persisted fields changed.
useGameStore.subscribe((state: GameStore, prev: GameStore) => {
  if (
    state.cells === prev.cells &&
    state.pencilMode === prev.pencilMode &&
    state.mistakes === prev.mistakes &&
    state.elapsedMs === prev.elapsedMs &&
    state.puzzle === prev.puzzle &&
    state.colorMarks === prev.colorMarks
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
    won: false,
    colorMarks: state.colorMarks,
    colorMode: null,
  };
  persistence.save(snapshot);
});

// When autoCandidates is toggled ON, immediately fill candidates.
useSettingsStore.subscribe((state, prev) => {
  if (state.autoCandidates && !prev.autoCandidates) {
    useGameStore.getState().fillCandidates();
  }
});
