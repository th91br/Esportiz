import { useState, useMemo, useEffect, useCallback } from 'react';
import { Bell, Clock, Users, MapPin, AlertTriangle, X, Check, Trash2, CheckCheck, Calendar, Cake, CreditCard, Undo2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useStudents } from '@/hooks/queries/useStudents';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { usePayments } from '@/hooks/queries/usePayments';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { getEndTime } from '@/data/mockData';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// ── localStorage dismiss (only for manual "X" dismiss, NOT for completed status) ──
type DismissedNotifications = {
  trainings: string[];       // manually dismissed training IDs (X button)
  overduePayments: boolean;  // whether overdue section is dismissed
  dismissDate: string;       // the date these dismissals apply to (resets daily)
};

const STORAGE_KEY = 'esportiz-dismissed-notifications';

function getDismissed(): DismissedNotifications {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().split('T')[0];
      // Reset dismissals if they're from a different day
      if (parsed.dismissDate !== today) {
        return { trainings: [], overduePayments: false, dismissDate: today };
      }
      return { ...parsed, dismissDate: today };
    }
  } catch {}
  return { trainings: [], overduePayments: false, dismissDate: new Date().toISOString().split('T')[0] };
}

function saveDismissed(d: DismissedNotifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { students } = useStudents();
  const { trainings, deleteTraining, markTrainingComplete, unmarkTrainingComplete } = useTrainings();
  const { payments } = usePayments();
  const { attendance } = useAttendance();

  const refreshData = async () => {
    await queryClient.invalidateQueries();
  };
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<DismissedNotifications>(getDismissed);
  const [tab, setTab] = useState<'all' | 'trainings' | 'payments' | 'birthdays'>('all');

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // ── Today's trainings ──
  const todayTrainings = useMemo(
    () => trainings.filter((t) => t.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [trainings, today]
  );

  // Trainings split by status
  const pendingTrainings = useMemo(
    () => todayTrainings.filter(t => !t.completed && !dismissed.trainings.includes(t.id)),
    [todayTrainings, dismissed]
  );

  const completedTrainings = useMemo(
    () => todayTrainings.filter(t => t.completed),
    [todayTrainings]
  );

  // ── Overdue payments ──
  const overduePayments = useMemo(
    () => payments.filter((p) => !p.paid && p.dueDate < today),
    [payments, today]
  );

  const overdueStudentIds = useMemo(
    () => new Set(overduePayments.map((p) => p.studentId)),
    [overduePayments]
  );

  // ── Payments due today or tomorrow ──
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const upcomingPayments = useMemo(
    () => payments.filter((p) => !p.paid && (p.dueDate === today || p.dueDate === tomorrow)),
    [payments, today, tomorrow]
  );

  // ── Birthdays today ──
  const todayBirthdays = useMemo(() => {
    const monthDay = today.slice(5); // "MM-DD"
    return students.filter(s => s.active && s.birthDate && s.birthDate.slice(5) === monthDay);
  }, [students, today]);

  const showOverdue = overduePayments.length > 0 && !dismissed.overduePayments;
  const showUpcoming = upcomingPayments.length > 0;

  // Count only truly actionable items for the badge
  const totalActive = pendingTrainings.length
    + (showOverdue ? 1 : 0)
    + (showUpcoming ? 1 : 0)
    + todayBirthdays.length;

  // ── Reset dismissals when the day changes (via dismissDate field) ──
  useEffect(() => {
    const currentDate = new Date().toISOString().split('T')[0];
    if (dismissed.dismissDate !== currentDate) {
      const reset: DismissedNotifications = { trainings: [], overduePayments: false, dismissDate: currentDate };
      setDismissed(reset);
      saveDismissed(reset);
    }
  }, [todayTrainings]);



  const dismissTraining = useCallback((id: string) => {
    const updated = { ...dismissed, trainings: [...dismissed.trainings, id] };
    setDismissed(updated);
    saveDismissed(updated);
  }, [dismissed]);

  const dismissOverdue = useCallback(() => {
    const updated = { ...dismissed, overduePayments: true };
    setDismissed(updated);
    saveDismissed(updated);
  }, [dismissed]);

  const dismissAll = useCallback(() => {
    const updated: DismissedNotifications = {
      trainings: todayTrainings.filter(t => !t.completed).map(t => t.id),
      overduePayments: overduePayments.length > 0,
      dismissDate: today,
    };
    setDismissed(updated);
    saveDismissed(updated);
  }, [todayTrainings, overduePayments, today]);

  const handleMarkComplete = useCallback(async (trainingId: string) => {
    const training = trainings.find(t => t.id === trainingId);
    if (!training) return;
    
    // As per user request: "se em notificações sinalar como executada, não é para dar presença para os alunos, ai deixa manual"
    // We only mark the training itself as complete/executed.
    
    // Persist completed status in the DATABASE (not localStorage!)
    await markTrainingComplete(trainingId);
    await refreshData();
    toast({ 
      title: '✅ Treino concluído', 
      description: 'O treino foi marcado como executado. A presença dos alunos deve ser conferida manualmente na lista.' 
    });
  }, [trainings, markTrainingComplete, refreshData]);

  const handleUndoComplete = useCallback(async (trainingId: string) => {
    await unmarkTrainingComplete(trainingId);
    await refreshData();
    toast({ title: '↩️ Treino reaberto', description: 'O treino voltou para pendente.' });
  }, [unmarkTrainingComplete, refreshData]);

  const handleDeleteTraining = useCallback(async (trainingId: string) => {
    await deleteTraining(trainingId);
    dismissTraining(trainingId);
    await refreshData();
    toast({ title: '🗑️ Treino excluído', description: 'O treino foi removido com sucesso.' });
  }, [deleteTraining, dismissTraining, refreshData]);

  const getTrainingStatus = (time: string, durationMinutes: number = 60): 'upcoming' | 'now' | 'past' => {
    const hour = parseInt(time.split(':')[0]);
    const trainingStart = hour * 60;
    const trainingEnd = trainingStart + durationMinutes;
    if (currentMinutes >= trainingStart && currentMinutes < trainingEnd) return 'now';
    if (currentMinutes >= trainingEnd) return 'past';
    return 'upcoming';
  };

  // Filter by tab
  const showTrainings = tab === 'all' || tab === 'trainings';
  const showPayments = tab === 'all' || tab === 'payments';
  const showBirthdays = tab === 'all' || tab === 'birthdays';

  // Tab counts
  const tabCounts = {
    all: totalActive,
    trainings: pendingTrainings.length,
    payments: (showOverdue ? 1 : 0) + (showUpcoming ? 1 : 0),
    birthdays: todayBirthdays.length,
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            'relative p-2.5 rounded-xl transition-all duration-300 active:scale-90',
            'bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent',
            open && 'bg-primary/10 text-primary border-primary/20 shadow-inner'
          )}
          title="Notificações"
        >
          <Bell className={cn("h-5 w-5 transition-transform", totalActive > 0 && "animate-[wiggle_1s_ease-in-out]")} />
          {totalActive > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-black text-white ring-2 ring-background shadow-lg shadow-destructive/20 animate-in zoom-in duration-300">
              {totalActive}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent 
        side="right" 
        className="w-full sm:w-[440px] sm:max-w-md p-0 flex flex-col border-l border-border/60 shadow-2xl [&>button]:hidden bg-background"
      >
        {/* Header Section (Sticky) */}
        <SheetHeader className="px-6 py-5 bg-gradient-to-r from-primary/5 via-primary/5 to-transparent border-b border-border/50 text-left shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/10">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <SheetTitle className="font-display font-bold text-base text-foreground leading-none">Notificações</SheetTitle>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] mt-1.5 opacity-80">Painel de Atividades</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalActive > 0 && (
                <button
                  onClick={dismissAll}
                  className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:bg-primary/10 px-3 py-2 rounded-lg transition-all active:scale-95 border border-primary/10 uppercase tracking-wider"
                  title="Limpar todas as notificações"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Limpar</span>
                </button>
              )}
              <SheetClose asChild>
                <button className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-all active:scale-90">
                  <X className="h-5 w-5" />
                </button>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        {/* Premium Tab System (Sticky) */}
        <div className="flex p-1.5 gap-1.5 bg-muted/30 border-b border-border/50 shrink-0">
          {(['all', 'trainings', 'payments', 'birthdays'] as const).map((t) => {
            const labels = { all: 'Todas', trainings: 'Treinos', payments: 'Pagos', birthdays: '🎂' };
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300',
                  isActive
                    ? 'bg-background text-primary shadow-sm border border-border/50 ring-1 ring-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                )}
              >
                <span className={cn(isActive ? "opacity-100" : "opacity-70")}>{labels[t]}</span>
                {tabCounts[t] > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary/10 text-primary border border-primary/10"
                  )}>
                    {tabCounts[t]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification List Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
          {/* Empty State */}
          {totalActive === 0 && completedTrainings.length === 0 && (
            <div className="py-20 px-10 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="relative flex h-20 w-20 mx-auto items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary/10 to-primary/5 mb-6 shadow-inner border border-primary/10">
                <CheckCheck className="h-10 w-10 text-primary/40" />
                <div className="absolute inset-0 rounded-[2rem] bg-primary/5 animate-pulse" />
              </div>
              <h4 className="text-lg font-bold text-foreground">Sua agenda está limpa!</h4>
              <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">Você completou todas as tarefas e notificações por hoje. Ótimo trabalho!</p>
            </div>
          )}

          {/* Birthday Section */}
          {showBirthdays && todayBirthdays.length > 0 && (
            <div className="p-4 border-b border-border/30">
              <div className="rounded-2xl bg-card border-l-4 border-pink-500 p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Cake className="h-24 w-24" />
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
                    <Cake className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-pink-700 dark:text-pink-400 uppercase tracking-tight">
                      Aniversariantes
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {todayBirthdays.map((s) => (
                        <span key={s.id} className="px-3 py-1 rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-300 text-xs font-bold border border-pink-500/20">
                          {s.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Payments Section */}
          {showPayments && showUpcoming && (
            <div className="p-4 border-b border-border/30">
              <div className="rounded-2xl bg-card border-l-4 border-amber-500 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                      Pagamentos Pendentes
                    </p>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      {upcomingPayments.filter(p => p.dueDate === today).length > 0 && (
                        <span className="text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-1 rounded-md">
                          {upcomingPayments.filter(p => p.dueDate === today).length} VENCE HOJE
                        </span>
                      )}
                      {upcomingPayments.filter(p => p.dueDate === tomorrow).length > 0 && (
                        <span className="text-xs font-bold text-amber-600/80 dark:text-amber-500/70 bg-amber-500/5 px-2 py-1 rounded-md">
                          {upcomingPayments.filter(p => p.dueDate === tomorrow).length} AMANHÃ
                        </span>
                      )}
                    </div>
                    <Link
                      to="/pagamentos"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 mt-3 text-[11px] text-primary font-black uppercase tracking-widest hover:opacity-80 transition-all group"
                    >
                      Ver detalhes <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overdue Payments Section */}
          {showPayments && showOverdue && (
            <div className="p-4 border-b border-border/30">
              <div className="rounded-2xl bg-card border-l-4 border-destructive p-4 shadow-sm ring-1 ring-destructive/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-destructive uppercase tracking-tight">
                        Pagamentos Atrasados
                      </p>
                      <p className="text-[12px] font-medium text-destructive/80 mt-1">
                        Total pendente: <span className="font-black">R$ {overduePayments.reduce((s, p) => s + p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Array.from(overdueStudentIds).slice(0, 3).map((sid) => {
                          const student = students.find((s) => s.id === sid);
                          return student ? (
                            <span key={sid} className="px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[11px] font-bold">
                              {student.name.split(' ')[0]}
                            </span>
                          ) : null;
                        })}
                        {overdueStudentIds.size > 3 && (
                          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-[11px] font-bold">
                            +{overdueStudentIds.size - 3}
                          </span>
                        )}
                      </div>
                      <Link
                        to="/pagamentos"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1 mt-3 text-[11px] text-primary font-black uppercase tracking-widest hover:opacity-80 transition-all group"
                      >
                        Resolver agora <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={dismissOverdue}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                    title="Dispensar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Today's Trainings — Pending Section */}
          {showTrainings && pendingTrainings.length > 0 && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 rounded-full bg-primary/40" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">
                    Agenda ({pendingTrainings.length})
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {pendingTrainings.map((t) => {
                  const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                  const status = getTrainingStatus(t.time, t.durationMinutes);
                  
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "group flex items-stretch gap-3 rounded-xl border bg-card p-3 transition-all",
                        status === 'now' ? "border-primary/40 ring-1 ring-primary/20 shadow-md" : "border-border/50 shadow-sm"
                      )}
                    >
                      {/* Premium Time Badge */}
                      <div className={cn(
                        "flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[64px] shrink-0",
                        status === 'now' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}>
                        <span className="text-sm font-black">{t.time}</span>
                      </div>

                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            status === 'now' ? "text-primary" : "text-foreground"
                          )}>
                            {status === 'now' ? 'EM AULA' : status === 'upcoming' ? 'PRÓXIMO' : 'PENDENTE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />{t.location || 'Sem local'}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3" />{trainingStudents.length}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions Panel */}
                      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/50">
                        <button
                          onClick={() => handleMarkComplete(t.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                          title="Marcar como concluído"
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
                        </button>
                        <button
                          onClick={() => dismissTraining(t.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-all"
                          title="Dispensar aviso"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Trainings — Completed Section */}
          {showTrainings && completedTrainings.length > 0 && (
            <div className="p-4 border-t border-border/30 bg-emerald-500/[0.02]">
              <div className="flex items-center justify-between px-1 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 rounded-full bg-emerald-500/40" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Executados ({completedTrainings.length})
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {completedTrainings.map((t) => {
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-card p-3 shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[64px] shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="text-sm font-black">{t.time}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-500 stroke-[4]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Concluído</span>
                        </div>
                        {t.completedAt && (
                          <span className="text-[10px] font-medium text-muted-foreground mt-1 block">
                            às {new Date(t.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleUndoComplete(t.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-emerald-500 hover:text-white transition-all shrink-0"
                        title="Reabrir treino"
                      >
                        <Undo2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Premium Full Agenda Link */}
          {showTrainings && (pendingTrainings.length > 0 || completedTrainings.length > 0) && (
            <div className="p-6">
              <Link
                to="/calendario"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-muted hover:bg-primary/10 text-[11px] font-black uppercase tracking-widest text-foreground hover:text-primary transition-all group"
              >
                <Calendar className="h-4 w-4" />
                Ver Agenda Completa
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
