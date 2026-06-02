import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { initialEmptyState } from './game/reducers';
import { useGameStore } from './game/store';
import { App } from './app';
import * as persistence from './game/persistence';
import { makePuzzle } from './game/testHelpers';

vi.mock('./generator/client', () => ({
  workerClient: { getPuzzle: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./game/persistence', () => ({
  load: vi.fn(),
  save: vi.fn(),
}));

// jsdom has no canvas implementation — stub getContext to avoid errors from Confetti
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

describe('App', () => {
  beforeEach(() => {
    // jsdom has no matchMedia — stub it so Confetti's prefers-reduced-motion check doesn't throw
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    useGameStore.setState({ ...initialEmptyState });
    vi.mocked(persistence.load).mockReturnValue(null);
  });

  it('renders the Sudoku heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeInTheDocument();
  });

  it('clicking outside the board deselects the selected cell', () => {
    useGameStore.setState({
      ...initialEmptyState,
      selection: { cell: { row: 0, col: 0 }, number: null },
    });
    render(<App />);
    // Click the <h1> — it is outside the Board, so Board's stopPropagation does not fire
    fireEvent.click(screen.getByRole('heading'));
    expect(useGameStore.getState().selection.cell).toBeNull();
  });

  it('shows WinModal when won is true and screen is game', () => {
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: true,
      puzzle: makePuzzle(),
    });
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Puzzle Complete!' })).toBeInTheDocument();
  });

  it('does not show WinModal when won is false', () => {
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: false,
      puzzle: makePuzzle(),
    });
    render(<App />);
    expect(screen.queryByRole('heading', { name: 'Puzzle Complete!' })).toBeNull();
  });
});
