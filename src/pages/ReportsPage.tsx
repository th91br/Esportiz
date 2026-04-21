import { useState, useMemo } from 'react';
import { Eye, EyeOff, Users, Calendar, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { formatCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();

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

  // CORREÇÃO: Filtra pagamentos por monthRef (consistente com Dashboard)
  // ao invés de dueDate, garantindo que os mesmos pagamentos apareçam
  // no Dashboard "Recebido no Mês" e no Relatório "Caixa (Recebido)"
  const filteredPayments = useMemo(() => {
    if (!monthRefs) return payments;
    return payments.filter((p) => monthRefs.includes(p.monthRef));
  }, [payments, monthRefs]);

  // KPIs Calculations
  const presentCount = filteredAttendance.filter((a) => a.present).length;
  const absentCount = filteredAttendance.filter((a) => !a.present).length;
  const attendanceRate = filteredAttendance.length > 0
    ? Math.round((presentCount / filteredAttendance.length) * 100)
    : 0;

  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const totalActive = activeMonthly.length;

  let expectedRevenue = 0;
  let receivedRevenue = 0;
  let overdueRevenue = 0;
  
  const todayDateStr = new Date().toISOString().split('T')[0];

  filteredPayments.forEach(p => {
    expectedRevenue += p.amount;
    if (p.paid) {
      receivedRevenue += p.amount;
    } else if (p.dueDate < todayDateStr) {
      overdueRevenue += p.amount;
    }
  });

  const pendingRevenue = expectedRevenue - receivedRevenue - overdueRevenue;
  const revenueProgress = expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;

  // Chart Data
  const attendanceData = [{ name: filterLabels[period], presentes: presentCount, faltas: absentCount }];

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

  const planDistributionData = plans.filter(p => activeMonthly.some(s => s.planId === p.id)).map(plan => ({
    name: plan.name,
    alunos: activeMonthly.filter((s) => s.planId === plan.id).length,
  })).sort((a, b) => b.alunos - a.alunos);

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
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">Métricas, faturamento e engajamento da sua escola de futevôlei.</p>
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
            title="Alunos Base" 
            value={privacyMode ? '••••' : totalActive} 
            icon={Users} 
            description={privacyMode ? '' : `Planos mensais ativos`} 
          />
          <StatCard 
            title={`Aulas (${filterLabels[period]})`} 
            value={privacyMode ? '••••' : filteredTrainings.length} 
            icon={Calendar} 
            variant="default" 
            description={filteredTrainings.length === 1 ? 'Treino computado' : 'Treinos computados'}
          />
          <StatCard 
            title="Engajamento" 
            value={privacyMode ? '••••' : `${attendanceRate}%`} 
            icon={CheckCircle} 
            description={privacyMode ? '' : 'Média de presença'}
            progress={privacyMode ? undefined : { value: attendanceRate, label: "Assiduidade" }}
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
            <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Assiduidade Geral</h3>
            <p className="text-sm text-muted-foreground mb-6">Controle de engajamento dos alunos nas aulas registradas</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
            <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Perfil Técnico (Base Ativa)</h3>
            <p className="text-sm text-muted-foreground mb-6">Distribuição da base por nível para guiar treinos</p>
            <div className="h-[250px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={levelData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value"
                    label={({ name, value }) => privacyMode ? '••••' : `${value}`} labelLine={{ strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' }}>
                    {levelData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [privacyMode ? '••••' : value, 'Alunos']} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demografia: Planos */}
          <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
            <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Aderência de Planos</h3>
            <p className="text-sm text-muted-foreground mb-6">Preferência da base de alunos mensalistas</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planDistributionData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : `${value} aluno(s)`, 'Aderência']} />
                  <Bar dataKey="alunos" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={28}>
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

        </div>
      </main>
    </div>
  );
}
