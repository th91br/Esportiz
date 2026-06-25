import { render, screen } from '@testing-library/react';
import { CreditCard } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';

import { IconDialogTitle } from './IconDialogTitle';

function renderInDialog(title: React.ReactNode) {
  return render(
    <Dialog open>
      <DialogContent>
        {title}
        <DialogDescription>Descricao do teste</DialogDescription>
      </DialogContent>
    </Dialog>,
  );
}

describe('IconDialogTitle', () => {
  it('renders an operational dialog title with a decorative primary icon', () => {
    renderInDialog(<IconDialogTitle icon={CreditCard}>Fechamento de conta</IconDialogTitle>);

    const title = screen.getByRole('heading', { name: 'Fechamento de conta', level: 2 });
    expect(title).toHaveClass(
      'font-display',
      'text-xl',
      'font-bold',
      'flex',
      'items-center',
      'gap-2',
      'text-foreground',
    );
    expect(title.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(title.querySelector('svg')).toHaveClass('h-5', 'w-5', 'text-primary');
  });

  it('allows local icon color and title class adjustments', () => {
    renderInDialog(
      <IconDialogTitle icon={CreditCard} iconClassName="text-zinc-500" className="tracking-tight">
        Bloquear funcionamento
      </IconDialogTitle>,
    );

    const title = screen.getByRole('heading', { name: 'Bloquear funcionamento' });
    expect(title).toHaveClass('tracking-tight', 'font-display', 'text-xl');
    expect(title.querySelector('svg')).toHaveClass('text-zinc-500');
  });
});
