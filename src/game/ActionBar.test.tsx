import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { initialEmptyState, loadPuzzle } from './reducers';
import { useGameStore } from './store';
import { useSettingsStore } from '../settings/store';
import { ActionBar } from './ActionBar';
import { makePuzzle } from './testHelpers';

describe('ActionBar', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialEmptyState });
    useSettingsStore.setState({
      autoCandidates: false,
      possiblePlacements: true,
      showTimer: true,
      showMistakes: true,
      theme: 'auto',
    });
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

  it('renders a candidates button when autoCandidates is false', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /candidates/i })).toBeTruthy();
  });

  it('hides the candidates button when autoCandidates is true', () => {
    useSettingsStore.setState({ autoCandidates: true });
    render(<ActionBar />);
    expect(screen.queryByRole('button', { name: /candidates/i })).not.toBeInTheDocument();
  });

  it('clicking the candidates button fills candidates into empty cells', () => {
    const loaded = loadPuzzle(initialEmptyState, makePuzzle());
    useGameStore.setState({ ...loaded });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /candidates/i }));
    expect(useGameStore.getState().cells[1]![1]!.pencilMarks.size).toBeGreaterThan(0);
  });

  it('renders an undo button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /^undo$/i })).toBeTruthy();
  });

  it('renders a redo button', () => {
    const { getByRole } = render(<ActionBar />);
    expect(getByRole('button', { name: /^redo$/i })).toBeTruthy();
  });

  it('undo button is disabled when history.past is empty', () => {
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^undo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('undo button is enabled when history.past has entries', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: {
        past: [
          {
            cells: initialEmptyState.cells,
            pencilMode: false,
            colorMarks: initialEmptyState.colorMarks,
          },
        ],
        future: [],
      },
    });
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^undo$/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('redo button is disabled when history.future is empty', () => {
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^redo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('redo button is enabled when history.future has entries', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: {
        past: [],
        future: [
          {
            cells: initialEmptyState.cells,
            pencilMode: false,
            colorMarks: initialEmptyState.colorMarks,
          },
        ],
      },
    });
    const { getByRole } = render(<ActionBar />);
    expect((getByRole('button', { name: /^redo$/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking undo removes the last entry from history.past', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: {
        past: [
          {
            cells: initialEmptyState.cells,
            pencilMode: false,
            colorMarks: initialEmptyState.colorMarks,
          },
        ],
        future: [],
      },
    });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /^undo$/i }));
    expect(useGameStore.getState().history.past.length).toBe(0);
  });

  it('clicking redo removes the last entry from history.future', () => {
    useGameStore.setState({
      ...initialEmptyState,
      history: {
        past: [],
        future: [
          {
            cells: initialEmptyState.cells,
            pencilMode: false,
            colorMarks: initialEmptyState.colorMarks,
          },
        ],
      },
    });
    const { getByRole } = render(<ActionBar />);
    fireEvent.click(getByRole('button', { name: /^redo$/i }));
    expect(useGameStore.getState().history.future.length).toBe(0);
  });

  it('renders Color A button with aria-pressed="false" by default', () => {
    render(<ActionBar />);
    const btn = screen.getByRole('button', { name: /color a/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders Color B button with aria-pressed="false" by default', () => {
    render(<ActionBar />);
    const btn = screen.getByRole('button', { name: /color b/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking Color A sets colorMode to "A"', () => {
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /color a/i }));
    expect(useGameStore.getState().colorMode).toBe('A');
  });

  it('clicking Color A again deactivates colorMode', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /color a/i }));
    expect(useGameStore.getState().colorMode).toBeNull();
  });

  it('clicking Color B while A is active switches colorMode to "B"', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    fireEvent.click(screen.getByRole('button', { name: /color b/i }));
    expect(useGameStore.getState().colorMode).toBe('B');
  });

  it('Color A button has aria-pressed="true" when colorMode is "A"', () => {
    useGameStore.setState({ ...initialEmptyState, colorMode: 'A' });
    render(<ActionBar />);
    expect(screen.getByRole('button', { name: /color a/i }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
