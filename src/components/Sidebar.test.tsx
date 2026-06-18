import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock Auth
vi.mock('@/contexts/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
  }),
}));

// Mock Profile
const profileMock = vi.hoisted(() => ({
  profile: { ct_name: 'Escola Esportiz', logo_url: null, business_type: 'sport_school' },
}));
vi.mock('@/hooks/queries/useProfile', () => ({
  useProfile: () => profileMock,
}));

// Mock BusinessContext
const businessContextMock = vi.hoisted(() => ({
  defaultNavModules: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/alunos', label: 'Alunos' },
    { path: '/relatorios', label: 'Relatórios' },
  ],
  businessType: 'sport_school',
  navModules: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/alunos', label: 'Alunos' },
    { path: '/relatorios', label: 'Relatórios' },
  ],
}));
vi.mock('@/hooks/useBusinessContext', () => ({
  useBusinessContext: () => businessContextMock,
}));

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TooltipProvider>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </TooltipProvider>
    </MemoryRouter>
  );
}

function renderSidebarProviderOnly(initialPath = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SidebarProvider>
        <div>Protected content</div>
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('has-sidebar');
    document.documentElement.style.removeProperty('--sidebar-width');
    businessContextMock.businessType = 'sport_school';
    businessContextMock.navModules = [...businessContextMock.defaultNavModules];
    profileMock.profile.business_type = 'sport_school';
  });

  it('renders sidebar groups and navigation modules for Escola Esportiva', () => {
    renderSidebar();

    // Verify groups rendered in expanded state
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Relacionamento / Alunos')).toBeInTheDocument();

    // Verify links rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Alunos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
  });

  it('collapses and expands when toggle button is clicked', () => {
    renderSidebar();

    // Starts expanded by default
    expect(screen.getByText('Recolher')).toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBeNull();

    // Click collapse
    const toggleButton = screen.getByRole('button', { name: 'Recolher menu lateral' });
    fireEvent.click(toggleButton);

    // Text "Recolher" should disappear when collapsed
    expect(screen.queryByText('Recolher')).not.toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

    // Click expand
    const expandButton = screen.getByRole('button', { name: 'Expandir menu lateral' });
    fireEvent.click(expandButton);

    // Text "Recolher" should appear again
    expect(screen.getByText('Recolher')).toBeInTheDocument();
    expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
  });

  it('renders sidebar groups and navigation modules for Arena', () => {
    businessContextMock.businessType = 'arena';
    profileMock.profile.business_type = 'arena';
    businessContextMock.navModules = [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/reservantes', label: 'Reservantes' },
      { path: '/comandas', label: 'Comandas' },
      { path: '/produtos', label: 'Produtos' },
      { path: '/relatorios', label: 'Relatórios' },
    ];

    renderSidebar();

    // Verify groups rendered in expanded state
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Operação')).toBeInTheDocument();
    expect(screen.getByText('Consumo e Estoque')).toBeInTheDocument();

    // Verify links rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Reservantes')).toBeInTheDocument();
    expect(screen.getByText('Comandas')).toBeInTheDocument();
    expect(screen.getByText('Produtos')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
  });

  it('keeps collapsed navigation links accessible by their module names', () => {
    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu lateral' }));

    const sidebarNav = within(screen.getByRole('navigation', { name: 'Navegação lateral' }));

    expect(sidebarNav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(sidebarNav.getByRole('link', { name: 'Alunos' })).toHaveAttribute('href', '/alunos');
    expect(sidebarNav.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/relatorios');
  });

  it('cleans sidebar body state when the provider unmounts', () => {
    const { unmount } = renderSidebarProviderOnly();

    expect(document.body).toHaveClass('has-sidebar');
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('240px');

    unmount();

    expect(document.body).not.toHaveClass('has-sidebar');
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('0px');
  });
});
