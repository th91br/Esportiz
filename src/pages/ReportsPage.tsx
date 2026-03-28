import { useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { cn } from '@/lib/utils';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = {
  primary: 'hsl(24, 95%, 53%)',
  secondary: 'hsl(222, 47%, 20%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  emerald: 'hsl(152, 68%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  violet: 'hsl(263, 70%, 55%)',
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
  const end = now.toISOString().split('T')[0];
  let start: Date;

  switch (period) {
    case 'day':
      start = new Date(now);
      break;
    case 'week': {
      start = new Date(now);
      const dow = start.getDay();
      start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { start: start!.toISOString().split('T')[0], end };
}

export default function ReportsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const { trainings } = useTrainings();
  const { attendance } = useAttendance();
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('privacyMode') === 'true');

  const range = useMemo(() => getDateRange(period), [period]);

  const filteredAttendance = useMemo(() => {
    if (!range) return attendance;
    return attendance.filter((a) => a.date >= range.start && a.date <= range.end);
  }, [attendance, range]);

  const filteredTrainings = useMemo(() => {
    if (!range) return trainings;
    return trainings.filter((t) => t.date >= range.start && t.date <= range.end);
  }, [trainings, range]);

  // Attendance stats
  const presentCount = filteredAttendance.filter((a) => a.present).length;
  const absentCount = filteredAttendance.filter((a) => !a.present).length;
  const attendanceData = [{ name: filterLabels[period], presentes: presentCount, faltas: absentCount }];

  // Active monthly students
  const activeMonthly = getActiveMonthlyStudents(students, plans);

  // Revenue
  const monthlyRevenue = plans.reduce((sum, plan) => {
    if (plan.billingType !== 'monthly') return sum;
    const count = activeMonthly.filter((s) => s.planId === plan.id).length;
    return sum + count * plan.price;
  }, 0);

  // Students by level (only active with monthly plan)
  const levelData = [
    { name: 'Iniciante', value: activeMonthly.filter((s) => s.level === 'iniciante').length, color: COLORS.emerald },
    { name: 'Intermediário', value: activeMonthly.filter((s) => s.level === 'intermediário').length, color: COLORS.amber },
    { name: 'Avançado', value: activeMonthly.filter((s) => s.level === 'avançado').length, color: COLORS.violet },
  ];

  // Revenue by plan (only monthly plans)
  const planData = plans.filter(p => p.billingType === 'monthly').map((plan) => ({
    name: plan.name,
    alunos: activeMonthly.filter((s) => s.planId === plan.id).length,
    receita: activeMonthly.filter((s) => s.planId === plan.id).length * plan.price,
  }));

  const totalActive = activeMonthly.length;
  const attendanceRate = filteredAttendance.length > 0
    ? Math.round((filteredAttendance.filter((a) => a.present).length / filteredAttendance.length) * 100)
    : 0;

  const customTooltipStyle = {
    backgroundColor: 'hsl(222, 47%, 20%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Acompanhe a evolução do seu negócio</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => { const next = !privacyMode; setPrivacyMode(next); localStorage.setItem('privacyMode', String(next)); }} title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}>
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          {/* Period Filter */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(Object.keys(filterLabels) as FilterPeriod[]).map((key) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Alunos Ativos', value: totalActive },
            { label: 'Treinos', value: filteredTrainings.length },
            { label: 'Taxa Presença', value: `${attendanceRate}%` },
            { label: 'Receita Mensal', value: privacyMode ? '••••' : `R$ ${monthlyRevenue.toLocaleString('pt-BR')}` },
          ].map((stat) => (
            <div key={stat.label} className="card-elevated p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
              <p className="font-display font-extrabold text-2xl mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-lg mb-4">Presença — {filterLabels[period]}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={attendanceData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="presentes" name="Presentes" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="faltas" name="Faltas" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-lg mb-4">Alunos por Nível</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={levelData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }}>
                  {levelData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {planData.length > 0 && !privacyMode && (
            <div className="card-elevated p-5 lg:col-span-2">
              <h3 className="font-display font-bold text-lg mb-4">Receita por Plano</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={planData} layout="vertical" barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip contentStyle={customTooltipStyle}
                    formatter={(value: number, name: string) => [name === 'receita' ? `R$ ${value.toLocaleString('pt-BR')}` : value, name === 'receita' ? 'Receita' : 'Alunos']} />
                  <Bar dataKey="receita" name="Receita" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
