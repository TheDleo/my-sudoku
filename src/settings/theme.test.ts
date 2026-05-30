import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme } from './theme';

beforeEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('applyTheme', () => {
  it('sets data-theme="light" when called with "light"', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('sets data-theme="dark" when called with "dark"', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('removes data-theme attribute when called with "auto"', () => {
    document.documentElement.dataset.theme = 'light';
    applyTheme('auto');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('overrides a previous theme value', () => {
    applyTheme('dark');
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
