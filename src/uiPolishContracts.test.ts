import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('premium UI polish contracts', () => {
  const notificationBell = readFileSync(resolve(process.cwd(), 'src/components/NotificationBell.tsx'), 'utf-8');
  const comandasPage = readFileSync(resolve(process.cwd(), 'src/pages/ComandasPage.tsx'), 'utf-8');
  const communicationPage = readFileSync(resolve(process.cwd(), 'src/pages/CommunicationPage.tsx'), 'utf-8');
  const contractsPage = readFileSync(resolve(process.cwd(), 'src/pages/ContractsPage.tsx'), 'utf-8');
  const arenaAgendaPage = readFileSync(resolve(process.cwd(), 'src/pages/ArenaAgendaPage.tsx'), 'utf-8');
  const attendancePage = readFileSync(resolve(process.cwd(), 'src/pages/AttendancePage.tsx'), 'utf-8');
  const birthdaysPage = readFileSync(resolve(process.cwd(), 'src/pages/BirthdaysPage.tsx'), 'utf-8');
  const calendarPage = readFileSync(resolve(process.cwd(), 'src/pages/CalendarPage.tsx'), 'utf-8');
  const groupsPage = readFileSync(resolve(process.cwd(), 'src/pages/GroupsPage.tsx'), 'utf-8');
  const modalitiesPage = readFileSync(resolve(process.cwd(), 'src/pages/ModalitiesPage.tsx'), 'utf-8');
  const paymentsPage = readFileSync(resolve(process.cwd(), 'src/pages/PaymentsPage.tsx'), 'utf-8');
  const plansPage = readFileSync(resolve(process.cwd(), 'src/pages/PlansPage.tsx'), 'utf-8');
  const sidebar = readFileSync(resolve(process.cwd(), 'src/components/ui/sidebar.tsx'), 'utf-8');
  const globalCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');
  const indexPage = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf-8');
  const courtsPage = readFileSync(resolve(process.cwd(), 'src/pages/CourtsPage.tsx'), 'utf-8');
  const reportsPage = readFileSync(resolve(process.cwd(), 'src/pages/ReportsPage.tsx'), 'utf-8');
  const settingsPage = readFileSync(resolve(process.cwd(), 'src/pages/SettingsPage.tsx'), 'utf-8');
  const studentProfilePage = readFileSync(resolve(process.cwd(), 'src/pages/StudentProfilePage.tsx'), 'utf-8');
  const studentPortalPage = readFileSync(resolve(process.cwd(), 'src/pages/StudentPortalPage.tsx'), 'utf-8');
  const studentsPage = readFileSync(resolve(process.cwd(), 'src/pages/StudentsPage.tsx'), 'utf-8');
  const productsPage = readFileSync(resolve(process.cwd(), 'src/pages/ProductsPage.tsx'), 'utf-8');
  const salesPage = readFileSync(resolve(process.cwd(), 'src/pages/SalesPage.tsx'), 'utf-8');

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

  it('keeps the groups page on the shared app shell and page header pattern', () => {
    expect(groupsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(groupsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(groupsPage).toContain('<AppPage');
    expect(groupsPage).toContain('<PageHeader');
    expect(groupsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(groupsPage).not.toContain('<main className="container py-6');
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

  it('keeps the dashboard page on the shared app shell pattern', () => {
    expect(indexPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(indexPage).toContain('<AppPage');
    expect(indexPage).not.toContain("import { Header } from '@/components/Header';");
    expect(indexPage).not.toContain('<main className="container py-6');
  });

  it('keeps the courts page on the shared app shell and page header pattern', () => {
    expect(courtsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(courtsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(courtsPage).toContain('<AppPage>');
    expect(courtsPage).toContain('<PageHeader');
    expect(courtsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(courtsPage).not.toContain('<main className="container py-6');
  });

  it('keeps the arena agenda page on the shared app shell and page header pattern', () => {
    expect(arenaAgendaPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(arenaAgendaPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(arenaAgendaPage).toContain('<AppPage');
    expect(arenaAgendaPage).toContain('<PageHeader');
    expect(arenaAgendaPage).not.toContain("import { Header } from '@/components/Header';");
    expect(arenaAgendaPage).not.toContain('<main className="container py-6');
  });

  it('keeps the comandas page on the shared app shell and page header pattern', () => {
    expect(comandasPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(comandasPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(comandasPage).toContain('<AppPage>');
    expect(comandasPage).toContain('<PageHeader');
    expect(comandasPage).not.toContain("import { Header } from '@/components/Header';");
    expect(comandasPage).not.toContain('<main className="container py-6');
  });

  it('keeps the communication page on the shared app shell and page header pattern', () => {
    expect(communicationPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(communicationPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(communicationPage).toContain('<AppPage>');
    expect(communicationPage).toContain('<PageHeader');
    expect(communicationPage).not.toContain("import { Header } from '@/components/Header';");
    expect(communicationPage).not.toContain('<main className="container py-6');
  });

  it('keeps the calendar page on the shared app shell and page header pattern', () => {
    expect(calendarPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(calendarPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(calendarPage).toContain('<AppPage>');
    expect(calendarPage).toContain('<PageHeader');
    expect(calendarPage).not.toContain("import { Header } from '@/components/Header';");
    expect(calendarPage).not.toContain('<main className="container py-6');
  });

  it('keeps the reports page on the shared app shell and page header pattern', () => {
    expect(reportsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(reportsPage).toContain("import { IconPanelTitle } from '@/components/layout/IconPanelTitle';");
    expect(reportsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(reportsPage).toContain('<AppPage');
    expect(reportsPage).toContain('<IconPanelTitle');
    expect(reportsPage).toContain('<PageHeader');
    expect(reportsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(reportsPage).not.toContain('<main className="container py-6');
    expect(reportsPage).not.toContain('font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2');
  });

  it('keeps the settings page on the shared app shell and page header pattern', () => {
    expect(settingsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(settingsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(settingsPage).toContain("import { SettingsCardHeader } from '@/components/layout/SettingsCardHeader';");
    expect(settingsPage).toContain("import { SettingsField } from '@/components/layout/SettingsField';");
    expect(settingsPage).toContain("import { SettingsGroupTitle } from '@/components/layout/SettingsGroupTitle';");
    expect(settingsPage).toContain("import { SettingsSection } from '@/components/layout/SettingsSection';");
    expect(settingsPage).toContain("import { StatusPill } from '@/components/ui/status-pill';");
    expect(settingsPage).toContain('<AppPage');
    expect(settingsPage).toContain('<PageHeader');
    expect(settingsPage).toContain('<SettingsCardHeader');
    expect(settingsPage).toContain('<SettingsField');
    expect(settingsPage).toContain('<SettingsGroupTitle');
    expect(settingsPage).toContain('<SettingsSection');
    expect(settingsPage).toContain('<StatusPill');
    expect(settingsPage).toContain('<AlertDialog open={showNicheConfirmation}');
    expect((settingsPage.match(/<CardTitle className="flex items-center gap-2 text-lg">/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(settingsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(settingsPage).not.toContain('<main className="container py-6');
    expect(settingsPage).not.toContain('grid gap-6 md:grid-cols-3');
    expect(settingsPage).not.toContain('md:col-span-1 space-y-1');
    expect(settingsPage).not.toContain('md:col-span-2');
    expect(settingsPage).not.toContain('text-green-600 bg-green-50');
    expect(settingsPage).not.toContain('text-amber-600 bg-amber-50');
    expect(settingsPage).not.toContain('text-xs font-bold text-muted-foreground uppercase tracking-wider');
  });

  it('keeps the students/reservants page on the shared app shell and page header pattern', () => {
    expect(studentsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(studentsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(studentsPage).toContain('<AppPage>');
    expect(studentsPage).toContain('<PageHeader');
    expect(studentsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(studentsPage).not.toContain('<main className="container py-6');
  });

  it('keeps the student profile page on the shared app shell while preserving print-only contract output', () => {
    expect(studentProfilePage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(studentProfilePage).toContain("import { IconCardTitle } from '@/components/layout/IconCardTitle';");
    expect(studentProfilePage).toContain('<AppPage');
    expect(studentProfilePage).toContain('<IconCardTitle');
    expect(studentProfilePage).toContain('print:hidden');
    expect(studentProfilePage).toContain('hidden print:block');
    expect(studentProfilePage).not.toContain("import { Header } from '@/components/Header';");
    expect(studentProfilePage).not.toContain('<main className="container py-6');
    expect(studentProfilePage).not.toContain('CardTitle className="text-lg flex items-center gap-2"');
  });

  it('keeps the student portal page on shared icon card titles for compact operational cards', () => {
    expect(studentPortalPage).toContain("import { IconCardTitle } from '@/components/layout/IconCardTitle';");
    expect(studentPortalPage).toContain('<IconCardTitle');
    expect(studentPortalPage).not.toContain('CardTitle className="text-base font-bold flex items-center gap-2"');
  });

  it('keeps the products page on the shared app shell and page header pattern', () => {
    expect(productsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(productsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(productsPage).toContain('<AppPage');
    expect(productsPage).toContain('<PageHeader');
    expect(productsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(productsPage).not.toContain('<main className="container py-6');
  });

  it('keeps the sales page on the shared app shell and page header pattern', () => {
    expect(salesPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(salesPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(salesPage).toContain('<AppPage');
    expect(salesPage).toContain('<PageHeader');
    expect(salesPage).not.toContain("import { Header } from '@/components/Header';");
    expect(salesPage).not.toContain('<main className="container py-6');
  });
});
