import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingScreen } from './LandingScreen';
import { workerClient } from '../generator/client';
import * as persistence from '../game/persistence';
import { useGameStore } from '../game/store';
import { initialEmptyState } from '../game/reducers';
import { makePuzzle } from '../game/testHelpers';

vi.mock('../generator/client', () => ({
  workerClient: { getPuzzle: vi.fn() },
}));

vi.mock('../game/persistence', () => ({
  load: vi.fn(),
  save: vi.fn(),
}));

describe('LandingScreen', () => {
  beforeEach(() => {
    vi.mocked(persistence.load).mockReturnValue(null);
    vi.mocked(workerClient.getPuzzle).mockResolvedValue(makePuzzle());
    useGameStore.setState({ ...initialEmptyState });
  });

  it('renders 4 difficulty buttons', () => {
    render(<LandingScreen />);
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expert' })).toBeInTheDocument();
  });

  it('shows no Resume button when persistence.load returns null', () => {
    vi.mocked(persistence.load).mockReturnValue(null);
    render(<LandingScreen />);
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
  });

  it('shows Resume button when a non-sentinel saved game exists', () => {
    vi.mocked(persistence.load).mockReturnValue({
      ...initialEmptyState,
      puzzle: { ...initialEmptyState.puzzle, id: 'saved-puzzle-id' },
    });
    render(<LandingScreen />);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('clicking Easy calls getPuzzle(easy), then loadPuzzle, then setScreen(game)', async () => {
    const puzzle = makePuzzle();
    vi.mocked(workerClient.getPuzzle).mockResolvedValue(puzzle);
    render(<LandingScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Easy' }));

    expect(workerClient.getPuzzle).toHaveBeenCalledWith('easy');
    await waitFor(() => {
      expect(useGameStore.getState().puzzle).toBe(puzzle);
      expect(useGameStore.getState().screen).toBe('game');
    });
  });

  it('clicking Resume calls resumeGame, setting screen to game', () => {
    const saved = {
      ...initialEmptyState,
      puzzle: { ...initialEmptyState.puzzle, id: 'saved-puzzle-id' },
    };
    vi.mocked(persistence.load).mockReturnValue(saved);
    render(<LandingScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(useGameStore.getState().screen).toBe('game');
  });
});
