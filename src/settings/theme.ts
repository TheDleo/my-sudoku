import { useEffect } from 'react';
import { useSettingsStore } from './store';
import type { Theme } from './types';

export function applyTheme(theme: Theme): void {
  if (theme === 'auto') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function useThemeSync(): void {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
}
