import { render, screen } from '@testing-library/react';
import { Package } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders a title, description, decorative icon and optional action', () => {
    render(
      <EmptyState
        icon={Package}
        title="Nenhum produto cadastrado"
        description="Cadastre seus produtos para começar."
        action={<a href="/produtos">Cadastrar produtos</a>}
      />,
    );

    expect(screen.getByText('Nenhum produto cadastrado')).toHaveClass('font-medium');
    expect(screen.getByText('Cadastre seus produtos para começar.')).toHaveClass('text-sm', 'mt-1');
    expect(screen.getByRole('link', { name: 'Cadastrar produtos' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum produto cadastrado').parentElement?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports an outlined surface without imposing a Card component', () => {
    render(<EmptyState title="Nada encontrado" variant="outlined" className="p-8" />);

    const container = screen.getByText('Nada encontrado').parentElement;
    expect(container).toHaveClass('rounded-xl', 'border', 'border-dashed', 'bg-muted/10', 'p-8');
    expect(container?.tagName).toBe('DIV');
  });

  it('uses a plain variant by default for existing card content', () => {
    render(<EmptyState title="Nenhuma despesa neste mês" className="py-12" />);

    const container = screen.getByText('Nenhuma despesa neste mês').parentElement;
    expect(container).toHaveClass('text-center', 'text-muted-foreground', 'py-12');
    expect(container).not.toHaveClass('border-dashed');
  });
});
