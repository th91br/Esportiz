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
  Star,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppPage } from '@/components/layout/AppPage';
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
import { useProducts } from '@/hooks/queries/useProducts';
import { useReservations } from '@/hooks/queries/useReservations';
import { useCourts } from '@/hooks/queries/useCourts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { calculateArenaOccupancy } from '@/lib/arenaOccupancy';
import { getActiveMonthlyStudents, getTotalStudents } from '@/lib/studentHelpers';
import { formatCurrency } from '@/lib/formatCurrency';
import { getReservationPaidAmount } from '@/lib/financialContracts';
import { DashboardCharts } from '@/components/DashboardCharts';
import { useProfile } from '@/hooks/queries/useProfile';
import { useModalities } from '@/hooks/queries/useModalities';
import { useGroups } from '@/hooks/queries/useGroups';
import { Logo } from '@/components/Logo';
import { useMemo } from 'react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useComandas } from '@/hooks/queries/useComandas';
import { getDashboardAccess } from '@/lib/dashboardAccess';
import { useNavigate } from 'react-router-dom';

type ArenaCourtMetadata = {
  isActive?: boolean;
};

function parseArenaCourtMetadata(metadata: unknown): ArenaCourtMetadata {
  if (!metadata) return {};

  try {
    const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    return parsed && typeof parsed === 'object' ? parsed as ArenaCourtMetadata : {};
  } catch {
    return {};
  }
}

