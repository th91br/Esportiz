import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/ui/input';
import { SettingsField } from './SettingsField';

describe('SettingsField', () => {
  it('renders a settings label, control and optional helper text with compact spacing', () => {
    render(
      <SettingsField htmlFor="ct-name" label="Nome da escola" description="Esse nome aparece nos relatorios.">
        <Input id="ct-name" />
      </SettingsField>,
    );

    expect(screen.getByLabelText('Nome da escola')).toBeInTheDocument();
    expect(screen.getByText('Esse nome aparece nos relatorios.')).toHaveClass('text-[10px]', 'text-muted-foreground');
    expect(screen.getByText('Nome da escola').parentElement).toHaveClass('space-y-2');
  });

  it('allows denser labels and helper text variants for advanced settings', () => {
    render(
      <SettingsField
        htmlFor="template"
        label="Mensagem"
        labelClassName="font-bold"
        description="Variaveis disponiveis para a mensagem."
        descriptionClassName="text-xs leading-relaxed"
      >
        <textarea id="template" />
      </SettingsField>,
    );

    expect(screen.getByText('Mensagem')).toHaveClass('font-bold');
    expect(screen.getByText('Variaveis disponiveis para a mensagem.')).toHaveClass('text-xs', 'leading-relaxed');
  });
});