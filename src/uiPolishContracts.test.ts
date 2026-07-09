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
  const expensesPage = readFileSync(resolve(process.cwd(), 'src/pages/ExpensesPage.tsx'), 'utf-8');
  const onlineBookingPage = readFileSync(resolve(process.cwd(), 'src/pages/OnlineBookingPage.tsx'), 'utf-8');
  const modalityManager = readFileSync(resolve(process.cwd(), 'src/components/ModalityManager.tsx'), 'utf-8');
  const quickActions = readFileSync(resolve(process.cwd(), 'src/components/QuickActions.tsx'), 'utf-8');
  const todaySchedule = readFileSync(resolve(process.cwd(), 'src/components/TodaySchedule.tsx'), 'utf-8');
  const arenaTodaySchedule = readFileSync(resolve(process.cwd(), 'src/components/ArenaTodaySchedule.tsx'), 'utf-8');

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

  it('keeps payment and reservation empty results on the shared empty state', () => {
    expect(paymentsPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((paymentsPage.match(/<EmptyState/g) ?? []).length).toBe(4);
    expect(paymentsPage).not.toContain('<div className="card-elevated p-12 text-center">');
  });

  it('keeps the modalities page on the shared app shell and page header pattern', () => {
    expect(modalitiesPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(modalitiesPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(modalitiesPage).toContain('<AppPage>');
    expect(modalitiesPage).toContain('<PageHeader');
    expect(modalitiesPage).not.toContain("import { Header } from '@/components/Header';");
    expect(modalitiesPage).not.toContain('<main className="container py-6');
  });

  it('keeps the modalities overview empty result on the shared empty state', () => {
    expect(modalitiesPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((modalitiesPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(modalitiesPage).toContain('variant="outlined"');
    expect(modalitiesPage).not.toContain('<div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">');
  });

  it('keeps the modality manager on shared icon card titles', () => {
    expect(modalityManager).toContain("import { IconCardTitle } from '@/components/layout/IconCardTitle';");
    expect(modalityManager).toContain('<IconCardTitle icon={Tag} className="font-display">');
    expect(modalityManager).not.toContain('CardTitle className="flex items-center gap-2 text-lg font-display"');
  });

  it('keeps modality manager loading and empty results on shared state components', () => {
    expect(modalityManager).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect(modalityManager).toContain("import { LoadingState } from '@/components/ui/loading-state';");
    expect((modalityManager.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect((modalityManager.match(/<LoadingState/g) ?? []).length).toBe(1);
    expect(modalityManager).toContain('onClick={() => setIsAdding(true)}');
    expect(modalityManager).not.toContain('<div className="py-8 text-center border-2 border-dashed border-muted rounded-xl">');
    expect(modalityManager).not.toContain('<div className="py-4 text-center text-sm text-muted-foreground">Carregando modalidades...</div>');
  });

  it('keeps both today schedule empty results on the shared empty state', () => {
    expect(todaySchedule).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect(arenaTodaySchedule).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((todaySchedule.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect((arenaTodaySchedule.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(todaySchedule).toContain('todayTrainings.length > 0 ? (');
    expect(arenaTodaySchedule).toContain('todayReservations.length > 0 ? (');
    expect(todaySchedule).not.toContain('min-h-[200px] text-center p-6 border-2 border-dashed');
    expect(arenaTodaySchedule).not.toContain('min-h-[200px] text-center p-6 border-2 border-dashed');
  });

  it('keeps quick actions card title free of unused icon layout classes', () => {
    expect(quickActions).toContain('CardTitle className="text-lg font-display"');
    expect(quickActions).not.toContain('CardTitle className="text-lg font-display flex items-center gap-2"');
  });

  it('keeps repeated icon dialog titles on the shared icon dialog title component', () => {
    expect(communicationPage).toContain("import { IconDialogTitle } from '@/components/layout/IconDialogTitle';");
    expect(comandasPage).toContain("import { IconDialogTitle } from '@/components/layout/IconDialogTitle';");
    expect(arenaAgendaPage).toContain("import { IconDialogTitle } from '@/components/layout/IconDialogTitle';");
    expect(paymentsPage).toContain("import { IconDialogTitle } from '@/components/layout/IconDialogTitle';");
    expect(communicationPage).toContain('<IconDialogTitle icon={MessageCircle}>');
    expect(comandasPage).toContain('<IconDialogTitle icon={CreditCard}>');
    expect(arenaAgendaPage).toContain('<IconDialogTitle icon={Lock} iconClassName="text-zinc-500">');
    expect(paymentsPage).toContain('<IconDialogTitle icon={DollarSign}>');
    expect(communicationPage).not.toContain('DialogTitle className="font-display text-xl font-bold flex items-center gap-2"');
    expect(comandasPage).not.toContain('DialogTitle className="font-display text-xl font-bold flex items-center gap-2"');
    expect(arenaAgendaPage).not.toContain('DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-foreground"');
    expect(paymentsPage).not.toContain('DialogTitle className="flex items-center gap-2 text-foreground font-display font-bold"');
  });

  it('keeps plain commerce card titles on the premium display rhythm', () => {
    expect(salesPage).toContain('CardTitle className="text-lg font-display"');
    expect(expensesPage).toContain('CardTitle className="text-lg font-display"');
    expect(salesPage).not.toContain('CardTitle className="text-lg"');
    expect(expensesPage).not.toContain('CardTitle className="text-lg"');
  });

  it('keeps the plans page on the shared app shell and page header pattern', () => {
    expect(plansPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(plansPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(plansPage).toContain('<AppPage>');
    expect(plansPage).toContain('<PageHeader');
    expect(plansPage).not.toContain("import { Header } from '@/components/Header';");
    expect(plansPage).not.toContain('<main className="container py-6');
  });

  it('keeps the plans catalog empty result on the shared empty state', () => {
    expect(plansPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((plansPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(plansPage).not.toContain('<div className="col-span-full card-elevated p-12 text-center">');
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

  it('keeps birthday loading and empty results on shared state components', () => {
    expect(birthdaysPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect(birthdaysPage).toContain("import { LoadingState } from '@/components/ui/loading-state';");
    expect((birthdaysPage.match(/<EmptyState/g) ?? []).length).toBe(3);
    expect(birthdaysPage).toContain('<LoadingState label="Carregando aniversariantes" className="py-8" />');
    expect(birthdaysPage).not.toContain('text-center py-12 bg-muted/30 rounded-2xl border border-dashed');
    expect(birthdaysPage).not.toContain('<div className="text-center text-muted-foreground py-8">');
  });

  it('keeps the groups page on the shared app shell and page header pattern', () => {
    expect(groupsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(groupsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(groupsPage).toContain('<AppPage');
    expect(groupsPage).toContain('<PageHeader');
    expect(groupsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(groupsPage).not.toContain('<main className="container py-6');
  });

  it('keeps the groups grid loading and empty result on shared state components', () => {
    expect(groupsPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect(groupsPage).toContain("import { LoadingState } from '@/components/ui/loading-state';");
    expect((groupsPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect((groupsPage.match(/<LoadingState/g) ?? []).length).toBe(1);
    expect(groupsPage).not.toContain('<div className="text-center py-12 text-muted-foreground font-medium">');
    expect(groupsPage).not.toContain('card-elevated border border-border/50 shadow-sm p-12 text-center');
  });

  it('keeps the contracts page on the shared app shell while preserving print-only output', () => {
    expect(contractsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(contractsPage).toContain("import { IconCardTitle } from '@/components/layout/IconCardTitle';");
    expect(contractsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(contractsPage).toContain('<AppPage');
    expect(contractsPage).toContain('<IconCardTitle');
    expect(contractsPage).toContain('<PageHeader');
    expect(contractsPage).toContain('print:hidden');
    expect(contractsPage).toContain('hidden print:block');
    expect(contractsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(contractsPage).not.toContain('<main className="container py-6');
    expect(contractsPage).not.toContain('CardTitle className="text-lg flex items-center gap-2"');
  });

  it('keeps the contract preview empty result on the shared empty state', () => {
    expect(contractsPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((contractsPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(contractsPage).toContain('!student ? (');
    expect(contractsPage).toContain('Nenhum contrato selecionado');
    expect(contractsPage).not.toContain('<div className="card-elevated p-12 text-center flex flex-col items-center justify-center min-h-[400px]">');
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

  it('keeps the courts catalog empty result on the shared empty state', () => {
    expect(courtsPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((courtsPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(courtsPage).toContain('action={canCreateCourts ? (');
    expect(courtsPage).not.toContain('<div className="card-elevated p-16 text-center space-y-4">');
  });

  it('keeps the arena agenda page on the shared app shell and page header pattern', () => {
    expect(arenaAgendaPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(arenaAgendaPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(arenaAgendaPage).toContain('<AppPage');
    expect(arenaAgendaPage).toContain('<PageHeader');
    expect(arenaAgendaPage).not.toContain("import { Header } from '@/components/Header';");
    expect(arenaAgendaPage).not.toContain('<main className="container py-6');
  });

  it('keeps the arena agenda empty courts result on the shared empty state', () => {
    expect(arenaAgendaPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((arenaAgendaPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(arenaAgendaPage).toContain('displayedCourts.length === 0 ? (');
    expect(arenaAgendaPage).toContain('Nenhuma quadra ativa');
    expect(arenaAgendaPage).not.toContain('<div className="card-elevated p-16 text-center">');
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

  it('keeps communication audience loading and empty results on shared state components', () => {
    expect(communicationPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect(communicationPage).toContain("import { LoadingState } from '@/components/ui/loading-state';");
    expect((communicationPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect((communicationPage.match(/<LoadingState/g) ?? []).length).toBe(1);
    expect(communicationPage).not.toContain('animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full');
    expect(communicationPage).not.toContain('flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/20');
  });

  it('keeps the calendar page on the shared app shell and page header pattern', () => {
    expect(calendarPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(calendarPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(calendarPage).toContain('<AppPage>');
    expect(calendarPage).toContain('<PageHeader');
    expect(calendarPage).not.toContain("import { Header } from '@/components/Header';");
    expect(calendarPage).not.toContain('<main className="container py-6');
  });

  it('keeps the selected calendar day empty result on the shared empty state', () => {
    expect(calendarPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((calendarPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(calendarPage).toContain('action={canCreateTraining ? (');
    expect(calendarPage).toContain('onClick={() => setNewTrainingOpen(true)}');
    expect(calendarPage).not.toContain('<div className="text-center py-8">');
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
    expect(settingsPage).toContain("import { IconAlertDialogTitle } from '@/components/layout/IconAlertDialogTitle';");
    expect(settingsPage).toContain("import { StatusPill } from '@/components/ui/status-pill';");
    expect(settingsPage).toContain('<AppPage');
    expect(settingsPage).toContain('<PageHeader');
    expect(settingsPage).toContain('<SettingsCardHeader');
    expect(settingsPage).toContain('<SettingsField');
    expect(settingsPage).toContain('<SettingsGroupTitle');
    expect(settingsPage).toContain('<SettingsSection');
    expect(settingsPage).toContain('<IconAlertDialogTitle icon={AlertCircle}>');
    expect(settingsPage).toContain('<IconAlertDialogTitle icon={AlertCircle} iconClassName="text-amber-500">');
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
    expect(settingsPage).not.toContain('AlertDialogTitle className="flex items-center gap-2 text-xl font-bold"');
  });

  it('keeps the students/reservants page on the shared app shell and page header pattern', () => {
    expect(studentsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(studentsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(studentsPage).toContain('<AppPage>');
    expect(studentsPage).toContain('<PageHeader');
    expect(studentsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(studentsPage).not.toContain('<main className="container py-6');
  });

  it('keeps the students/reservants empty result on the shared empty state', () => {
    expect(studentsPage).toContain("import { EmptyState } from '@/components/ui/empty-state';");
    expect((studentsPage.match(/<EmptyState/g) ?? []).length).toBe(1);
    expect(studentsPage).not.toContain('<div className="card-elevated p-12 text-center">');
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
    expect(studentPortalPage).toContain('<IconCardTitle icon={ClipboardList} className="font-black font-display">');
    expect(studentPortalPage).not.toContain('CardTitle className="text-base font-bold flex items-center gap-2"');
    expect(studentPortalPage).not.toContain('CardTitle className="text-lg font-black font-display flex items-center gap-2"');
  });

  it('keeps the products page on the shared app shell and page header pattern', () => {
    expect(productsPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(productsPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(productsPage).toContain('<AppPage');
    expect(productsPage).toContain('<PageHeader');
    expect(productsPage).not.toContain("import { Header } from '@/components/Header';");
    expect(productsPage).not.toContain('<main className="container py-6');
  });

  it('keeps the online booking flow on shared icon card titles for step cards', () => {
    expect(onlineBookingPage).toContain("import { IconCardTitle } from '@/components/layout/IconCardTitle';");
    expect(onlineBookingPage).toContain('<IconCardTitle icon={Clock}>');
    expect(onlineBookingPage).toContain('<IconCardTitle icon={ShieldCheck}>');
    expect(onlineBookingPage).not.toContain('CardTitle className="text-lg font-bold flex items-center gap-2"');
  });

  it('keeps the sales page on the shared app shell and page header pattern', () => {
    expect(salesPage).toContain("import { AppPage } from '@/components/layout/AppPage';");
    expect(salesPage).toContain("import { IconCardTitle } from '@/components/layout/IconCardTitle';");
    expect(salesPage).toContain("import { PageHeader } from '@/components/layout/PageHeader';");
    expect(salesPage).toContain('<AppPage');
    expect(salesPage).toContain('<IconCardTitle');
    expect(salesPage).toContain('<PageHeader');
    expect(salesPage).not.toContain("import { Header } from '@/components/Header';");
    expect(salesPage).not.toContain('<main className="container py-6');
    expect(salesPage).not.toContain('CardTitle className="text-lg flex items-center gap-2"');
  });
});
