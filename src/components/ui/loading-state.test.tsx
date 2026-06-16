import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState } from './loading-state';

describe('LoadingState', () => {
  it('renders an accessible status with a configurable label', () => {
    render(<LoadingState label="Carregando produtos" />);

    expect(screen.getByRole('status', { name: 'Carregando produtos' })).toBeInTheDocument();
  });

  it('keeps the spinner decorative and accepts layout classes from the consumer', () => {
    render(<LoadingState label="Carregando despesas" className="py-12" />);

    const status = screen.getByRole('status', { name: 'Carregando despesas' });
    expect(status).toHaveClass('flex', 'justify-center', 'py-12');
    expect(status.querySelector('[data-slot="loading-spinner"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
