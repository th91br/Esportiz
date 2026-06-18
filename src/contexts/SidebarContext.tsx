import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLocation } from 'react-router-dom';
import { SidebarContext } from '@/contexts/sidebar';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { businessType } = useBusinessContext();
  const location = useLocation();

  // Load from localStorage, default to false (expanded)
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Check if sidebar should be active (only for authenticated, sport_school users on non-public routes)
  const isPublicRoute = ['/', '/login', '/reset-password', '/matricula', '/agendar', '/agendamento', '/portal-aluno'].includes(location.pathname);
  const isOnboarding = location.pathname === '/onboarding';
  
  // Sidebar is currently ONLY active for sport_school as per "um por vez" safety
  const isActive = Boolean(user) && !isPublicRoute && !isOnboarding && businessType === 'sport_school';

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem('sidebar-collapsed', String(collapsed));
    } catch (e) {
      console.warn('Failed to save sidebar state to localStorage', e);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Sync the CSS variable --sidebar-width to control the page layout dynamically
  useEffect(() => {
    const root = document.documentElement;
    if (isActive) {
      const width = isCollapsed ? '72px' : '240px';
      root.style.setProperty('--sidebar-width', width);
      document.body.classList.add('has-sidebar');
    } else {
      root.style.setProperty('--sidebar-width', '0px');
      document.body.classList.remove('has-sidebar');
    }
  }, [isActive, isCollapsed]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapse, isActive }}>
      {children}
    </SidebarContext.Provider>
  );
}
