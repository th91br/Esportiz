import { render, screen } from '@testing-library/react';
import { Building } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { SettingsCardHeader } from './SettingsCardHeader';

describe('SettingsCardHeader', () => {
  it('renders a compact settings card title with a decorative icon and description', () => {
    render(
      <SettingsCardHeader
        icon={Building}
        title="Dados da escola"
        description="Personalize a experiencia no Esportiz."
      />,
    );

    expect(screen.getByRole('heading', { name: 'Dados da escola', level: 3 })).toHaveClass(
      'flex',
      'items-center',
      'gap-2',
      'text-lg',
    );
    expect(screen.getByText('Personalize a experiencia no Esportiz.')).toHaveClass('text-muted-foreground');
    expect(screen.getByRole('heading', { name: 'Dados da escola' }).querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('keeps optional actions aligned responsively with the title block', () => {
    render(
      <SettingsCardHeader
        icon={Building}
        title="Google Agenda"
        description="Sincronize agenda e contatos."
        action={<span>Conectado</span>}
        className="pb-2"
      />,
    );

    expect(screen.getByText('Conectado').parentElement).toHaveClass(
      'flex',
      'flex-col',
      'sm:flex-row',
      'sm:justify-between',
      'pb-2',
    );
  });
});
