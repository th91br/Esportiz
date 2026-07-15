import { render, screen } from '@testing-library/react';
import { AlertCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AlertDialog, AlertDialogContent, AlertDialogDescription } from '@/components/ui/alert-dialog';

import { IconAlertDialogTitle } from './IconAlertDialogTitle';

function renderInAlertDialog(title: React.ReactNode) {
  return render(
    <AlertDialog open>
      <AlertDialogContent>
        {title}
        <AlertDialogDescription>Descricao do teste</AlertDialogDescription>
      </AlertDialogContent>
    </AlertDialog>,
  );
}

describe('IconAlertDialogTitle', () => {
  it('renders an operational alert dialog title with a decorative icon', () => {
    renderInAlertDialog(<IconAlertDialogTitle icon={AlertCircle}>Confirmar alteracao</IconAlertDialogTitle>);

    const title = screen.getByRole('heading', { name: 'Confirmar alteracao', level: 2 });
    expect(title).toHaveClass('flex', 'items-center', 'gap-2', 'text-xl', 'font-bold');
    expect(title.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(title.querySelector('svg')).toHaveClass('h-6', 'w-6', 'text-destructive', 'shrink-0');
  });

  it('allows local icon color and title class adjustments', () => {
    renderInAlertDialog(
      <IconAlertDialogTitle icon={AlertCircle} iconClassName="text-amber-500" className="tracking-tight">
        Revisar segmento
      </IconAlertDialogTitle>,
    );

    const title = screen.getByRole('heading', { name: 'Revisar segmento' });
    expect(title).toHaveClass('tracking-tight', 'text-xl', 'font-bold');
    expect(title.querySelector('svg')).toHaveClass('text-amber-500');
  });
});
