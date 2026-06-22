import { render, screen } from '@testing-library/react';
import { CheckCircle2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { StatusPill } from './status-pill';

describe('StatusPill', () => {
  it('renders a compact semantic status with an optional decorative icon', () => {
    render(
      <StatusPill tone="success" icon={CheckCircle2}>
        Conectado
      </StatusPill>,
    );

    const status = screen.getByText('Conectado');
    expect(status).toHaveClass('inline-flex', 'w-fit', 'gap-1', 'rounded-full', 'bg-success/10', 'text-success');
    expect(status.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports warning status and merges page-specific classes', () => {
    render(
      <StatusPill tone="warning" className="shrink-0">
        Pendente
      </StatusPill>,
    );

    expect(screen.getByText('Pendente')).toHaveClass(
      'bg-warning/15',
      'text-warning-foreground',
      'dark:text-warning',
      'shrink-0',
    );
  });
});