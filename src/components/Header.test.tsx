import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

function renderHeader(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
    </MemoryRouter>,
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

  it('presents mobile navigation with unit context and current page state', () => {
    renderHeader('/alunos');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu principal' }));

    const mobileNav = screen.getByRole('navigation', { name: 'Menu principal mobile' });
    expect(mobileNav).toHaveTextContent('Arena Esportiz');
    expect(within(mobileNav).getByRole('link', { name: 'Alunos' })).toHaveAttribute('aria-current', 'page');
  });
});