export default function Index() {
  const navigate = useNavigate();
  const rolePermissions = useRolePermissions();
  const { organizationRole } = rolePermissions;
  const { businessType, labels, isSportSchool, isArena } = useBusinessContext();
  const dashboardAccess = getDashboardAccess(organizationRole, businessType);

  // Permissoes derivadas do sistema centralizado de roles
  const canViewFinancials = rolePermissions.can('reports', 'view_sensitive_financials');
  const canViewPayments   = rolePermissions.can('payments', 'view');
  const canViewStudents   = rolePermissions.can('students', 'view') || rolePermissions.can('reservants', 'view');
  const canViewModalities = rolePermissions.can('modalities', 'view') || rolePermissions.can('courts', 'view');

  const isEmployee     = organizationRole === 'receptionist' || organizationRole === 'instructor';
  const isReceptionist = organizationRole === 'receptionist';
  const isInstructor   = organizationRole === 'instructor';

  const { students, loadingStudents } = useStudents({ enabled: dashboardAccess.loadStudents });
  const { plans, loadingPlans } = usePlans({ enabled: dashboardAccess.loadPlans });
  const { trainings, loadingTrainings } = useTrainings({ enabled: dashboardAccess.loadTrainings });
  const { attendance, loadingAttendance } = useAttendance({ enabled: dashboardAccess.loadAttendance });
  const { payments, loadingPayments } = usePayments({ enabled: dashboardAccess.loadPayments });
  const { expenses, loadingExpenses } = useExpenses({ enabled: dashboardAccess.loadExpenses });
  const { sales, loadingSales } = useSales({ enabled: dashboardAccess.loadSales });
  const { activeProducts, loadingProducts } = useProducts({ enabled: dashboardAccess.loadProducts });
  const { reservations, loadingReservations } = useReservations({ enabled: dashboardAccess.loadReservations });
  const { courts, loadingCourts } = useCourts({ enabled: dashboardAccess.loadCourts });
  const { comandas, loadingComandas } = useComandas({ enabled: dashboardAccess.loadComandas });

  const lowStockProducts = useMemo(() => {
    return activeProducts.filter((p) => p.trackStock && p.stockQuantity <= p.minStock);
  }, [activeProducts]);
  const { groups, loadingGroups } = useGroups({ enabled: dashboardAccess.loadGroups });

  const loadingFinancials = loadingPayments || loadingExpenses || (isArena && (loadingSales || loadingReservations));
  const todayLoading = isArena ? loadingReservations : loadingTrainings;

  const [privacyMode, togglePrivacyMode] = usePrivacyMode();
  const { profile } = useProfile();
  const { modalities, loadingModalities } = useModalities({ enabled: dashboardAccess.loadModalities });

  const activeGroups = useMemo(() => {
    return groups.filter((g) => g.active);
  }, [groups]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Format local date securely as YYYY-MM-DD
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Alunos / Clientes ──
  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const activeStudents = activeMonthly.length;
  const totalStudents = getTotalStudents(students);

  // ── Treinos / Reservas / Aulas ──
  const todayTrainings = trainings.filter((t) => t.date === todayDateStr).length;

  // ── Reservas de Hoje (Arena) — conta reservas reais, não treinos ──
  const todayReservationsCount = isArena
    ? reservations.filter((r) => r.date === todayDateStr && r.status !== 'cancelled').length
    : 0;

  // ── Quadras Ativas (Arena) ──
  const activeCourtsCount = isArena ? courts.filter((c) => c.isActive).length : 0;

  // ── Presença ──
  const attendanceRate =
    attendance.length > 0
      ? Math.round((attendance.filter((a) => a.present).length / attendance.length) * 100)
      : 0;

  // ── Financeiro ──
  let expectedRevenue = 0;
  let receivedRevenue = 0;

  // 1. Mensalidades / Pacotes (Compartilhado)
  payments.forEach((p) => {
    if (p.monthRef === currentMonthStr) {
      expectedRevenue += p.amount;
      receivedRevenue += p.paidAmount || 0;
    }
  });

  // 2. Vendas de Produtos / Comandas (Compartilhado)
  sales.forEach((s) => {
    if (s.soldAt.startsWith(currentMonthStr)) {
      expectedRevenue += s.total;
      receivedRevenue += s.total; // Vendas são sempre recebidas no ato
    }
  });

  // 3. Reservas de Quadras (Apenas Arena)
  if (isArena) {
    reservations.forEach((r) => {
      if (r.date.startsWith(currentMonthStr) && r.status !== 'cancelled') {
        expectedRevenue += r.finalPrice;
        receivedRevenue += getReservationPaidAmount(r);
      }
    });
  }

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
  const modalityStats = useMemo(() => {
    return modalities
      .map((mod) => ({
        ...mod,
        studentCount: students.filter((s) => s.active && s.modalityId === mod.id).length,
        reservationCount: reservations.filter((r) => r.courtId === mod.id && r.date.startsWith(currentMonthStr) && r.status !== 'cancelled').length,
      }))
      .sort((a, b) => isArena ? b.reservationCount - a.reservationCount : b.studentCount - a.studentCount);
  }, [modalities, students, reservations, isArena, currentMonthStr]);

  // ── Arena Specific Stats ──
  const occupancyRate = isArena ? (() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    return calculateArenaOccupancy({ courts, reservations, year, month }).rate;
  })() : 0;

  // ── Métricas de Desempenho Individual (para funcionários) ──
  // Vendas geradas HOJE pelo usuário logado (Arena - Recepcionista)
  const myTodaySales = useMemo(() => {
    if (!isArena || !isReceptionist) return [];
    return sales.filter((s) => s.soldAt.startsWith(todayDateStr));
  }, [sales, todayDateStr, isArena, isReceptionist]);

  const myTodaySalesTotal = myTodaySales.reduce((sum, s) => sum + s.total, 0);

  // Comandas abertas hoje pelo usuário logado (Arena - Recepcionista)
  const myTodayOpenComandas = useMemo(() => {
    if (!isArena || !isReceptionist) return [];
    return comandas.filter(
      (c) => c.status === 'open' && c.createdAt.startsWith(todayDateStr)
    );
  }, [comandas, todayDateStr, isArena, isReceptionist]);

  // Treinos ministrados hoje (Instructor)
  const myTodayTrainings = useMemo(() => {
    if (!isInstructor) return [];
    return trainings.filter((t) => t.date === todayDateStr);
  }, [trainings, todayDateStr, isInstructor]);

  // Presenças registradas hoje pelo instructor
  const myTodayAttendance = useMemo(() => {
    if (!isInstructor) return [];
    return attendance.filter((a) => a.date === todayDateStr);
  }, [attendance, todayDateStr, isInstructor]);

  const pv = (val: number | string) => (privacyMode ? '••••' : val);

  return (
    <AppPage contentClassName="space-y-6 md:space-y-8">
        {/* ── Hero Banner ── */}
        <section className="animate-fade-up">
          <div className="bg-gradient-hero rounded-2xl p-5 md:p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              {/* Lado esquerdo — identidade */}
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                  {greeting}
                </p>
                <div className="flex items-center gap-3 mb-3">
                  {profile?.logo_url ? (
                    <img
                      src={profile.logo_url}
                      alt={profile.ct_name || ''}
                      className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-xl bg-white/10 p-1 shrink-0"
                    />
                  ) : (
                    <div className="bg-white/10 p-2 rounded-xl shrink-0">
                      <Logo size="sm" variant="white" />
                    </div>
                  )}
                  <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold truncate">
                    {profile?.ct_name || 'Esportiz'}
                  </h1>
                </div>

                {/* Badges de contexto */}
                <div className="flex flex-wrap gap-2">
                  {/* Badge da modalidade */}
                  <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                    {isArena ? '🏟️' : '🏐'}
                    {isArena ? 'Arena / CT Quadra' : 'Escola Esportiva'}
                  </span>

                  {/* Badge de cargo */}
                  {organizationRole && (
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border',
                      organizationRole === 'owner'       && 'bg-amber-400/20 border-amber-300/40 text-amber-100',
                      organizationRole === 'manager'     && 'bg-violet-400/20 border-violet-300/40 text-violet-100',
                      organizationRole === 'receptionist'&& 'bg-rose-400/20 border-rose-300/40 text-rose-100',
                      organizationRole === 'instructor'  && 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100',
                      organizationRole === 'finance'     && 'bg-blue-400/20 border-blue-300/40 text-blue-100',
                    )}>
                      {organizationRole === 'owner'        && '👑 CEO / Dono'}
                      {organizationRole === 'manager'      && '🛡️ Gerente'}
                      {organizationRole === 'receptionist' && '📞 Recepção'}
                      {organizationRole === 'instructor'   && '📚 Professor'}
                      {organizationRole === 'finance'      && '💼 Financeiro'}
                    </span>
                  )}

                  {/* Indicador de treinos/reservas de hoje */}
                  {dashboardAccess.showOperationalContext && (
                    <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {todayLoading
                        ? '...'
                        : isArena
                          ? todayReservationsCount > 0
                            ? `${todayReservationsCount} reserva(s) hoje`
                            : 'Nenhuma reserva hoje'
                          : todayTrainings > 0
                            ? `${todayTrainings} ${labels.trainingLabelSingular.toLowerCase()}(s) hoje`
                            : `Nenhum(a) ${labels.trainingLabelSingular.toLowerCase()} hoje`}
                    </span>
                  )}
                </div>
              </div>

              {/* Lado direito — resumo financeiro (só para quem pode ver) */}
              {canViewFinancials && !loadingFinancials && (
                <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-right shrink-0 min-w-[160px]">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">
                    Recebido no Mês
                  </p>
                  <p className="text-white font-extrabold text-xl md:text-2xl font-display">
                    {privacyMode ? '••••' : formatCurrency(receivedRevenue)}
                  </p>
                  {!privacyMode && expectedRevenue > 0 && (
                    <p className="text-white/60 text-[10px] mt-0.5">
                      de {formatCurrency(expectedRevenue)} esperado
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Overdue Alert — apenas para quem pode ver pagamentos ── */}
        {canViewPayments && (
          <OverdueAlert privacyMode={privacyMode} />
        )}

        {/* ── Low Stock Alert (Only if Arena & has low/out stock items) ── */}
        {lowStockProducts.length > 0 && (
          <section className="animate-fade-up">
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-amber-500/10 text-amber-600 p-3 rounded-xl shadow-sm shrink-0">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-amber-800 flex items-center gap-1.5">
                    Alerta de Reposição de Estoque ⚠️
                  </h3>
                  <p className="text-sm text-amber-700/90 mt-0.5 leading-relaxed font-medium">
                    {lowStockProducts.length === 1 ? (
                      <span>O produto <strong>{lowStockProducts[0].name}</strong> está com estoque baixo ou zerado ({lowStockProducts[0].stockQuantity} un restante(s)).</span>
                    ) : (
                      <span>Você tem <strong>{lowStockProducts.length} produtos</strong> com estoque baixo ou zerado {isArena ? 'na cantina/bar' : 'no almoxarifado/estoque'}.</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/produtos')}
                className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 h-9 shadow-sm shrink-0 rounded-xl"
              >
                Gerenciar Estoque
              </Button>
            </div>
          </section>
        )}

        {/* ── Aniversários de hoje (só sport_school) ── */}
        {dashboardAccess.showOperationalSections && isSportSchool && birthdaysToday.length > 0 && (
          <section className="animate-fade-up">
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-primary/10 text-primary p-3 rounded-xl shadow-sm">
                  <Cake className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">
                    Parabéns aos aniversariantes! 🎂
                  </h3>
                  <p className="text-muted-foreground text-sm font-medium mt-0.5">
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
              aria-label={privacyMode ? 'Mostrar dados sensíveis' : 'Ocultar dados sensíveis'}
              aria-pressed={privacyMode}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {/* ── Linha 1: KPIs operacionais por tipo ── */}
          {dashboardAccess.showOperationalSections && isSportSchool && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {canViewStudents && (
                <StatCard
                  title={`${labels.studentLabel} Ativos`}
                  value={loadingStudents ? '...' : pv(activeStudents)}
                  icon={Users}
                  description={privacyMode ? '' : `de ${totalStudents} total`}
                />
              )}
              <StatCard
                title={`${labels.trainingLabel} de Hoje`}
                value={loadingTrainings ? '...' : pv(todayTrainings)}
                icon={Calendar}
                variant="primary"
              />
              <StatCard
                title={`Taxa de ${labels.attendanceLabel}`}
                value={loadingAttendance ? '...' : pv(`${attendanceRate}%`)}
                icon={CheckCircle}
              />
              <StatCard
                title="Aniversários (Mês)"
                value={loadingStudents ? '...' : pv(birthdaysMonth.length)}
                icon={Cake}
                description={privacyMode ? '' : `${labels.studentLabel} este mês`}
              />
            </div>
          )}

          {dashboardAccess.showOperationalSections && isArena && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                title="Quadras Ativas"
                value={loadingCourts ? '...' : pv(activeCourtsCount)}
                icon={Landmark}
              />
              <StatCard
                title="Reservas de Hoje"
                value={loadingReservations ? '...' : pv(todayReservationsCount)}
                icon={Calendar}
                variant="primary"
              />
              <StatCard
                title="Taxa de Ocupação"
                value={loadingReservations || loadingCourts ? '...' : pv(`${occupancyRate}%`)}
                icon={TrendingUp}
                description={privacyMode ? '' : 'Média do mês'}
              />
              {canViewFinancials ? (
                <StatCard
                  title="Vendas de Hoje"
                  value={loadingSales ? '...' : pv(formatCurrency(todaySalesTotal))}
                  icon={DollarSign}
                  description={privacyMode ? '' : 'Consumo / Cantina'}
                />
              ) : (
                <StatCard
                  title="Produtos Ativos"
                  value={loadingProducts ? '...' : pv(activeProducts.length)}
                  icon={ShoppingCart}
                  description="Itens cadastrados"
                />
              )}
            </div>
          )}

          {/* ── Linha 2: Financeiro ── */}
          {canViewFinancials && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <StatCard
                title="Faturamento Total"
                value={loadingFinancials ? '...' : pv(formatCurrency(expectedRevenue))}
                icon={DollarSign}
                description={privacyMode ? '' : isSportSchool ? 'Mensalidades + Vendas no mês' : 'Mensalidades + Reservas + Vendas no mês'}
              />
              <StatCard
                title="Recebido no Mês"
                value={loadingFinancials ? '...' : pv(formatCurrency(receivedRevenue))}
                icon={CheckCircle}
                variant="primary"
                progress={privacyMode ? undefined : { value: revenueProgress, label: 'Meta Mensal' }}
              />
              <StatCard
                title="Lucro Líquido"
                value={loadingFinancials ? '...' : pv(formatCurrency(netProfit))}
                icon={netProfit >= 0 ? TrendingUp : TrendingDown}
                variant="success"
                description={privacyMode ? '' : `Despesas pagas: ${formatCurrency(totalExpensesPaid)}`}
              />
            </div>
          )}
        </section>

        {/* ── Quadras / Modalidades — apenas para quem tem acesso ── */}
        {dashboardAccess.showOperationalSections && canViewModalities && (isSportSchool || isArena) && modalities.length > 0 && (
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
                  role="button"
                  tabIndex={0}
                  className="card-interactive p-3 flex items-center gap-3 border-primary/5 hover:border-primary/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  onClick={() => navigate('/modalidades')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/modalidades');
                    }
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: mod.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{mod.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {isArena ? `${mod.reservationCount} reserva(s) no mês` : `${mod.studentCount} ${labels.studentLabel.toLowerCase()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Meu Desempenho Hoje (apenas para funcionários) ── */}
        {isEmployee && (
          <section className="animate-fade-up" style={{ animationDelay: '0.07s' }}>
            <div className="flex items-center gap-2 mb-4 px-1">
              <Star className="h-4 w-4 text-primary" />
              <h2 className="font-display font-bold text-lg">Meu Desempenho Hoje</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {isReceptionist && isArena && (
                <>
                  <StatCard
                    title="Minhas Vendas Hoje"
                    value={loadingSales ? '...' : pv(formatCurrency(myTodaySalesTotal))}
                    icon={DollarSign}
                    description={privacyMode ? '' : `${myTodaySales.length} venda(s) registrada(s)`}
                    variant="primary"
                  />
                  <StatCard
                    title="Comandas Abertas Hoje"
                    value={loadingComandas ? '...' : pv(myTodayOpenComandas.length)}
                    icon={Receipt}
                    description={privacyMode ? '' : 'Comandas em aberto'}
                  />
                </>
              )}
              {isReceptionist && !isArena && (
                <>
                  <StatCard
                    title="Pagamentos Recebidos"
                    value={loadingPayments ? '...' : pv(payments.filter(p => p.paid && p.paidAt?.startsWith(todayDateStr)).length)}
                    icon={CheckCircle}
                    description="Pagamentos confirmados hoje"
                    variant="success"
                  />
                  <StatCard
                    title="Presenças Registradas"
                    value={loadingAttendance ? '...' : pv(attendance.filter(a => a.date === todayDateStr).length)}
                    icon={UserCheck}
                    description={`${labels.attendanceLabel} de hoje`}
                  />
                </>
              )}
              {isInstructor && (
                <>
                  <StatCard
                    title={`${labels.trainingLabel} Hoje`}
                    value={loadingTrainings ? '...' : pv(myTodayTrainings.length)}
                    icon={Calendar}
                    description={`${labels.trainingLabel} sob sua responsabilidade`}
                    variant="primary"
                  />
                  <StatCard
                    title="Presenças Hoje"
                    value={loadingAttendance ? '...' : pv(myTodayAttendance.filter(a => a.present).length)}
                    icon={UserCheck}
                    description={`de ${myTodayAttendance.length} esperado(s)`}
                    variant="success"
                  />
                </>
              )}
              {/* Coluna de alunos ativos — visivel para funcionarios com acesso a estudantes */}
              {isSportSchool && canViewStudents && (
                <StatCard
                  title={`${labels.studentLabel} Ativos`}
                  value={loadingStudents ? '...' : pv(activeStudents)}
                  icon={Users}
                  description={privacyMode ? '' : `de ${totalStudents} total`}
                />
              )}
              {isArena && (
                <StatCard
                  title="Reservas de Hoje"
                  value={loadingReservations ? '...' : pv(todayReservationsCount)}
                  icon={Calendar}
                  description="Clientes agendados"
                />
              )}
            </div>
          </section>
        )}


        {/* ── Charts ── */}
        {canViewFinancials && (
          <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <DashboardCharts
              payments={payments}
              attendance={attendance}
              privacyMode={privacyMode}
              isArena={isArena}
              reservations={reservations}
              sales={sales}
              financialOnly={dashboardAccess.isFinancialOnly}
            />
          </section>
        )}

        {/* ── Agenda + Quick Actions ── */}
        {dashboardAccess.showOperationalSections ? (
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
        ) : (
          <div
            className="max-w-xl animate-fade-up border border-border/50 rounded-2xl bg-muted/5 p-0.5"
            style={{ animationDelay: '0.2s' }}
          >
            <QuickActions />
          </div>
        )}
    </AppPage>
  );
}
// HMR trigger: force clean cache reload
