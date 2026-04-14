import { Users, Calendar, CheckCircle, DollarSign, Eye, EyeOff, Cake } from 'lucide-react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { TodaySchedule } from '@/components/TodaySchedule';
import { QuickActions } from '@/components/QuickActions';
import { OverdueAlert } from '@/components/OverdueAlert';
import { Button } from '@/components/ui/button';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';
import { formatCurrency } from '@/lib/formatCurrency';
import { DashboardCharts } from '@/components/DashboardCharts';

export default function Index() {
  const { students, loadingStudents } = useStudents();
  const { plans, loadingPlans } = usePlans();
  const { trainings, loadingTrainings } = useTrainings();
  const { attendance, loadingAttendance } = useAttendance();
  const { payments, loadingPayments } = usePayments();
  const loading = loadingStudents || loadingPlans || loadingTrainings || loadingAttendance || loadingPayments;
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const activeStudents = activeMonthly.length;
  
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTrainings = trainings.filter(t => t.date === todayDateStr).length;

  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter((a) => a.present).length / attendance.length) * 100)
    : 0;
    
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  let expectedRevenue = 0;
  let receivedRevenue = 0;
  payments.forEach(p => {
    if (p.monthRef === currentMonthStr) {
      expectedRevenue += p.amount;
      if (p.paid) receivedRevenue += p.amount;
    }
  });
  const revenueProgress = expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;
  
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
                {greeting}, seja bem-vindo(a) de volta!
              </p>
              <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold mb-2">
                Resenha's Escola de Futevôlei
              </h1>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 text-sm font-medium text-white/90">
                <span className="bg-white/20 px-3 py-1.5 rounded-full inline-flex items-center gap-2 w-fit">
                  <Calendar className="h-4 w-4" /> 
                  {loadingTrainings ? '...' : todayTrainings > 0 ? `${todayTrainings} treino(s) agendado(s) para hoje` : 'Nenhum treino hoje'}
                </span>
              </div>
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
              onClick={togglePrivacyMode}
              title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard title="Alunos Ativos" value={loading ? '...' : privacyMode ? '••••' : activeStudents} icon={Users} description={privacyMode ? '' : `${activeStudents} com plano mensal`} />
            <StatCard title="Treinos de Hoje" value={loading ? '...' : privacyMode ? '••••' : todayTrainings} icon={Calendar} variant="primary" />
            <StatCard title="Taxa de Presença" value={loading ? '...' : privacyMode ? '••••' : `${attendanceRate}%`} icon={CheckCircle} />
            <StatCard 
               title="Recebido no Mês" 
               value={loading ? '...' : privacyMode ? '••••' : formatCurrency(receivedRevenue)} 
               icon={DollarSign} 
               progress={privacyMode ? undefined : { value: revenueProgress, label: 'Meta Mensal' }}
            />
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
            <TodaySchedule />
          </div>
          <div className="lg:col-span-1 border border-border/50 rounded-2xl bg-muted/5 flex flex-col pt-1 p-0.5">
            <QuickActions />
          </div>
        </div>
      </main>
    </div>
  );
}
