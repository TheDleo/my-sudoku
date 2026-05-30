// src/settings/SettingsModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { useSettingsStore } from './store';

const DEFAULTS = {
  autoCandidates: false,
  possiblePlacements: true,
  showTimer: true,
  showMistakes: true,
  theme: 'auto' as const,
};

beforeEach(() => {
  useSettingsStore.setState(DEFAULTS);
});

describe('SettingsModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(<SettingsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the Settings heading', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicking the card does not call onClose', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders an Auto-candidates toggle checked according to store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    const toggle = screen.getByRole('checkbox', { name: /auto-candidates/i });
    expect((toggle as HTMLInputElement).checked).toBe(false);
  });

  it('toggling Auto-candidates updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /auto-candidates/i }));
    expect(useSettingsStore.getState().autoCandidates).toBe(true);
  });

  it('renders a Possible placements toggle', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /possible placements/i })).toBeInTheDocument();
  });

  it('toggling Possible placements updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /possible placements/i }));
    expect(useSettingsStore.getState().possiblePlacements).toBe(false);
  });

  it('renders a Show timer toggle', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /show timer/i })).toBeInTheDocument();
  });

  it('toggling Show timer updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /show timer/i }));
    expect(useSettingsStore.getState().showTimer).toBe(false);
  });

  it('renders a Show mistakes toggle', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /show mistakes/i })).toBeInTheDocument();
  });

  it('toggling Show mistakes updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /show mistakes/i }));
    expect(useSettingsStore.getState().showMistakes).toBe(false);
  });

  it('renders three theme buttons: Auto, Light, Dark', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /^auto$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument();
  });

  it('clicking Dark theme button updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^dark$/i }));
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('clicking Light theme button updates the store', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^light$/i }));
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('the current theme button has aria-pressed=true', () => {
    useSettingsStore.setState({ theme: 'dark' });
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(
      (screen.getByRole('button', { name: /^dark$/i }) as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    expect(
      (screen.getByRole('button', { name: /^auto$/i }) as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('false');
  });
});
