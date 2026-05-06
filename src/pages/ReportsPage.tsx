import { useState, useMemo } from 'react';
import { Eye, EyeOff, Users, Calendar, CheckCircle, DollarSign, TrendingUp, Activity, UserMinus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';
import { useCourts } from '@/hooks/queries/useCourts';
import { useReservations } from '@/hooks/queries/useReservations';
import { useSales } from '@/hooks/queries/useSales';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { formatCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = {
  primary: 'hsl(24, 95%, 53%)',
  secondary: 'hsl(222, 47%, 20%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  emerald: 'hsl(152, 68%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  violet: 'hsl(263, 70%, 55%)',
  slate: 'hsl(215, 16%, 47%)',
};

type FilterPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

const filterLabels: Record<FilterPeriod, string> = {
  day: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
  all: 'Todos',
};

function getDateRange(period: FilterPeriod): { start: string; end: string } | null {
  if (period === 'all') return null;
  const now = new Date();
  
  let start: Date;
  let endD = new Date(now);

  switch (period) {
    case 'day':
      start = new Date(now);
      endD = new Date(now);
      break;
    case 'week': {
      start = new Date(now);
      const dow = start.getDay();
      start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
      endD = new Date(start);
      endD.setDate(start.getDate() + 6);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      endD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      endD = new Date(now.getFullYear(), 11, 31);
      break;
  }

  return { 
    start: start!.toISOString().split('T')[0], 
    end: endD.toISOString().split('T')[0] 
  };
}

/**
 * Returns monthRef strings for filtering payments by monthRef
 * (consistent with Dashboard's monthRef-based filtering).
 */
function getMonthRefsForPeriod(period: FilterPeriod): string[] | null {
  if (period === 'all') return null;
  const now = new Date();

  switch (period) {
    case 'day':
    case 'week':
    case 'month':
      return [now.toISOString().slice(0, 7)];
    case 'year': {
      const year = now.getFullYear();
      return Array.from({ length: 12 }, (_, i) => 
        `${year}-${String(i + 1).padStart(2, '0')}`
      );
    }
    default:
      return null;
  }
}

export default function ReportsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const { trainings } = useTrainings();
  const { attendance } = useAttendance();
  const { payments } = usePayments();
  const { courts } = useCourts();
  const { reservations } = useReservations();
  const { sales } = useSales();
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();
  const { labels, isArena, isOther } = useBusinessContext();

  const range = useMemo(() => getDateRange(period), [period]);
  const monthRefs = useMemo(() => getMonthRefsForPeriod(period), [period]);

  const filteredAttendance = useMemo(() => {
    if (!range) return attendance;
    return attendance.filter((a) => a.date >= range.start && a.date <= range.end);
  }, [attendance, range]);

  const filteredTrainings = useMemo(() => {
    if (!range) return trainings;
    return trainings.filter((t) => t.date >= range.start && t.date <= range.end);
  }, [trainings, range]);

  const filteredPayments = useMemo(() => {
    if (!range) return payments;
    return payments.filter((p) => {
      // Filtragem estrita por competência (data de vencimento) para alinhar 100% com a página de Pagamentos
      return p.dueDate >= range.start && p.dueDate <= range.end;
    });
  }, [payments, range]);

  const filteredSales = useMemo(() => {
    if (!range) return sales;
    return sales.filter((s) => {
      const soldDate = s.soldAt.slice(0, 10);
      return soldDate >= range.start && soldDate <= range.end;
    });
  }, [sales, range]);

  // KPIs Calculations
  const presentCount = filteredAttendance.filter((a) => a.present).length;
  const absentCount = filteredAttendance.filter((a) => !a.present).length;
  const attendanceRate = filteredAttendance.length > 0
    ? Math.round((presentCount / filteredAttendance.length) * 100)
    : 0;

  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const totalActive = activeMonthly.length;

  const filteredReservations = useMemo(() => {
    if (!range) return reservations;
    return reservations.filter(r => r.date >= range.start && r.date <= range.end && r.status !== 'cancelled');
  }, [reservations, range]);

  const reservationsByCourtData = useMemo(() => {
    if (!isArena) return [];
    return courts.filter(c => c.isActive).map(court => {
      const courtRes = filteredReservations.filter(r => r.courtId === court.id);
      return {
        name: court.name,
        hours: courtRes.reduce((acc, r) => acc + (r.durationMinutes / 60), 0),
        revenue: courtRes.reduce((acc, r) => acc + r.finalPrice, 0)
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [courts, filteredReservations, isArena]);

  const topReservantesData = useMemo(() => {
    if (!isArena) return [];
    const map: Record<string, { count: number, revenue: number, name: string }> = {};
    filteredReservations.forEach(r => {
       r.reservanteIds.forEach(id => {
         const s = students.find(st => st.id === id);
         if (s) {
           if (!map[s.id]) map[s.id] = { count: 0, revenue: 0, name: s.name };
           map[s.id].count += 1;
           map[s.id].revenue += r.finalPrice;
         }
       });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredReservations, students, isArena]);

  let expectedRevenue = 0;
  let receivedRevenue = 0;
  let overdueRevenue = 0;
  
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Mensalidades / Planos (Comum a todos, se houver)
  filteredPayments.forEach(p => {
    expectedRevenue += p.amount;
    if (p.paid) {
      receivedRevenue += p.amount;
    } else if (p.dueDate < todayDateStr) {
      overdueRevenue += p.amount;
    }
  });

  // 2. Vendas de Produtos (Sempre recebidas no ato da venda)
  filteredSales.forEach(s => {
    expectedRevenue += s.total;
    receivedRevenue += s.total;
  });

  // 3. Reservas de Quadras (Exclusivo da Arena)
  if (isArena) {
    filteredReservations.forEach(r => {
      expectedRevenue += r.finalPrice;
      if (r.paymentStatus === 'paid') {
        receivedRevenue += r.finalPrice;
      } else if (r.date < todayDateStr) {
        overdueRevenue += r.finalPrice;
      }
    });
  }

  const pendingRevenue = expectedRevenue - receivedRevenue - overdueRevenue;
  const revenueProgress = expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;

  // Chart Data - Dynamic Evolution for Attendance
  const evolutionAttendanceData = useMemo(() => {
    if (period === 'year' || period === 'all') {
      const yearToUse = period === 'year' ? new Date().getFullYear() : new Date().getFullYear();
      const months = Array.from({ length: 12 }, (_, i) => ({ year: yearToUse, month: i + 1 }));
      return months.map(({ year, month }) => {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const attInMonth = attendance.filter(a => a.date.startsWith(monthStr));
        const p = attInMonth.filter(a => a.present).length;
        const f = attInMonth.filter(a => !a.present).length;
        const label = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short' });
        return { name: label.charAt(0).toUpperCase() + label.slice(1), presentes: p, faltas: f };
      });
    } else {
      if (!range) return [];
      const days = [];
      const start = new Date(range.start);
      const end = new Date(range.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
      return days.map(d => {
        const dateStr = d.toISOString().split('T')[0];
        const attInDay = attendance.filter(a => a.date === dateStr);
        const p = attInDay.filter(a => a.present).length;
        const f = attInDay.filter(a => !a.present).length;
        
        // Use split to avoid timezone shift on label
        const [year, month, day] = dateStr.split('-');
        const name = `${day}/${month}`;
        
        return { name, presentes: p, faltas: f };
      });
    }
  }, [attendance, period, range]);

  const financialData = [{
    name: filterLabels[period],
    Total: expectedRevenue,
    Recebido: receivedRevenue,
    Pendente: pendingRevenue > 0 ? pendingRevenue : 0,
    Atrasado: overdueRevenue
  }];

  const levelData = [
    { name: 'Iniciante', value: activeMonthly.filter((s) => s.level === 'iniciante').length, color: COLORS.emerald },
    { name: 'Intermediário', value: activeMonthly.filter((s) => s.level === 'intermediário').length, color: COLORS.amber },
    { name: 'Avançado', value: activeMonthly.filter((s) => s.level === 'avançado').length, color: COLORS.violet },
  ];

  const studentKey = labels.studentLabel.toLowerCase();
  const planDistributionData = plans.filter(p => activeMonthly.some(s => s.planId === p.id)).map(plan => ({
    name: plan.name,
    [studentKey]: activeMonthly.filter((s) => s.planId === plan.id).length,
  })).sort((a: any, b: any) => b[studentKey] - a[studentKey]);

  // Historical Financial Data - Dynamic Evolution based on period
  const historicalFinancialData = useMemo(() => {
    if (period === 'year' || period === 'all') {
      const yearToUse = period === 'year' ? new Date().getFullYear() : new Date().getFullYear();
      const months = Array.from({ length: 12 }, (_, i) => ({ year: yearToUse, month: i + 1 }));
      return months.map(({ year, month }) => {
        const monthRef = `${year}-${String(month).padStart(2, '0')}`;
        
        // 1. Pagamentos
        const monthPayments = payments.filter(p => p.monthRef === monthRef);
        let expected = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
        let received = monthPayments.filter(p => p.paid).reduce((acc, curr) => acc + curr.amount, 0);
        
        // 2. Vendas de Produtos
        const monthSales = sales.filter(s => s.soldAt.startsWith(monthRef));
        const salesTotal = monthSales.reduce((acc, curr) => acc + curr.total, 0);
        expected += salesTotal;
        received += salesTotal;

        // 3. Reservas (Arena)
        if (isArena) {
          const monthReservations = reservations.filter(r => r.date.startsWith(monthRef) && r.status !== 'cancelled');
          expected += monthReservations.reduce((acc, r) => acc + r.finalPrice, 0);
          received += monthReservations.filter(r => r.paymentStatus === 'paid').reduce((acc, r) => acc + r.finalPrice, 0);
        }

        const label = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short' });
        return { name: label.charAt(0).toUpperCase() + label.slice(1), Total: expected, Recebido: received };
      });
    } else {
      if (!range) return [];
      const days = [];
      const start = new Date(range.start);
      const end = new Date(range.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
      return days.map(d => {
        const dateStr = d.toISOString().split('T')[0];
        
        // 1. Pagamentos
        let expected = payments
          .filter(p => p.dueDate === dateStr)
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        let received = payments
          .filter(p => p.dueDate === dateStr && p.paid)
          .reduce((acc, curr) => acc + curr.amount, 0);

        // 2. Vendas de Produtos
        const daySales = sales.filter(s => s.soldAt.startsWith(dateStr));
        const salesTotal = daySales.reduce((acc, curr) => acc + curr.total, 0);
        expected += salesTotal;
        received += salesTotal;

        // 3. Reservas (Arena)
        if (isArena) {
          const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
          expected += dayReservations.reduce((acc, r) => acc + r.finalPrice, 0);
          received += dayReservations.filter(r => r.paymentStatus === 'paid').reduce((acc, r) => acc + r.finalPrice, 0);
        }
        
        // Use split para evitar problemas de fuso horário no label
        const [year, month, day] = dateStr.split('-');
        const name = `${day}/${month}`;
        
        return { name, Total: expected, Recebido: received };
      });
    }
  }, [payments, sales, reservations, isArena, period, range]);

  // Retention Data (Funnel)
  const retentionData = useMemo(() => {
    const ativos = students.filter(s => s.active && !s.isTrial).length;
    const experimentais = students.filter(s => s.active && s.isTrial).length;
    const inativos = students.filter(s => !s.active).length;
    return [
      { name: `${labels.studentLabel} Ativos`, value: ativos, color: COLORS.emerald },
      { name: `${labels.trainingLabel} Experimentais`, value: experimentais, color: COLORS.warning },
      { name: 'Inativos (Churn)', value: inativos, color: COLORS.destructive },
    ];
  }, [students]);

  const churnRate = useMemo(() => {
    const total = students.length;
    const inativos = students.filter(s => !s.active).length;
    if (total === 0) return 0;
    return Math.round((inativos / total) * 100);
  }, [students]);

  const customTooltipStyle = {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    color: 'hsl(var(--foreground))',
    fontSize: '13px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />
      <main className="container py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight text-foreground">Relatórios Analíticos</h1>
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">Métricas, faturamento e engajamento da sua {labels.ctLabelShort.toLowerCase()}.</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-muted/30 p-1.5 rounded-xl border border-border/50">
            <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 bg-background shadow-sm border border-border/50 hover:bg-muted" onClick={togglePrivacyMode} title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}>
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-primary" />}
            </Button>
            {/* Period Filter */}
            <div className="flex rounded-lg overflow-hidden border border-border/50 bg-background shadow-sm">
              {(Object.keys(filterLabels) as FilterPeriod[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={cn(
                    'px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors',
                    period === key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {filterLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs Premium */}
        <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5 animate-fade-in">
          <StatCard 
            title={`${labels.studentLabel} Base`} 
            value={privacyMode ? '••••' : totalActive} 
            icon={Users} 
            description={privacyMode ? '' : `${labels.planLabel} mensais ativos`} 
          />
          <StatCard 
            title={`${labels.trainingLabel} (${filterLabels[period]})`} 
            value={privacyMode ? '••••' : filteredTrainings.length} 
            icon={Calendar} 
            variant="default" 
            description={filteredTrainings.length === 1 ? `${labels.trainingLabelSingular} computado` : `${labels.trainingLabel} computados`}
          />
          <StatCard 
            title="Engajamento" 
            value={privacyMode ? '••••' : `${attendanceRate}%`} 
            icon={CheckCircle} 
            description={privacyMode ? '' : `Média de ${labels.attendanceLabel.toLowerCase()}`}
            progress={privacyMode ? undefined : { value: attendanceRate, label: `Taxa de ${labels.attendanceLabel}` }}
          />
          <StatCard 
            title="Faturamento Total" 
            value={privacyMode ? '••••' : formatCurrency(expectedRevenue)} 
            icon={DollarSign} 
            description={privacyMode ? '' : 'Total bruto faturado'}
          />
          <StatCard 
            title="Caixa (Recebido)" 
            value={privacyMode ? '••••' : formatCurrency(receivedRevenue)} 
            icon={CheckCircle} 
            variant="primary"
            progress={privacyMode ? undefined : { value: revenueProgress, label: "Meta vs Esperado" }}
          />
        </section>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
          
          {/* Gráfico Financeiro Real */}
          <div className="card-interactive p-4 md:p-6 border-primary/10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Balanço Financeiro
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Realidade dos pagamentos no período selecionado</p>
              </div>
            </div>
            <div className="h-[280px] w-full">
              {!privacyMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData} barSize={60} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} formatter={(value: number) => [formatCurrency(value), '']} />
                    <Bar dataKey="Total" name="Faturamento Total" fill="hsl(var(--muted-foreground)/0.3)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recebido" stackId="a" name="Recebido" fill={COLORS.success} radius={pendingRevenue === 0 && overdueRevenue === 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />
                    <Bar dataKey="Pendente" stackId="a" name="Pendente (À vencer)" fill={COLORS.slate} radius={overdueRevenue === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                    <Bar dataKey="Atrasado" stackId="a" name="Atrasado" fill={COLORS.destructive} radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                  <EyeOff className="h-6 w-6 text-muted-foreground/50 mb-2"/>
                  <p className="text-muted-foreground font-medium text-sm">Dados Financeiros Ocultos</p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Presença X Faltas */}
          <div className="card-interactive p-4 md:p-6">
            <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">{labels.attendanceLabel} Geral</h3>
            <p className="text-sm text-muted-foreground mb-6">Controle de engajamento nos registros realizados</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionAttendanceData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Bar dataKey="presentes" name="Presentes" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="faltas" name="Ausentes (Faltas)" fill={COLORS.slate} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demografia: Alunos por Nível */}
          {!isArena && (
            <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
              <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">{isOther ? 'Perfil dos Alunos por Nível' : 'Perfil Técnico (Base Ativa)'}</h3>
              <p className="text-sm text-muted-foreground mb-6">{isOther ? 'Distribuição dos alunos por nível de conhecimento' : 'Distribuição da base por nível'}</p>
              <div className="h-[250px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={levelData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value"
                      label={({ name, value }) => privacyMode ? '••••' : `${value}`} labelLine={{ strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' }}>
                      {levelData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [privacyMode ? '••••' : value, labels.studentLabel]} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Demografia: Planos */}
          {!isArena && (
            <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
              <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Aderência de {labels.planLabel}</h3>
              <p className="text-sm text-muted-foreground mb-6">Preferência da base de {labels.studentLabel.toLowerCase()}</p>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planDistributionData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={160}
                    />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : `${value} ${labels.studentLabelSingular.toLowerCase()}(s)`, 'Aderência']} />
                    <Bar dataKey={studentKey} fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={28}>
                      {
                        planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.primary : 'hsl(var(--primary)/0.6)'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {isArena && (
            <>
              {/* Ocupação por Quadra (Horas) */}
              <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Ocupação por Quadra</h3>
                <p className="text-sm text-muted-foreground mb-6">Horas reservadas no período</p>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reservationsByCourtData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [`${value}h`, 'Horas']} />
                      <Bar dataKey="hours" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Faturamento por Quadra (Pie) */}
              <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Faturamento por Quadra</h3>
                <p className="text-sm text-muted-foreground mb-6">Distribuição da receita gerada</p>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reservationsByCourtData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="revenue"
                        label={({ name, value }) => privacyMode ? '••••' : formatCurrency(value)} labelLine={{ strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' }}>
                        {reservationsByCourtData.map((entry, index) => (<Cell key={index} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [privacyMode ? '••••' : formatCurrency(value), 'Faturamento']} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Histórico Financeiro Mensal */}
          <div className="card-interactive p-4 md:p-6 lg:col-span-2 mt-4 border-primary/20 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Evolução de Faturamento
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Comparativo de receita prevista vs realizada ({filterLabels[period]})</p>
              </div>
            </div>
            <div className="h-[320px] w-full">
              {!privacyMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalFinancialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }} formatter={(value: number) => [formatCurrency(value), '']} />
                    <Line type="monotone" dataKey="Total" name="Previsto (Total)" stroke={COLORS.slate} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Recebido" name="Realizado (Caixa)" stroke={COLORS.emerald} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                  <EyeOff className="h-6 w-6 text-muted-foreground/50 mb-2"/>
                  <p className="text-muted-foreground font-medium text-sm">Dados Históricos Ocultos</p>
                </div>
              )}
            </div>
          </div>

          {/* Métricas de Retenção e Churn */}
          {!isArena && (
            <div className="card-interactive p-4 md:p-6 lg:col-span-2 border-destructive/10 mt-4">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-destructive" /> Retenção e Churn
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Visão geral do funil de retenção e perda de {labels.studentLabel.toLowerCase()} na base inteira</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-lg text-center shrink-0">
                  <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-0.5">Taxa de Churn</p>
                  <p className="text-2xl font-display font-bold text-destructive">{privacyMode ? '••%' : `${churnRate}%`}</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retentionData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={150} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : `${value} ${labels.studentLabelSingular.toLowerCase()}(s)`, 'Quantidade']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                      {
                        retentionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {isArena && (
            <>
              {/* Top Reservantes */}
              <div className="card-interactive p-4 md:p-6 lg:col-span-2 border-primary/10 mt-4">
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Top Reservantes</h3>
                <p className="text-sm text-muted-foreground mb-6">Clientes que geraram mais receita no período</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topReservantesData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={150} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : formatCurrency(value), 'Faturamento']} />
                      <Bar dataKey="revenue" fill={COLORS.emerald} radius={[0, 4, 4, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
