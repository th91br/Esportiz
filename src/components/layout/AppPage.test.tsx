import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppPage } from './AppPage';

vi.mock('@/components/Header', () => ({
  Header: () => <header data-testid="app-header">Esportiz navigation</header>,
}));

describe('AppPage', () => {
  it('renders the app shell with Header and a main content area', () => {
    render(
      <AppPage>
        <section>Conteudo da pagina</section>
      </AppPage>,
    );

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Conteudo da pagina');
  });

  it('keeps the base layout classes while accepting page-specific classes', () => {
    render(
      <AppPage className="pb-10" contentClassName="max-w-4xl">
        <section>Produtos</section>
      </AppPage>,
    );

    const shell = screen.getByTestId('app-header').parentElement;
    expect(shell).toHaveClass('min-h-screen', 'bg-background', 'pb-10');
    expect(screen.getByRole('main')).toHaveClass(
      'container',
      'py-6',
      'md:py-8',
      'space-y-6',
      'max-w-4xl',
    );
  });
});
