import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Bell, Clock, Users, MapPin, AlertTriangle, X, Check, Trash2, CheckCheck, Calendar, Cake, CreditCard, Undo2 } from 'lucide-react';
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
  const ref = useRef<HTMLDivElement>(null);

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

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    if (currentMinutes < trainingStart) return 'upcoming';
    return 'past';
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-xl transition-all duration-300',
          'hover:bg-primary/10 text-muted-foreground hover:text-primary',
          open && 'bg-primary/15 text-primary shadow-sm'
        )}
        title="Notificações"
      >
        <Bell className={cn("h-5 w-5 transition-transform", totalActive > 0 && "animate-[wiggle_1s_ease-in-out]")} />
        {totalActive > 0 && (
          <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-in zoom-in duration-300">
            {totalActive}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[350px] sm:w-[420px] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-primary/5 border-b border-primary/10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">Notificações</h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Alertas do dia</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalActive > 0 && (
                <button
                  onClick={dismissAll}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-all"
                  title="Limpar todas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>LIMPAR</span>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-all">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 gap-1 bg-muted/30 border-b border-border/50">
            {(['all', 'trainings', 'payments', 'birthdays'] as const).map((t) => {
              const labels = { all: 'Todas', trainings: 'Treinos', payments: 'Pagos', birthdays: '🎂' };
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                    isActive
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  {labels[t]}
                  {tabCounts[t] > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none",
                      isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      {tabCounts[t]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted">
            {/* Empty State */}
            {totalActive === 0 && completedTrainings.length === 0 && (
              <div className="py-12 px-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/5 mb-4 shadow-inner">
                  <CheckCheck className="h-7 w-7 text-primary/30" />
                </div>
                <p className="text-base font-bold text-foreground">Você está em dia!</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Não há notificações pendentes no momento. Bom trabalho!</p>
              </div>
            )}

            {/* Birthdays */}
            {showBirthdays && todayBirthdays.length > 0 && (
              <div className="p-4 border-b border-border/30 bg-pink-500/[0.02]">
                <div className="rounded-xl bg-pink-500/5 border border-pink-500/10 p-4 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-500 shadow-sm">
                      <Cake className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-pink-600 dark:text-pink-400">
                        🎂 Aniversariante{todayBirthdays.length !== 1 ? 's' : ''} do Dia!
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {todayBirthdays.map((s) => (
                          <span key={s.id} className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-300 text-[10px] font-bold shadow-sm">
                            {s.name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Payments */}
            {showPayments && showUpcoming && (
              <div className="p-4 border-b border-border/30 bg-amber-500/[0.02]">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 shadow-sm">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                        Pagamentos Próximos
                      </p>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        {upcomingPayments.filter(p => p.dueDate === today).length > 0 && (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            {upcomingPayments.filter(p => p.dueDate === today).length} hoje
                          </span>
                        )}
                        {upcomingPayments.filter(p => p.dueDate === tomorrow).length > 0 && (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded-md">
                            {upcomingPayments.filter(p => p.dueDate === tomorrow).length} amanhã
                          </span>
                        )}
                      </div>
                      <Link
                        to="/pagamentos"
                        onClick={() => setOpen(false)}
                        className="inline-block mt-2.5 text-[10px] text-primary font-black uppercase tracking-wider hover:opacity-80 transition-opacity"
                      >
                        Gerenciar pagamentos →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Payments */}
            {showPayments && showOverdue && (
              <div className="p-4 border-b border-border/30 bg-destructive/[0.02]">
                <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive shadow-sm">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-destructive">
                          Pagamentos Atrasados
                        </p>
                        <p className="text-[11px] font-medium text-destructive/80 mt-1">
                          {overdueStudentIds.size} aluno{overdueStudentIds.size !== 1 ? 's' : ''} · R$ {overduePayments.reduce((s, p) => s + p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {Array.from(overdueStudentIds).slice(0, 5).map((sid) => {
                            const student = students.find((s) => s.id === sid);
                            return student ? (
                              <span key={sid} className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[10px] font-bold shadow-sm">
                                {student.name.split(' ')[0]}
                              </span>
                            ) : null;
                          })}
                          {overdueStudentIds.size > 5 && (
                            <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] font-bold">
                              +{overdueStudentIds.size - 5}
                            </span>
                          )}
                        </div>
                        <Link
                          to="/pagamentos"
                          onClick={() => setOpen(false)}
                          className="inline-block mt-2.5 text-[10px] text-primary font-black uppercase tracking-wider hover:opacity-80 transition-opacity"
                        >
                          Resolver agora →
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={dismissOverdue}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                      title="Dispensar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Trainings — Pending */}
            {showTrainings && pendingTrainings.length > 0 && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-3 rounded-full bg-primary/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                    Treinos Pendentes ({pendingTrainings.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingTrainings.map((t) => {
                    const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                    const status = getTrainingStatus(t.time, t.durationMinutes);
                    
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "rounded-xl border p-4 transition-all duration-300",
                          status === 'now' && "border-primary/40 bg-primary/[0.03] shadow-lg shadow-primary/5 ring-1 ring-primary/20",
                          status === 'upcoming' && "border-border/50 bg-card hover:border-primary/30 hover:shadow-md",
                          status === 'past' && "border-border/30 bg-muted/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* Time badge */}
                            <div className={cn(
                              "flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[60px] shadow-sm transition-colors",
                              status === 'now' && "bg-primary text-primary-foreground",
                              status === 'upcoming' && "bg-primary/10 text-primary",
                              status === 'past' && "bg-muted text-muted-foreground"
                            )}>
                              <span className="text-sm font-black leading-none">{t.time}</span>
                              <span className="text-[10px] font-bold leading-none mt-1 opacity-80">{getEndTime(t.time, t.durationMinutes)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {status === 'now' && (
                                  <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                                )}
                                <span className={cn(
                                  "text-xs font-black uppercase tracking-wider",
                                  status === 'now' ? "text-primary" : "text-foreground/80"
                                )}>
                                  {status === 'now' ? 'Em aula agora' : status === 'upcoming' ? 'Próximo' : 'Encerrado'}
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />{t.location || 'Local'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground/60" />{trainingStudents.length} aluno{trainingStudents.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {trainingStudents.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                  {trainingStudents.slice(0, 3).map(s => (
                                    <span key={s.id} className="px-2 py-0.5 rounded-md bg-muted/60 text-[10px] font-bold text-foreground/70 border border-border/30">
                                      {s.name.split(' ')[0]}
                                    </span>
                                  ))}
                                  {trainingStudents.length > 3 && (
                                    <span className="px-2 py-0.5 rounded-md bg-primary/5 text-[10px] font-black text-primary">
                                      +{trainingStudents.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => handleMarkComplete(t.id)}
                              className="p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all active:scale-95"
                              title="Marcar como concluído"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(t.id)}
                              className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-95"
                              title="Excluir treino"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => dismissTraining(t.id)}
                              className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-foreground hover:text-background transition-all active:scale-95"
                              title="Dispensar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's Trainings — Completed */}
            {showTrainings && completedTrainings.length > 0 && (
              <div className="p-4 border-t border-border/30 bg-emerald-500/[0.01]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1.5 h-3 rounded-full bg-emerald-500/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Executados Hoje ({completedTrainings.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {completedTrainings.map((t) => {
                    const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                    
                    return (
                      <div
                        key={t.id}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <div className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[60px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm">
                              <span className="text-sm font-black leading-none">{t.time}</span>
                              <span className="text-[10px] font-bold leading-none mt-1 opacity-80">{getEndTime(t.time, t.durationMinutes)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="p-0.5 rounded-full bg-emerald-500">
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Concluído</span>
                                {t.completedAt && (
                                  <span className="text-[10px] font-medium text-muted-foreground/60">
                                    às {new Date(t.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />{t.location || 'Local'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />{trainingStudents.length} aluno{trainingStudents.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUndoComplete(t.id)}
                            className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-sm"
                            title="Reabrir treino"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calendar link */}
            {showTrainings && (pendingTrainings.length > 0 || completedTrainings.length > 0) && (
              <div className="px-4 pb-4">
                <Link
                  to="/calendario"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 mt-2 py-3 rounded-xl border border-primary/20 bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-[0.98]"
                >
                  <Calendar className="h-4 w-4" />
                  Abrir agenda completa
                </Link>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-5 py-3 border-t border-border/50 bg-muted/40">
            <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {todayTrainings.length} TREINOS
              </span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> {overduePayments.length} ATRASADOS
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
