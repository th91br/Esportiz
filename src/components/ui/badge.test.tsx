import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it('preserves the existing structural and core variants', () => {
    render(
      <div>
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>,
    );

    expect(screen.getByText('Default')).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary', 'text-secondary-foreground');
    expect(screen.getByText('Outline')).toHaveClass('text-foreground');
  });

  it('renders semantic success, warning, and destructive status variants', () => {
    render(
      <div>
        <Badge variant="success">Pago</Badge>
        <Badge variant="warning">Pendente</Badge>
        <Badge variant="destructive">Atrasado</Badge>
      </div>,
    );

    expect(screen.getByText('Pago')).toHaveClass('border-success/20', 'bg-success/10', 'text-success');
    expect(screen.getByText('Pendente')).toHaveClass(
      'border-warning/30',
      'bg-warning/15',
      'text-warning-foreground',
      'dark:text-warning',
    );
    expect(screen.getByText('Atrasado')).toHaveClass('border-destructive/20', 'bg-destructive/10', 'text-destructive');
  });

  it('merges custom className with semantic variants', () => {
    render(
      <Badge variant="success" className="text-[10px] uppercase tracking-wide">
        Estoque OK
      </Badge>,
    );

    expect(screen.getByText('Estoque OK')).toHaveClass(
      'border-success/20',
      'bg-success/10',
      'text-[10px]',
      'uppercase',
      'tracking-wide',
    );
  });
});
