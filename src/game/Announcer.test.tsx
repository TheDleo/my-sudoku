import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Announcer } from './Announcer';
import { useGameStore } from './store';
import { initialEmptyState } from './reducers';
import type { Digit } from '../types';

const mockHint = {
  technique: 'nakedSingle' as const,
  highlights: [],
  placements: [{ cell: { row: 0, col: 0 }, digit: 1 as Digit }],
  eliminations: [],
  explanation: 'test',
};

describe('Announcer', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders a polite aria-live region', () => {
    const { container } = render(<Announcer />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-atomic')).toBe('true');
  });

  it('is empty when no hint is active', () => {
    const { container } = render(<Announcer />);
    expect(container.firstElementChild?.textContent).toBe('');
  });

  it('announces technique name when hintLevel is 2', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockHint, hintLevel: 2 });
    const { container } = render(<Announcer />);
    expect(container.firstElementChild?.textContent).toContain('Naked Single');
  });

  it('is empty when hintLevel is 1 even with a hint', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockHint, hintLevel: 1 });
    const { container } = render(<Announcer />);
    expect(container.firstElementChild?.textContent).toBe('');
  });

  it('is empty when hintLevel is 3 (user already saw technique name)', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockHint, hintLevel: 3 });
    const { container } = render(<Announcer />);
    expect(container.firstElementChild?.textContent).toBe('');
  });
});
