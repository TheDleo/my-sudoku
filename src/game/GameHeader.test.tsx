import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameHeader } from './GameHeader';
import * as persistence from './persistence';
import { useGameStore } from './store';
import { initialEmptyState } from './reducers';
import { makePuzzle } from './testHelpers';

describe('GameHeader', () => {
  beforeEach(() => {
    vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      puzzle: makePuzzle(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the puzzle difficulty label', () => {
    render(<GameHeader />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('renders a New Game button', () => {
    render(<GameHeader />);
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
  });

  it('clicking New Game with confirm=true sets screen to landing', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('landing');
  });

  it('clicking New Game with confirm=false does not change screen', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('game');
  });
});
