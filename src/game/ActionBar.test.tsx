import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { initialEmptyState } from './reducers';
import { useGameStore } from './store';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders a pencil toggle button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /pencil/i })).toBeTruthy();
  });

  it('button has aria-pressed="false" when pencilMode is off', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /pencil/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking the button toggles pencilMode on', () => {
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /pencil/i }));
    expect(useGameStore.getState().pencilMode).toBe(true);
  });

  it('button has aria-pressed="true" when pencilMode is on', () => {
    useGameStore.setState({ ...initialEmptyState, pencilMode: true });
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /pencil/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('does not bubble clicks to parent', () => {
    const parentClick = vi.fn();
    const { getByRole } = render(
      <div onClick={parentClick}>
        <ActionBar />
      </div>,
    );
    fireEvent.click(getByRole('button', { name: /pencil/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
