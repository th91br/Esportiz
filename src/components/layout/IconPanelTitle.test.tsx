import { render, screen } from '@testing-library/react';
import { TrendingUp } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { IconPanelTitle } from './IconPanelTitle';

describe('IconPanelTitle', () => {
  it('renders a responsive operational panel title with a decorative primary icon', () => {
    render(<IconPanelTitle icon={TrendingUp}>Balanço financeiro</IconPanelTitle>);

    const title = screen.getByRole('heading', { name: 'Balanço financeiro', level: 3 });
    expect(title).toHaveClass(
      'font-display',
      'font-bold',
      'text-lg',
      'md:text-xl',
      'text-foreground',
      'flex',
      'items-center',
      'gap-2',
    );
    expect(title.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(title.querySelector('svg')).toHaveClass('h-5', 'w-5', 'text-primary');
  });

  it('allows local layout classes without changing the base title vocabulary', () => {
    render(
      <IconPanelTitle icon={TrendingUp} className="mb-4">
        Evolução de faturamento
      </IconPanelTitle>,
    );

    expect(screen.getByRole('heading', { name: 'Evolução de faturamento' })).toHaveClass(
      'mb-4',
      'font-display',
      'text-lg',
    );
  });
});
