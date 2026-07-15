import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsGroupTitle } from './SettingsGroupTitle';

describe('SettingsGroupTitle', () => {
  it('renders a readable product subheading without uppercase tracking noise', () => {
    render(<SettingsGroupTitle>Configuração de recebimentos</SettingsGroupTitle>);

    const title = screen.getByText('Configuração de recebimentos');
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('text-sm', 'font-semibold', 'text-foreground');
    expect(title).not.toHaveClass('uppercase', 'tracking-wider', 'text-muted-foreground');
  });

  it('merges local layout classes without changing the base vocabulary', () => {
    render(<SettingsGroupTitle className="mb-2">Modelos de mensagem</SettingsGroupTitle>);

    expect(screen.getByText('Modelos de mensagem')).toHaveClass('mb-2', 'text-sm', 'font-semibold');
  });
});