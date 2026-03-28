import { useState } from 'react';
import { Users, Calendar, CheckCircle, DollarSign, Eye, EyeOff, Cake } from 'lucide-react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { WeeklyCalendar } from '@/components/WeeklyCalendar';
import { StudentCard } from '@/components/StudentCard';
import { OverdueAlert } from '@/components/OverdueAlert';
import { Button } from '@/components/ui/button';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';
import { DashboardCharts } from '@/components/DashboardCharts';

export default function Index() {
  const { students, loadingStudents } = useStudents();
  const { plans, loadingPlans } = usePlans();
  const { trainings, loadingTrainings } = useTrainings();
  const { attendance, loadingAttendance } = useAttendance();
  const { payments, loadingPayments } = usePayments();
  const loading = loadingStudents || loadingPlans || loadingTrainings || loadingAttendance || loadingPayments;
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('privacyMode') === 'true');

  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const activeStudents = activeMonthly.length;
  const weeklyTrainings = trainings.length;
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter((a) => a.present).length / attendance.length) * 100)
    : 0;
  const monthlyRevenue = plans.reduce((sum, plan) => {
    if (plan.billingType !== 'monthly') return sum;
    const count = activeMonthly.filter((s) => s.planId === plan.id).length;
    return sum + count * plan.price;
  }, 0);
  
  const birthdaysToday = students.filter(student => {
    if (!student.active || !student.birthDate) return false;
    const today = new Date();
    const [_, month, day] = student.birthDate.split('-').map(Number);
    return today.getMonth() + 1 === month && today.getDate() === day;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Welcome Section */}
        <section className="animate-fade-up">
          <div className="bg-gradient-hero rounded-2xl p-6 md:p-8 text-white">
            <div className="max-w-2xl">
              <p className="text-white/80 text-sm font-medium mb-2">
                Bem-vindo de volta!
              </p>
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold mb-2">
                Resenha's Escola de Futevôlei
              </h1>
              <p className="text-white/80 text-sm md:text-base italic">
                A sua evolução é nossa motivação.
              </p>
            </div>
          </div>
        </section>

        {/* Overdue Payments Alert */}
        <OverdueAlert />
        
        {/* Birthday Alert */}
        {birthdaysToday.length > 0 && (
          <section className="animate-fade-up">
            <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-lg shadow-primary/20">
                  <Cake className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">Parabéns aos aniversariantes! 🎂</h3>
                  <p className="text-muted-foreground text-sm">
                    {birthdaysToday.length === 1 
                      ? `${birthdaysToday[0].name} faz aniversário hoje!` 
                      : `${birthdaysToday.length} alunos fazem aniversário hoje!`}
                  </p>
                </div>
              </div>
              <Button asChild className="w-full md:w-auto btn-primary-gradient">
                <a href="/aniversariantes">Ver & Parabenizar</a>
              </Button>
            </div>
          </section>
        )}


        {/* Stats Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => {
                const next = !privacyMode;
                setPrivacyMode(next);
                localStorage.setItem('privacyMode', String(next));
              }}
              title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard title="Alunos Ativos" value={loading ? '...' : privacyMode ? '••••' : activeStudents} icon={Users} description={privacyMode ? '' : `${activeStudents} com plano mensal`} />
            <StatCard title="Treinos Semana" value={loading ? '...' : privacyMode ? '••••' : weeklyTrainings} icon={Calendar} variant="primary" />
            <StatCard title="Taxa de Presença" value={loading ? '...' : privacyMode ? '••••' : `${attendanceRate}%`} icon={CheckCircle} />
            <StatCard title="Receita Mensal" value={loading ? '...' : privacyMode ? '••••' : `R$ ${monthlyRevenue.toLocaleString('pt-BR')}`} icon={DollarSign} />
          </div>
        </section>

        {/* Dashboard Charts */}
        <section className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <DashboardCharts
            payments={payments}
            attendance={attendance}
            privacyMode={privacyMode}
          />
        </section>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="lg:col-span-2">
            <WeeklyCalendar />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title text-xl">Alunos Recentes</h2>
              <a href="/alunos" className="text-sm text-primary font-medium hover:underline">Ver todos →</a>
            </div>
            <div className="space-y-3">
              {students.filter((s) => s.active).slice(0, 3).map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
              {students.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno cadastrado ainda.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
