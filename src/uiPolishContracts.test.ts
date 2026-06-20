import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('premium UI polish contracts', () => {
  const notificationBell = readFileSync(resolve(process.cwd(), 'src/components/NotificationBell.tsx'), 'utf-8');
  const comandasPage = readFileSync(resolve(process.cwd(), 'src/pages/ComandasPage.tsx'), 'utf-8');
  const contractsPage = readFileSync(resolve(process.cwd(), 'src/pages/ContractsPage.tsx'), 'utf-8');
  const arenaAgendaPage = readFileSync(resolve(process.cwd(), 'src/pages/ArenaAgendaPage.tsx'), 'utf-8');
  const attendancePage = readFileSync(resolve(process.cwd(), 'src/pages/AttendancePage.tsx'), 'utf-8');
  const birthdaysPage = readFileSync(resolve(process.cwd(), 'src/pages/BirthdaysPage.tsx'), 'utf-8');
  const modalitiesPage = readFileSync(resolve(process.cwd(), 'src/pages/ModalitiesPage.tsx'), 'utf-8');
  const paymentsPage = readFileSync(resolve(process.cwd(), 'src/pages/PaymentsPage.tsx'), 'utf-8');
  const plansPage = readFileSync(resolve(process.cwd(), 'src/pages/PlansPage.tsx'), 'utf-8');
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

  it('keeps the modalities page on the shared app shell and page header pattern', () => {
    expect(modalitiesPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(modalitiesPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(modalitiesPage).toContain('<AppPage>');
    expect(modalitiesPage).toContain('<PageHeader');
    expect(modalitiesPage).not.toContain("import { Header } from '@/components/Header';");
    expect(modalitiesPage).not.toContain('<main className="container py-6');
  });

  it('keeps the plans page on the shared app shell and page header pattern', () => {
    expect(plansPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(plansPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(plansPage).toContain('<AppPage>');
    expect(plansPage).toContain('<PageHeader');
    expect(plansPage).not.toContain("import { Header } from '@/components/Header';");
    expect(plansPage).not.toContain('<main className="container py-6');
  });

  it('keeps the attendance page on the shared app shell and page header pattern', () => {
    expect(attendancePage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(attendancePage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(attendancePage).toContain('<AppPage');
    expect(attendancePage).toContain('<PageHeader');
    expect(attendancePage).not.toContain("import { Header } from '@/components/Header';");
    expect(attendancePage).not.toContain('<main className="container py-6');
  });

  it('keeps the birthdays page on the shared app shell and page header pattern', () => {
    expect(birthdaysPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(birthdaysPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(birthdaysPage).toContain('<AppPage');
    expect(birthdaysPage).toContain('<PageHeader');
    expect(birthdaysPage).not.toContain("import { Header } from '@/components/Header';");
    expect(birthdaysPage).not.toContain('<main className="container py-6');
  });
  it('keeps the contracts page on the shared app shell while preserving print-only output', () => {
    expect(contractsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(contractsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(contractsPage).toContain('<AppPage');
    expect(contractsPage).toContain('<PageHeader');
    expect(contractsPage).toContain('print:hidden');
    expect(contractsPage).toContain('hidden print:block');
    expect(contractsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(contractsPage).not.toContain('<main className="container py-6');
  });
});
