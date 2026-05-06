import {
  Users,
  Calendar,
  CheckCircle,
  DollarSign,
  Eye,
  EyeOff,
  Cake,
  Tag,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Landmark,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { TodaySchedule } from '@/components/TodaySchedule';
import { ArenaTodaySchedule } from '@/components/ArenaTodaySchedule';
import { QuickActions } from '@/components/QuickActions';
import { OverdueAlert } from '@/components/OverdueAlert';
import { Button } from '@/components/ui/button';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';
import { useExpenses } from '@/hooks/queries/useExpenses';
import { useSales } from '@/hooks/queries/useSales';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { getActiveMonthlyStudents, getTotalStudents } from '@/lib/studentHelpers';
import { formatCurrency } from '@/lib/formatCurrency';
import { DashboardCharts } from '@/components/DashboardCharts';
import { useProfile } from '@/hooks/queries/useProfile';
import { useModalities } from '@/hooks/queries/useModalities';
import { Logo } from '@/components/Logo';

export default function Index() {
  const { students, loadingStudents } = useStudents();
  const { plans, loadingPlans } = usePlans();
  const { trainings, loadingTrainings } = useTrainings();
  const { attendance, loadingAttendance } = useAttendance();
  const { payments, loadingPayments } = usePayments();
  const { expenses, loadingExpenses } = useExpenses();
  const { sales } = useSales();
  const loading =
    loadingStudents ||
    loadingPlans ||
    loadingTrainings ||
    loadingAttendance ||
    loadingPayments ||
    loadingExpenses;

  const [privacyMode, togglePrivacyMode] = usePrivacyMode();
  const { profile } = useProfile();
  const { modalities } = useModalities();
  const { labels, isSportSchool, isArena, isOther } = useBusinessContext();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const todayDateStr = new Date().toISOString().split('T')[0];

  // ── Alunos / Clientes ──
  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const activeStudents = activeMonthly.length;
  const totalStudents = getTotalStudents(students);

  // ── Treinos / Reservas / Aulas ──
  const todayTrainings = trainings.filter((t) => t.date === todayDateStr).length;

  // ── Presença ──
  const attendanceRate =
    attendance.length > 0
      ? Math.round((attendance.filter((a) => a.present).length / attendance.length) * 100)
      : 0;

  // ── Financeiro ──
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  let expectedRevenue = 0;
  let receivedRevenue = 0;
  payments.forEach((p) => {
    if (p.monthRef === currentMonthStr) {
      expectedRevenue += p.amount;
      if (p.paid) receivedRevenue += p.amount;
    }
  });
  const revenueProgress =
    expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;

  let totalExpensesPaid = 0;
  expenses.forEach((exp) => {
    if (exp.date.slice(0, 7) === currentMonthStr && exp.paid) {
      totalExpensesPaid += exp.amount;
    }
  });
  const netProfit = receivedRevenue - totalExpensesPaid;

  // ── Vendas de hoje (Arena usa isso como destaque) ──
  const todaySalesTotal = sales
    .filter((s) => s.soldAt.startsWith(todayDateStr))
    .reduce((sum, s) => sum + s.total, 0);

  // ── Aniversários (só sport_school) ──
  const birthdaysToday = students.filter((s) => {
    if (!s.active || !s.birthDate) return false;
    const today = new Date();
    const [, month, day] = s.birthDate.split('-').map(Number);
    return today.getMonth() + 1 === month && today.getDate() === day;
  });
  const birthdaysMonth = students.filter((s) => {
    if (!s.active || !s.birthDate) return false;
    const [, month] = s.birthDate.split('-').map(Number);
    return new Date().getMonth() + 1 === month;
  });

  // ── Quadras / Modalidades ──
  const modalityStats = modalities
    .map((mod) => ({
      ...mod,
      studentCount: students.filter((s) => s.active && s.modalityId === mod.id).length,
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  // ── Arena Specific Stats ──
  const occupancyRate = isArena ? (() => {
    const activeCourts = modalities.filter(c => {
      try {
        const meta = typeof (c as any).metadata === 'string' ? JSON.parse((c as any).metadata) : ((c as any).metadata || {});
        return meta.isActive !== false;
      } catch { return true; }
    });
    const totalHoursAvailable = activeCourts.length * 15 * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const monthReservations = trainings.filter(t => t.date.startsWith(currentMonthStr) && (t as any).status !== 'cancelled');
    const totalHoursBooked = monthReservations.reduce((acc, r) => acc + ((r as any).duration_minutes || 60) / 60, 0);
    return totalHoursAvailable > 0 ? Math.round((totalHoursBooked / totalHoursAvailable) * 100) : 0;
  })() : 0;

  const pv = (val: number | string) => (privacyMode ? '••••' : val);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 md:space-y-8">
        {/* ── Hero Banner ── */}
        <section className="animate-fade-up">
          <div className="bg-gradient-hero rounded-2xl p-6 md:p-8 text-white">
            <div className="max-w-2xl">
              <p className="text-white/80 text-sm font-medium mb-2">
                {greeting}, seja bem-vindo(a) de volta!
              </p>
              <div className="flex items-center gap-3 mb-2">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.ct_name || ''}
                    className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-xl bg-white/10 p-1"
                  />
                ) : (
                  <div className="bg-white/10 p-2 rounded-xl">
                    <Logo size="sm" variant="white" />
                  </div>
                )}
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold">
                  {profile?.ct_name || 'Esportiz'}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 text-sm font-medium text-white/90">
                <span className="bg-white/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2 w-fit">
                  <Calendar className="h-4 w-4" />
                  {loading
                    ? '...'
                    : todayTrainings > 0
                    ? `${todayTrainings} ${labels.trainingLabelSingular.toLowerCase()}(s) hoje`
                    : `Nenhum(a) ${labels.trainingLabelSingular.toLowerCase()} hoje`}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Overdue Alert ── */}
        <OverdueAlert privacyMode={privacyMode} />

        {/* ── Aniversários de hoje (só sport_school) ── */}
        {isSportSchool && birthdaysToday.length > 0 && (
          <section className="animate-fade-up">
            <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-lg shadow-primary/20">
                  <Cake className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">
                    Parabéns aos aniversariantes! 🎂
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {birthdaysToday.length === 1
                      ? `${birthdaysToday[0].name} faz aniversário hoje!`
                      : `${birthdaysToday.length} ${labels.studentLabel.toLowerCase()} fazem aniversário hoje!`}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full md:w-auto btn-primary-gradient">
                <a href="/aniversariantes">Ver & Parabenizar</a>
              </Button>
            </div>
          </section>
        )}

        {/* ── Stats ── */}
        <section className="space-y-3">
          {/* Privacy toggle */}
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={togglePrivacyMode}
              title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {/* ── Linha 1: KPIs operacionais por tipo ── */}
          {isSportSchool && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                title={`${labels.studentLabel} Ativos`}
                value={loading ? '...' : pv(activeStudents)}
                icon={Users}
                description={privacyMode ? '' : `de ${totalStudents} total`}
              />
              <StatCard
                title={`${labels.trainingLabel} de Hoje`}
                value={loading ? '...' : pv(todayTrainings)}
                icon={Calendar}
                variant="primary"
              />
              <StatCard
                title={`Taxa de ${labels.attendanceLabel}`}
                value={loading ? '...' : pv(`${attendanceRate}%`)}
                icon={CheckCircle}
              />
              <StatCard
                title="Aniversários (Mês)"
                value={loading ? '...' : pv(birthdaysMonth.length)}
                icon={Cake}
                description={privacyMode ? '' : `${labels.studentLabel} este mês`}
              />
            </div>
          )}

          {isArena && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                title="Quadras Ativas"
                value={loading ? '...' : pv(modalities.length)}
                icon={Landmark}
              />
              <StatCard
                title="Reservas de Hoje"
                value={loading ? '...' : pv(todayTrainings)}
                icon={Calendar}
                variant="primary"
              />
              <StatCard
                title="Taxa de Ocupação"
                value={loading ? '...' : pv(`${occupancyRate}%`)}
                icon={TrendingUp}
                description={privacyMode ? '' : 'Média do mês'}
              />
              <StatCard
                title="Faturamento do Mês"
                value={loading ? '...' : pv(formatCurrency(receivedRevenue))}
                icon={DollarSign}
                description={privacyMode ? '' : 'Total recebido'}
              />
            </div>
          )}

          {isOther && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <StatCard
                title={`${labels.studentLabel} Ativos`}
                value={loading ? '...' : pv(activeStudents)}
                icon={Users}
                description={privacyMode ? '' : `de ${totalStudents} total`}
              />
              <StatCard
                title={`${labels.trainingLabel} de Hoje`}
                value={loading ? '...' : pv(todayTrainings)}
                icon={Calendar}
                variant="primary"
              />
              <StatCard
                title={`Taxa de ${labels.attendanceLabel}`}
                value={loading ? '...' : pv(`${attendanceRate}%`)}
                icon={CheckCircle}
              />
            </div>
          )}

          {/* ── Linha 2: Financeiro ── */}
          {!isArena && (
            <div className={`grid grid-cols-1 gap-3 md:gap-4 ${isSportSchool ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              <StatCard
                title="Faturamento Total"
                value={loading ? '...' : pv(formatCurrency(expectedRevenue))}
                icon={DollarSign}
                description={privacyMode ? '' : 'Total bruto esperado'}
              />
              <StatCard
                title="Recebido no Mês"
                value={loading ? '...' : pv(formatCurrency(receivedRevenue))}
                icon={CheckCircle}
                variant="primary"
                progress={privacyMode ? undefined : { value: revenueProgress, label: 'Meta Mensal' }}
              />
              {!isSportSchool && (
                <StatCard
                  title="Lucro Líquido"
                  value={loading ? '...' : pv(formatCurrency(netProfit))}
                  icon={netProfit >= 0 ? TrendingUp : TrendingDown}
                  variant={netProfit >= 0 ? 'primary' : undefined}
                  description={privacyMode ? '' : `Despesas pagas: ${formatCurrency(totalExpensesPaid)}`}
                />
              )}
            </div>
          )}
        </section>

        {/* ── Quadras / Modalidades — sport_school e arena ── */}
        {(isSportSchool || isArena) && modalities.length > 0 && (
          <section className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-4 px-1">
              {isArena ? (
                <Landmark className="h-4 w-4 text-primary" />
              ) : (
                <Tag className="h-4 w-4 text-primary" />
              )}
              <h2 className="font-display font-bold text-lg">
                Suas {labels.modalityLabel}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {modalityStats.map((mod) => (
                <div
                  key={mod.id}
                  className="card-interactive p-3 flex items-center gap-3 border-primary/5 hover:border-primary/20 transition-all cursor-pointer"
                  onClick={() => (window.location.href = '/modalidades')}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: mod.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{mod.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                      {mod.studentCount} {labels.studentLabel.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Turmas — other ── */}
        {isOther && modalities.length > 0 && (
          <section className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-4 px-1">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="font-display font-bold text-lg">Suas {labels.groupLabel}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {modalityStats.map((mod) => (
                <div
                  key={mod.id}
                  className="card-interactive p-3 flex items-center gap-3 border-primary/5 hover:border-primary/20 transition-all cursor-pointer"
                  onClick={() => (window.location.href = '/turmas')}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: mod.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{mod.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                      {mod.studentCount} {labels.studentLabel.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Charts ── */}
        <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <DashboardCharts
            payments={payments}
            attendance={attendance}
            privacyMode={privacyMode}
          />
        </section>

        {/* ── Agenda + Quick Actions ── */}
        <div
          className="grid lg:grid-cols-3 gap-6 animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="lg:col-span-2">
            {isArena ? <ArenaTodaySchedule /> : <TodaySchedule />}
          </div>
          <div className="lg:col-span-1 border border-border/50 rounded-2xl bg-muted/5 flex flex-col pt-1 p-0.5">
            <QuickActions />
          </div>
        </div>
      </main>
    </div>
  );
}
