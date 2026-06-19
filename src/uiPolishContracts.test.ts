import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('premium UI polish contracts', () => {
  const notificationBell = readFileSync(resolve(process.cwd(), 'src/components/NotificationBell.tsx'), 'utf-8');
  const comandasPage = readFileSync(resolve(process.cwd(), 'src/pages/ComandasPage.tsx'), 'utf-8');
  const arenaAgendaPage = readFileSync(resolve(process.cwd(), 'src/pages/ArenaAgendaPage.tsx'), 'utf-8');
  const paymentsPage = readFileSync(resolve(process.cwd(), 'src/pages/PaymentsPage.tsx'), 'utf-8');
  const sidebar = readFileSync(resolve(process.cwd(), 'src/components/ui/sidebar.tsx'), 'utf-8');
  const globalCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');

  it('does not use thick colored side stripes on polished operational cards', () => {
    expect(notificationBell).not.toContain('border-l-4');
    expect(comandasPage).not.toContain('border-l-4');
    expect(comandasPage).not.toContain('animate-ping');
  });

  it('keeps global styles free of starter-template leftovers and gradient text utilities', () => {
    expect(existsSync(resolve(process.cwd(), 'src/App.css'))).toBe(false);
    expect(globalCss).not.toContain('.text-gradient-primary');
    expect(globalCss).not.toContain('background-clip: text');
  });

  it('keeps operational sheets described for assistive technology', () => {
    expect(notificationBell).toContain('SheetDescription');
    expect(arenaAgendaPage).toContain('SheetDescription');
    expect(sidebar).toContain('SheetDescription');
    expect(sidebar).toContain('SheetTitle');
    expect(sidebar).toContain('sr-only');
  });

  it('keeps notification controls named and tab state accessible', () => {
    expect(notificationBell).toContain('aria-label={notificationTriggerLabel}');
    expect(notificationBell).toContain('aria-label="Fechar notificações"');
    expect(notificationBell).toContain('aria-pressed={isActive}');
    expect(notificationBell).toContain('Notificações de aniversariantes');
  });

  it('keeps comanda cards operable by keyboard without changing the nested action buttons', () => {
    expect(comandasPage).toContain('const handleComandaCardKeyDown');
    expect(comandasPage).toContain('role="button"');
    expect(comandasPage).toContain('tabIndex={0}');
    expect(comandasPage).toContain("if (event.target !== event.currentTarget) return;");
  });

  it('keeps the payments page on the shared app shell and page header pattern', () => {
    expect(paymentsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(paymentsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(paymentsPage).toContain('<AppPage>');
    expect(paymentsPage).toContain('<PageHeader');
    expect(paymentsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(paymentsPage).not.toContain('<main className="container py-6');
  });
});
