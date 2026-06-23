import { render, screen } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { IconCardTitle } from './IconCardTitle';

describe('IconCardTitle', () => {
  it('renders an operational card title with a decorative primary icon', () => {
    render(<IconCardTitle icon={FileText}>Dados pessoais</IconCardTitle>);

    const title = screen.getByRole('heading', { name: 'Dados pessoais', level: 3 });
    expect(title).toHaveClass('flex', 'items-center', 'gap-2', 'text-lg');
    expect(title.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(title.querySelector('svg')).toHaveClass('h-5', 'w-5', 'text-primary');
  });

  it('supports compact titles and local class adjustments', () => {
    render(
      <IconCardTitle icon={FileText} size="base" className="text-foreground">
        Editor de clausulas
      </IconCardTitle>,
    );

    expect(screen.getByRole('heading', { name: 'Editor de clausulas' })).toHaveClass(
      'text-base',
      'font-bold',
      'text-foreground',
    );
  });
});
