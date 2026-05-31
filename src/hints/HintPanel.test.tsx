import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { initialEmptyState } from '../game/reducers';
import { useGameStore } from '../game/store';
import { HintPanel } from './HintPanel';
import type { Step } from '../solver/types';
import type { Digit } from '../types';

const mockStep: Step = {
  technique: 'nakedSingle',
  highlights: [{ row: 0, col: 8 }],
  placements: [{ cell: { row: 0, col: 8 }, digit: 9 as Digit }],
  eliminations: [],
  explanation: 'Cell (0,8) is the only cell in row 0 that can contain 9.',
};

describe('HintPanel', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
  });

  it('shows a Hint button when no hint is active', () => {
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /^hint$/i })).toBeTruthy();
  });

  it('shows level-1 text when hintLevel is 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByText } = render(<HintPanel />);
    expect(getByText(/there is a technique you can apply/i)).toBeTruthy();
  });

  it('shows technique name at level 2', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    const { getByText } = render(<HintPanel />);
    expect(getByText('Naked Single')).toBeTruthy();
  });

  it('shows Show more button at level 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /show more/i })).toBeTruthy();
  });

  it('hides Show more button at level 4', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 4 });
    const { queryByRole } = render(<HintPanel />);
    expect(queryByRole('button', { name: /show more/i })).toBeNull();
  });

  it('shows dismiss button when hint is active', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    expect(getByRole('button', { name: /dismiss hint/i })).toBeTruthy();
  });

  it('clicking Hint button on empty board leaves currentHint null', () => {
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /^hint$/i }));
    expect(useGameStore.getState().currentHint).toBeNull();
  });

  it('clicking Show more advances hintLevel', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /show more/i }));
    expect(useGameStore.getState().hintLevel).toBe(2);
  });

  it('clicking dismiss clears currentHint', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    const { getByRole } = render(<HintPanel />);
    fireEvent.click(getByRole('button', { name: /dismiss hint/i }));
    expect(useGameStore.getState().currentHint).toBeNull();
  });

  it('shows technique name at level 3 (cells highlighted but no explanation yet)', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 3 });
    const { getByText, queryByText } = render(<HintPanel />);
    expect(getByText('Naked Single')).toBeTruthy();
    expect(queryByText(mockStep.explanation)).toBeNull();
  });

  // New tests for "What is this?" link
  it('shows "What is this?" link at level 2', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    render(<HintPanel />);
    expect(screen.getByRole('button', { name: /what is this/i })).toBeInTheDocument();
  });

  it('shows "What is this?" link at level 3', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 3 });
    render(<HintPanel />);
    expect(screen.getByRole('button', { name: /what is this/i })).toBeInTheDocument();
  });

  it('does not show "What is this?" link at level 1', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 1 });
    render(<HintPanel />);
    expect(screen.queryByRole('button', { name: /what is this/i })).not.toBeInTheDocument();
  });

  it('does not show "What is this?" link at level 4', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 4 });
    render(<HintPanel />);
    expect(screen.queryByRole('button', { name: /what is this/i })).not.toBeInTheDocument();
  });

  it('clicking "What is this?" opens the explainer dialog', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    render(<HintPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /what is this/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closing the explainer dialog hides it', () => {
    useGameStore.setState({ ...initialEmptyState, currentHint: mockStep, hintLevel: 2 });
    render(<HintPanel />);
    fireEvent.click(screen.getByRole('button', { name: /what is this/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
