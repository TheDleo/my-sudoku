import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './store';

const DEFAULTS = {
  autoCandidates: false,
  possiblePlacements: true,
  showTimer: true,
  showMistakes: true,
  theme: 'auto' as const,
};

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState(DEFAULTS);
});

describe('useSettingsStore', () => {
  it('has correct default values', () => {
    const s = useSettingsStore.getState();
    expect(s.autoCandidates).toBe(false);
    expect(s.possiblePlacements).toBe(true);
    expect(s.showTimer).toBe(true);
    expect(s.showMistakes).toBe(true);
    expect(s.theme).toBe('auto');
  });

  it('updateSetting changes autoCandidates', () => {
    useSettingsStore.getState().updateSetting('autoCandidates', true);
    expect(useSettingsStore.getState().autoCandidates).toBe(true);
  });

  it('updateSetting changes theme', () => {
    useSettingsStore.getState().updateSetting('theme', 'dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('updateSetting changes showTimer', () => {
    useSettingsStore.getState().updateSetting('showTimer', false);
    expect(useSettingsStore.getState().showTimer).toBe(false);
  });

  it('updateSetting changes possiblePlacements', () => {
    useSettingsStore.getState().updateSetting('possiblePlacements', false);
    expect(useSettingsStore.getState().possiblePlacements).toBe(false);
  });

  it('updateSetting persists value to localStorage', () => {
    useSettingsStore.getState().updateSetting('showMistakes', false);
    const raw = localStorage.getItem('sudoku-settings');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.showMistakes).toBe(false);
  });
});
