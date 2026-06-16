import { render, screen } from '@testing-library/react';
import { Package } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders an accessible title, decorative icon and description', () => {
    render(
      <PageHeader
        title="Produtos"
        description="Cadastre itens disponiveis para venda."
        icon={Package}
      />,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Produtos' });
    expect(heading).toHaveClass('text-3xl', 'font-display', 'font-bold');
    expect(heading.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Cadastre itens disponiveis para venda.')).toHaveClass('text-muted-foreground', 'mt-1');
  });

  it('renders actions in a responsive action area', () => {
    render(
      <PageHeader
        title="Despesas"
        actions={<button type="button">Nova despesa</button>}
      />,
    );

    const actionWrapper = screen.getByRole('button', { name: 'Nova despesa' }).parentElement;
    expect(actionWrapper).toHaveClass('w-full', 'sm:w-auto');
  });

  it('accepts extra classes without replacing the base header layout', () => {
    render(<PageHeader title="Vendas" className="pt-2" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Vendas' }).parentElement?.parentElement)
      .toHaveClass('flex', 'flex-col', 'sm:flex-row', 'gap-4', 'pt-2');
  });
});
