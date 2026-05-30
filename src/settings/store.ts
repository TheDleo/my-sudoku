import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from './types';

type SettingsStore = Settings & {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const DEFAULTS: Settings = {
  autoCandidates: false,
  possiblePlacements: true,
  showTimer: true,
  showMistakes: true,
  theme: 'auto',
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsStore>),
    }),
    { name: 'sudoku-settings' },
  ),
);
