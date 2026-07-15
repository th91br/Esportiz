import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsSection } from './SettingsSection';

describe('SettingsSection', () => {
  it('renders a responsive settings section with title, description and content', () => {
    render(
      <SettingsSection title="Equipe" description="Gerencie acessos e permissoes.">
        <button type="button">Convidar membro</button>
      </SettingsSection>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Equipe' })).toHaveClass('font-medium');
    expect(screen.getByText('Gerencie acessos e permissoes.')).toHaveClass('text-sm', 'text-muted-foreground');
    expect(screen.getByRole('button', { name: 'Convidar membro' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Equipe' })).toHaveClass('grid', 'gap-6', 'md:grid-cols-3');
  });

  it('accepts extra classes for the section and content column without replacing base layout', () => {
    render(
      <SettingsSection
        title="Integracoes"
        description="Conecte ferramentas externas."
        className="pt-6 border-t"
        contentClassName="space-y-6"
      >
        <div>Google Agenda</div>
      </SettingsSection>,
    );

    expect(screen.getByRole('region', { name: 'Integracoes' })).toHaveClass(
      'grid',
      'gap-6',
      'md:grid-cols-3',
      'pt-6',
      'border-t',
    );
    expect(screen.getByText('Google Agenda').parentElement).toHaveClass('md:col-span-2', 'space-y-6');
  });
});
