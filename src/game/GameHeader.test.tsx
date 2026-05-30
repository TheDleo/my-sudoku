import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
    vi.useRealTimers();
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
    expect(window.confirm).toHaveBeenCalledWith(
      'Start a new game? Your current progress will be lost.',
    );
    expect(useGameStore.getState().screen).toBe('landing');
  });

  it('clicking New Game with confirm=false does not change screen', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GameHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('renders elapsed time as "0:00" when elapsedMs is 0', () => {
    render(<GameHeader />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('renders elapsed time formatted from elapsedMs', () => {
    useGameStore.setState({ elapsedMs: 227000 });
    render(<GameHeader />);
    expect(screen.getByText('3:47')).toBeInTheDocument();
  });

  it('increments elapsedMs by 1000 per second while playing', () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: false,
      puzzle: makePuzzle(),
    });
    render(<GameHeader />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState().elapsedMs).toBe(3000);
  });

  it('stops timer permanently when won becomes true', () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: false,
      puzzle: makePuzzle(),
    });
    render(<GameHeader />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      useGameStore.setState({ won: true });
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState().elapsedMs).toBe(2000);
  });
});
