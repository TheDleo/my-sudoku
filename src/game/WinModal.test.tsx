import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WinModal } from './WinModal';
import * as persistence from './persistence';
import { useGameStore } from './store';
import { initialEmptyState } from './reducers';
import { makePuzzle } from './testHelpers';

describe('WinModal', () => {
  beforeEach(() => {
    vi.spyOn(persistence, 'save').mockImplementation(() => undefined);
    useGameStore.setState({
      ...initialEmptyState,
      screen: 'game',
      won: true,
      puzzle: makePuzzle(),
      mistakes: 2,
      elapsedMs: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the "Puzzle Complete!" heading', () => {
    render(<WinModal />);
    expect(screen.getByRole('heading', { name: 'Puzzle Complete!' })).toBeInTheDocument();
  });

  it('renders the difficulty label', () => {
    render(<WinModal />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('renders the mistakes count', () => {
    render(<WinModal />);
    expect(screen.getByText('Mistakes: 2')).toBeInTheDocument();
  });

  it('renders the formatted time', () => {
    render(<WinModal />);
    expect(screen.getByText('Time: 0:00')).toBeInTheDocument();
  });

  it('formats non-zero elapsed time correctly', () => {
    useGameStore.setState({ elapsedMs: 227000 }); // 3 min 47 sec
    render(<WinModal />);
    expect(screen.getByText('Time: 3:47')).toBeInTheDocument();
  });

  it('"New Game" button sets screen to landing', () => {
    render(<WinModal />);
    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    expect(useGameStore.getState().screen).toBe('landing');
  });

  it('"Close" button sets won to false', () => {
    render(<WinModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(useGameStore.getState().won).toBe(false);
  });

  it('clicking the backdrop sets won to false', () => {
    const { container } = render(<WinModal />);
    fireEvent.click(container.firstChild as Element);
    expect(useGameStore.getState().won).toBe(false);
  });

  it('clicking the card does not dismiss', () => {
    const { container } = render(<WinModal />);
    const card = container.querySelector('.win-card') as Element;
    fireEvent.click(card);
    expect(useGameStore.getState().won).toBe(true);
  });
});
