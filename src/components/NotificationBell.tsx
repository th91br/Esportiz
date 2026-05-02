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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
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

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[360px] sm:w-[440px] rounded-2xl border border-border/60 bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 dark:ring-white/5">
          {/* Header Section */}
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary shadow-sm border border-primary/10">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-foreground leading-none">Notificações</h3>
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
              <button 
                onClick={() => setOpen(false)} 
                className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-all active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Premium Tab System */}
          <div className="flex p-1.5 gap-1.5 bg-muted/30 border-b border-border/50">
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
                      ? 'bg-background text-primary shadow-md shadow-black/5 border border-border/50 ring-1 ring-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                  )}
                >
                  <span className={cn(isActive ? "opacity-100" : "opacity-70")}>{labels[t]}</span>
                  {tabCounts[t] > 0 && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-black shadow-sm",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-primary/15 text-primary border border-primary/10"
                    )}>
                      {tabCounts[t]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification List Container */}
          <div className="max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
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
              <div className="p-4 border-b border-border/30 bg-pink-500/[0.03]">
                <div className="rounded-2xl bg-background dark:bg-pink-950/20 border border-pink-500/20 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 shadow-sm border border-pink-500/20">
                      <Cake className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-pink-700 dark:text-pink-300 uppercase tracking-tight">
                        🎉 Festa de Aniversário!
                      </p>
                      <p className="text-xs text-pink-600/80 dark:text-pink-400/80 font-medium mt-0.5">
                        {todayBirthdays.length} aluno{todayBirthdays.length !== 1 ? 's fazem' : ' faz'} aniversário hoje!
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {todayBirthdays.map((s) => (
                          <span key={s.id} className="px-3 py-1.5 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 text-xs font-bold shadow-sm border border-pink-500/10">
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
              <div className="p-4 border-b border-border/30 bg-amber-500/[0.03]">
                <div className="rounded-2xl bg-background dark:bg-amber-950/20 border border-amber-500/20 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/20">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-amber-700 dark:text-amber-300 uppercase tracking-tight">
                        Pagamentos Pendentes
                      </p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        {upcomingPayments.filter(p => p.dueDate === today).length > 0 && (
                          <span className="text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/15 px-3 py-1 rounded-lg border border-amber-500/20">
                            {upcomingPayments.filter(p => p.dueDate === today).length} VENCE HOJE
                          </span>
                        )}
                        {upcomingPayments.filter(p => p.dueDate === tomorrow).length > 0 && (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-500/70 bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10">
                            {upcomingPayments.filter(p => p.dueDate === tomorrow).length} AMANHÃ
                          </span>
                        )}
                      </div>
                      <Link
                        to="/pagamentos"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-primary font-black uppercase tracking-widest hover:opacity-80 transition-all group"
                      >
                        Gerenciar pagamentos 
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Payments Section */}
            {showPayments && showOverdue && (
              <div className="p-4 border-b border-border/30 bg-destructive/[0.03]">
                <div className="rounded-2xl bg-background dark:bg-destructive/10 border border-destructive/20 p-4 shadow-sm hover:shadow-md transition-shadow ring-1 ring-destructive/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive shadow-sm border border-destructive/20">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-destructive uppercase tracking-tight">
                          URGENTE: Pagamentos Atrasados
                        </p>
                        <p className="text-[12px] font-bold text-destructive/80 dark:text-destructive-foreground/70 mt-1">
                          {overdueStudentIds.size} Aluno{overdueStudentIds.size !== 1 ? 's' : ''} • Total: <span className="font-black">R$ {overduePayments.reduce((s, p) => s + p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {Array.from(overdueStudentIds).slice(0, 5).map((sid) => {
                            const student = students.find((s) => s.id === sid);
                            return student ? (
                              <span key={sid} className="px-3 py-1.5 rounded-lg bg-destructive/10 dark:bg-destructive/20 text-destructive text-xs font-bold shadow-sm border border-destructive/10">
                                {student.name.split(' ')[0]}
                              </span>
                            ) : null;
                          })}
                          {overdueStudentIds.size > 5 && (
                            <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold border border-border/50">
                              +{overdueStudentIds.size - 5}
                            </span>
                          )}
                        </div>
                        <Link
                          to="/pagamentos"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1.5 mt-4 text-[11px] text-primary font-black uppercase tracking-widest hover:opacity-80 transition-all group"
                        >
                          Resolver agora
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={dismissOverdue}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90"
                      title="Dispensar"
                    >
                      <X className="h-5 w-5" />
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
                    <div className="w-2 h-4 rounded-full bg-primary/40 shadow-sm" />
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-foreground/70">
                      Agenda do Dia ({pendingTrainings.length})
                    </span>
                  </div>
                  <Calendar className="h-3.5 w-3.5 text-primary/40" />
                </div>
                <div className="space-y-4">
                  {pendingTrainings.map((t) => {
                    const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                    const status = getTrainingStatus(t.time, t.durationMinutes);
                    
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "group rounded-2xl border p-4.5 transition-all duration-300 relative overflow-hidden",
                          status === 'now' && "border-primary/40 bg-primary/[0.04] shadow-xl shadow-primary/5 ring-1 ring-primary/20",
                          status === 'upcoming' && "border-border/60 bg-background hover:border-primary/40 hover:shadow-lg",
                          status === 'past' && "border-border/30 bg-muted/20 grayscale-[0.5]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4 relative z-10">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Premium Time Badge */}
                            <div className={cn(
                              "flex flex-col items-center justify-center rounded-xl px-4 py-2.5 min-w-[70px] shadow-sm transition-all duration-300",
                              status === 'now' && "bg-primary text-primary-foreground scale-110",
                              status === 'upcoming' && "bg-primary/10 text-primary border border-primary/20",
                              status === 'past' && "bg-muted text-muted-foreground border border-border/50"
                            )}>
                              <span className="text-base font-black leading-none">{t.time}</span>
                              <span className="text-[10px] font-bold leading-none mt-1.5 opacity-80 uppercase tracking-tighter">
                                FIM: {getEndTime(t.time, t.durationMinutes)}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5">
                                {status === 'now' && (
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                  </span>
                                )}
                                <span className={cn(
                                  "text-[11px] font-black uppercase tracking-widest",
                                  status === 'now' ? "text-primary" : "text-foreground"
                                )}>
                                  {status === 'now' ? 'EM AULA AGORA' : status === 'upcoming' ? 'PRÓXIMO' : 'ENCERRADO'}
                                </span>
                              </div>
                              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[12px] text-muted-foreground font-bold">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4 text-primary/60" />{t.location || 'Sem local'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-primary/60" />{trainingStudents.length} Aluno{trainingStudents.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {trainingStudents.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {trainingStudents.slice(0, 3).map(s => (
                                    <span key={s.id} className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-black text-foreground/80 border border-border/60 shadow-sm">
                                      {s.name.split(' ')[0]}
                                    </span>
                                  ))}
                                  {trainingStudents.length > 3 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-[10px] font-black text-primary border border-primary/20 shadow-sm">
                                      +{trainingStudents.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions Panel */}
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => handleMarkComplete(t.id)}
                              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20 transition-all active:scale-90"
                              title="Marcar como concluído"
                            >
                              <Check className="h-4.5 w-4.5 stroke-[3]" />
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(t.id)}
                              className="p-2.5 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive hover:text-white transition-all active:scale-90 border border-destructive/10"
                              title="Excluir treino"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => dismissTraining(t.id)}
                              className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-foreground hover:text-background transition-all active:scale-90 border border-border/50"
                              title="Dispensar"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>
                        {status === 'now' && (
                          <div className="absolute top-0 left-0 h-full w-1.5 bg-primary shadow-[2px_0_10px_rgba(var(--primary),0.3)]" />
                        )}
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
                    <div className="w-2 h-4 rounded-full bg-emerald-500/40 shadow-sm" />
                    <span className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                      Executados Hoje ({completedTrainings.length})
                    </span>
                  </div>
                  <CheckCheck className="h-4 w-4 text-emerald-500/50" />
                </div>
                <div className="space-y-4">
                  {completedTrainings.map((t) => {
                    const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                    
                    return (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-emerald-500/30 bg-background dark:bg-emerald-950/10 p-4.5 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="flex flex-col items-center justify-center rounded-xl px-4 py-2.5 min-w-[70px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                              <span className="text-base font-black leading-none">{t.time}</span>
                              <span className="text-[10px] font-bold leading-none mt-1.5 opacity-80 uppercase tracking-tighter">
                                FIM: {getEndTime(t.time, t.durationMinutes)}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30">
                                  <Check className="h-3 w-3 text-white stroke-[4]" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Concluído</span>
                                {t.completedAt && (
                                  <span className="text-[10px] font-bold text-muted-foreground/60 ml-auto">
                                    {new Date(t.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-[12px] text-muted-foreground font-bold">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4 opacity-60" />{t.location || 'Local'}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-4 w-4 opacity-60" />{trainingStudents.length} Alunos
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUndoComplete(t.id)}
                            className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-emerald-500 hover:text-white transition-all active:scale-90 shadow-sm border border-border/50"
                            title="Reabrir treino"
                          >
                            <Undo2 className="h-5 w-5" />
                          </button>
                        </div>
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
                  className="flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 border-primary/20 bg-primary/5 text-[12px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.97] group"
                >
                  <Calendar className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Abrir Agenda Completa
                </Link>
              </div>
            )}
          </div>

          {/* Elegant Status Footer */}
          <div className="px-6 py-4 border-t border-border/50 bg-muted/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 group cursor-help" title="Treinos agendados para hoje">
                <div className="h-2 w-2 rounded-full bg-primary/60 shadow-sm" />
                <span className="text-[10px] font-black text-muted-foreground/80 tracking-widest uppercase">{todayTrainings.length} TREINOS</span>
              </div>
              <div className="h-4 w-[1px] bg-border/60" />
              <div className="flex items-center gap-2 group cursor-help" title="Pagamentos em atraso">
                <div className="h-2 w-2 rounded-full bg-destructive/60 shadow-sm" />
                <span className="text-[10px] font-black text-muted-foreground/80 tracking-widest uppercase">{overduePayments.length} ATRASADOS</span>
              </div>
              {todayBirthdays.length > 0 && (
                <>
                  <div className="h-4 w-[1px] bg-border/60" />
                  <div className="flex items-center gap-2 group cursor-help" title="Aniversariantes de hoje">
                    <span className="text-xs">🎂</span>
                    <span className="text-[10px] font-black text-muted-foreground/80 tracking-widest uppercase">{todayBirthdays.length} HOJE</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
