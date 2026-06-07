import { Menu, X, LogOut, Moon, Sun } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { useProfile } from '@/hooks/queries/useProfile';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Logo } from '@/components/Logo';
import { Settings } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { navModules, canViewSettings } = useBusinessContext();
  const mobileMenuLabel = isMenuOpen ? 'Fechar menu principal' : 'Abrir menu principal';
  const themeToggleLabel = isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo — sempre à esquerda */}
        <Link to="/dashboard" className="flex items-center gap-1.5 shrink-0 transition-transform hover:scale-105 active:scale-95 mr-2" title={profile?.ct_name || 'Dashboard'}>
          {profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.ct_name || 'Logo'}
              className="h-7 w-7 object-contain rounded-md shrink-0"
            />
          ) : (
            <Logo size="sm" />
          )}
          {profile?.ct_name && (
            <span className="font-display font-bold text-xs lg:text-sm hidden lg:inline-block truncate max-w-[120px] xl:max-w-[180px]">
              {profile.ct_name}
            </span>
          )}
        </Link>

        {/* Desktop Navigation — flex-1 ocupa espaco central */}
        <div className="hidden md:block flex-1 min-w-0 mx-1 relative">
          {/* Fade indicators */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background/95 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background/95 to-transparent z-10" />
          <nav aria-label="Navegação principal" className="flex items-center justify-center gap-0.5 overflow-x-auto no-scrollbar px-3">
            {navModules.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-2 py-1 lg:px-2.5 lg:py-1.5 rounded-lg text-[11px] lg:text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Actions — sempre à direita (ml-auto no mobile) */}
        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
          <NotificationBell />
          <div className="hidden md:flex items-center gap-0.5">
            {canViewSettings && (
              <Link to="/configuracoes">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  title="Configurações"
                  aria-label="Abrir configurações"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              aria-label={themeToggleLabel}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={signOut}
              title="Sair"
              aria-label="Sair do sistema"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={mobileMenuLabel}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation — same navModules list */}
      {isMenuOpen && (
        <nav id="mobile-navigation" aria-label="Menu principal mobile" className="md:hidden border-t border-border bg-background animate-fade-in">
          <div className="container py-4 space-y-1">
            {navModules.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            ))}

            {canViewSettings && (
              <Link
                to="/configuracoes"
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === '/configuracoes'
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                Configurações
              </Link>
            )}

            <div className="pt-2 border-t border-border mt-2 space-y-1">
              <button
                onClick={() => setIsDark(!isDark)}
                aria-label={themeToggleLabel}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Modo Claro' : 'Modo Escuro'}
              </button>
              <button
                onClick={signOut}
                aria-label="Sair do sistema"
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>

            <div className="pt-3 flex justify-center">
              <InstallPWAButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
