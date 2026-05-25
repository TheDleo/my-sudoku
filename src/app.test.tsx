import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app';

describe('App', () => {
  it('renders the Sudoku heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /sudoku/i, level: 1 })).toBeInTheDocument();
  });
});
