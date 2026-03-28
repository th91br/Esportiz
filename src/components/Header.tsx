import { Menu, X, LogOut, Moon, Sun } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-resenhas.png';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Calendário', path: '/calendario' },
  { label: 'Alunos', path: '/alunos' },
  { label: 'Presença', path: '/presenca' },
  { label: 'Planos', path: '/planos' },
  { label: 'Pagamentos', path: '/pagamentos' },
  { label: 'Aniversários', path: '/aniversariantes' },
  { label: 'Relatórios', path: '/relatorios' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const location = useLocation();
  const { signOut, user } = useAuth();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Resenha's Escola de Futevôlei" className="h-10 w-10 rounded-xl object-cover" />
          <div className="hidden sm:block">
            <h1 className="font-display text-lg font-bold leading-none text-foreground">
              Resenha's
            </h1>
            <p className="text-xs font-medium text-primary">Escola de Futevôlei</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Profile & Mobile Menu */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</span>
            <NotificationBell />
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsDark(!isDark)} title={isDark ? 'Modo claro' : 'Modo escuro'}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-border bg-background animate-fade-in">
          <div className="container py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { setIsDark(!isDark); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4 inline mr-2" /> : <Moon className="h-4 w-4 inline mr-2" />}
              {isDark ? 'Modo Claro' : 'Modo Escuro'}
            </button>
            <button
              onClick={() => { setIsMenuOpen(false); signOut(); }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4 inline mr-2" />Sair
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
