import { render, screen } from '@testing-library/react';
import { DollarSign } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders a readable value when data is available', () => {
    render(<StatCard title="Recebido" value="R$ 1.250,00" icon={DollarSign} />);

    expect(screen.getByText('R$ 1.250,00')).toBeInTheDocument();
  });

  it('renders an accessible skeleton instead of ellipsis while loading', () => {
    render(<StatCard title="Recebido" value="..." icon={DollarSign} />);

    expect(screen.getByRole('status', { name: 'Carregando Recebido' })).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });
});
