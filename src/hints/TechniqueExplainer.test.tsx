import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechniqueExplainer } from './TechniqueExplainer';

describe('TechniqueExplainer', () => {
  it('renders nothing when technique is null', () => {
    render(<TechniqueExplainer technique={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a dialog when technique is provided', () => {
    render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the correct title for the technique', () => {
    render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /naked single/i })).toBeInTheDocument();
  });

  it('renders the summary text', () => {
    render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(screen.getByText(/only one digit is possible/i)).toBeInTheDocument();
  });

  it('renders an svg diagram', () => {
    const { container } = render(<TechniqueExplainer technique="nakedSingle" onClose={() => {}} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('card click does not call onClose', () => {
    const onClose = vi.fn();
    render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<TechniqueExplainer technique="nakedSingle" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders correctly for a different technique', () => {
    render(<TechniqueExplainer technique="xWing" onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /x-wing/i })).toBeInTheDocument();
  });
});
