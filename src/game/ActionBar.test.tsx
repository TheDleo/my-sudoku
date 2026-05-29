import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { initialEmptyState, loadPuzzle } from './reducers';
import { useGameStore } from './store';
import { ActionBar } from './ActionBar';
import { makePuzzle } from './testHelpers';

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

  it('renders a candidates button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /candidates/i })).toBeTruthy();
  });

  it('clicking the candidates button fills candidates into empty cells', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    useGameStore.setState({ ...loaded });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /candidates/i }));
    // (1,1) is empty in makePuzzle; after fill it must have candidates
    expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
  });
});
