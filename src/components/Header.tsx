import { Menu, X, LogOut, Moon, Sun, UserCircle } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Logo } from '@/components/Logo';
import { Settings } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { navModules } = useBusinessContext();

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
      <div className="container flex h-16 items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0 transition-transform hover:scale-105 active:scale-95">
          {profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.ct_name || 'Logo'}
              className="h-8 w-8 object-contain rounded-md shrink-0"
            />
          ) : (
            <Logo size="sm" />
          )}
          {profile?.ct_name && (
            <span className="font-display font-bold text-sm lg:text-base hidden sm:inline-block truncate max-w-[120px] lg:max-w-[220px] whitespace-nowrap">
              {profile.ct_name}
            </span>
          )}
        </Link>

        {/* Desktop Navigation — driven by navModules (business-type aware) */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 mx-2 min-w-0 overflow-x-auto scrollbar-none">
          {navModules.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors whitespace-nowrap shrink-0',
                location.pathname === item.path
                  ? 'text-primary bg-primary/10 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              title={`Logado como: ${user?.email}`}
            >
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
            <InstallPWAButton />
            <Link to="/configuracoes">
              <Button variant="ghost" size="icon" className="rounded-full" title="Configurações">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={signOut}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation — same navModules list */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-border bg-background animate-fade-in">
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

            {/* Settings always visible */}
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

            <div className="pt-2 border-t border-border mt-2 space-y-1">
              <button
                onClick={() => setIsDark(!isDark)}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Modo Claro' : 'Modo Escuro'}
              </button>
              <button
                onClick={signOut}
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
