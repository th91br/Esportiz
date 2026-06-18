import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <button aria-label="Notificações" />,
}));

vi.mock('@/components/InstallPWAButton', () => ({
  InstallPWAButton: () => <button>Instalar app</button>,
}));

vi.mock('@/components/Logo', () => ({
  Logo: () => <span>Esportiz</span>,
}));

vi.mock('@/contexts/auth', () => ({
  useAuth: () => ({
    signOut: mocks.signOut,
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/hooks/queries/useProfile', () => ({
  useProfile: () => ({
    profile: { ct_name: 'Arena Esportiz' },
  }),
}));

vi.mock('@/hooks/useBusinessContext', () => ({
  useBusinessContext: () => ({
    canViewSettings: true,
    navModules: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/alunos', label: 'Alunos' },
    ],
  }),
}));

vi.mock('@/contexts/sidebar', () => ({
  useSidebar: () => ({
    isActive: false,
    isCollapsed: false,
    toggleCollapse: vi.fn(),
  }),
}));

function renderHeader() {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
    </BrowserRouter>,
  );
}

describe('Header', () => {
  it('labels desktop icon actions for assistive technology', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Abrir configurações' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alternar para modo escuro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair do sistema' })).toBeInTheDocument();
  });

  it('reports mobile menu expanded state', () => {
    renderHeader();

    const menuButton = screen.getByRole('button', { name: 'Abrir menu principal' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuButton);

    expect(screen.getByRole('button', { name: 'Fechar menu principal' })).toHaveAttribute('aria-expanded', 'true');
  });
});
