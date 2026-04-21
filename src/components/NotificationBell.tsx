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
  const { attendance, toggleAttendance } = useAttendance();

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
    
    // Mark all students as present
    for (const studentId of training.studentIds) {
      const existing = attendance.find(a => a.trainingId === trainingId && a.studentId === studentId);
      if (!existing || !existing.present) {
        await toggleAttendance(trainingId, studentId, training.date);
      }
    }

    // Persist completed status in the DATABASE (not localStorage!)
    await markTrainingComplete(trainingId);
    await refreshData();
    toast({ title: '✅ Treino concluído', description: 'Todos os alunos foram marcados como presentes.' });
  }, [trainings, attendance, toggleAttendance, markTrainingComplete, refreshData]);

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

  const getTrainingStatus = (time: string): 'upcoming' | 'now' | 'past' => {
    const hour = parseInt(time.split(':')[0]);
    const trainingStart = hour * 60;
    const trainingEnd = trainingStart + 60; // each session = 1h
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
          'relative p-2 rounded-full transition-all duration-200',
          'hover:bg-muted text-muted-foreground hover:text-foreground',
          open && 'bg-primary/10 text-primary'
        )}
        title="Notificações"
      >
        <Bell className={cn("h-4 w-4 transition-transform", totalActive > 0 && "animate-[wiggle_1s_ease-in-out]")} />
        {totalActive > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {totalActive}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Notificações</h3>
              {totalActive > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {totalActive}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {totalActive > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                  title="Limpar todas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/50 bg-muted/10">
            {(['all', 'trainings', 'payments', 'birthdays'] as const).map((t) => {
              const labels = { all: 'Todas', trainings: 'Treinos', payments: 'Pagamentos', birthdays: '🎂' };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 px-3 py-2 text-xs font-medium transition-colors relative',
                    tab === t
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {labels[t]}
                  {tabCounts[t] > 0 && (
                    <span className={cn(
                      "ml-1 px-1 py-0.5 rounded text-[9px] font-bold",
                      tab === t ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {tabCounts[t]}
                    </span>
                  )}
                  {tab === t && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {/* Empty State */}
            {totalActive === 0 && completedTrainings.length === 0 && (
              <div className="p-8 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/5 mb-3">
                  <CheckCheck className="h-5 w-5 text-primary/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Nenhuma notificação pendente.</p>
              </div>
            )}

            {/* Birthdays */}
            {showBirthdays && todayBirthdays.length > 0 && (
              <div className="p-3 border-b border-border/30">
                <div className="rounded-lg bg-pink-500/5 border border-pink-500/10 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
                      <Cake className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                        🎂 Aniversariante{todayBirthdays.length !== 1 ? 's' : ''} do Dia!
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {todayBirthdays.map((s) => (
                          <span key={s.id} className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-medium">
                            {s.name.split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Payments (due today/tomorrow) */}
            {showPayments && showUpcoming && (
              <div className="p-3 border-b border-border/30">
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        Pagamentos Próximos
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {upcomingPayments.filter(p => p.dueDate === today).length > 0 && (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {upcomingPayments.filter(p => p.dueDate === today).length} vence{upcomingPayments.filter(p => p.dueDate === today).length !== 1 ? 'm' : ''} hoje
                          </span>
                        )}
                        {upcomingPayments.filter(p => p.dueDate === today).length > 0 && upcomingPayments.filter(p => p.dueDate === tomorrow).length > 0 && ' · '}
                        {upcomingPayments.filter(p => p.dueDate === tomorrow).length > 0 && (
                          <span>
                            {upcomingPayments.filter(p => p.dueDate === tomorrow).length} vence{upcomingPayments.filter(p => p.dueDate === tomorrow).length !== 1 ? 'm' : ''} amanhã
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Link
                          to="/pagamentos"
                          onClick={() => setOpen(false)}
                          className="text-[10px] text-primary font-semibold hover:underline"
                        >
                          Ver pagamentos →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overdue Payments */}
            {showPayments && showOverdue && (
              <div className="p-3 border-b border-border/30">
                <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-destructive">
                          Pagamentos Atrasados
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {overdueStudentIds.size} aluno{overdueStudentIds.size !== 1 ? 's' : ''} · {overduePayments.length} pagamento{overduePayments.length !== 1 ? 's' : ''} · R$ {overduePayments.reduce((s, p) => s + p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.from(overdueStudentIds).slice(0, 5).map((sid) => {
                            const student = students.find((s) => s.id === sid);
                            return student ? (
                              <span key={sid} className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">
                                {student.name.split(' ')[0]}
                              </span>
                            ) : null;
                          })}
                          {overdueStudentIds.size > 5 && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                              +{overdueStudentIds.size - 5}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Link
                            to="/pagamentos"
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-primary font-semibold hover:underline"
                          >
                            Ver pagamentos →
                          </Link>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={dismissOverdue}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                      title="Dispensar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Trainings — Pending */}
            {showTrainings && pendingTrainings.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Treinos Pendentes — {pendingTrainings.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingTrainings.map((t) => {
                    const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                    const status = getTrainingStatus(t.time);
                    
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "rounded-lg border p-3 transition-all",
                          status === 'now' && "border-primary/30 bg-primary/5 ring-1 ring-primary/10",
                          status === 'upcoming' && "border-border/50 bg-card hover:bg-muted/30",
                          status === 'past' && "border-border/30 bg-muted/20 opacity-70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Time badge */}
                            <div className={cn(
                              "flex flex-col items-center rounded-lg px-2 py-1.5 min-w-[52px]",
                              status === 'now' && "bg-primary text-primary-foreground",
                              status === 'upcoming' && "bg-primary/10 text-primary",
                              status === 'past' && "bg-muted text-muted-foreground"
                            )}>
                              <span className="text-xs font-bold leading-none">{t.time}</span>
                              <span className="text-[9px] leading-none mt-0.5">{getEndTime(t.time)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {status === 'now' && (
                                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                                <span className={cn(
                                  "text-xs font-semibold",
                                  status === 'now' ? "text-primary" : "text-foreground"
                                )}>
                                  {status === 'now' ? 'Agora' : status === 'upcoming' ? 'Próximo' : 'Encerrado'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />{t.location || 'Local'}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />{trainingStudents.length} aluno{trainingStudents.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {trainingStudents.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {trainingStudents.slice(0, 3).map(s => (
                                    <span key={s.id} className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-medium text-muted-foreground">
                                      {s.name.split(' ')[0]}
                                    </span>
                                  ))}
                                  {trainingStudents.length > 3 && (
                                    <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-medium text-muted-foreground">
                                      +{trainingStudents.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => handleMarkComplete(t.id)}
                              className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Marcar como concluído"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTraining(t.id)}
                              className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              title="Excluir treino"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => dismissTraining(t.id)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Dispensar notificação"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's Trainings — Completed (always visible, distinct style) */}
            {showTrainings && completedTrainings.length > 0 && (
              <div className="p-3 border-t border-border/30">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <CheckCheck className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Executados Hoje — {completedTrainings.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {completedTrainings.map((t) => {
                    const trainingStudents = students.filter((s) => t.studentIds.includes(s.id));
                    
                    return (
                      <div
                        key={t.id}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Time badge — completed style */}
                            <div className="flex flex-col items-center rounded-lg px-2 py-1.5 min-w-[52px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <span className="text-xs font-bold leading-none">{t.time}</span>
                              <span className="text-[9px] leading-none mt-0.5">{getEndTime(t.time)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Executado</span>
                                {t.completedAt && (
                                  <span className="text-[9px] text-muted-foreground">
                                    às {new Date(t.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />{t.location || 'Local'}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />{trainingStudents.length} aluno{trainingStudents.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Undo action */}
                          <button
                            onClick={() => handleUndoComplete(t.id)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            title="Desfazer conclusão"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
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
              <div className="px-3 pb-3">
                <Link
                  to="/calendario"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 mt-2 py-2 text-[11px] font-semibold text-primary hover:underline"
                >
                  <Calendar className="h-3 w-3" />
                  Abrir calendário completo
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
            <p className="text-[10px] text-muted-foreground text-center">
              {todayTrainings.length} treino{todayTrainings.length !== 1 ? 's' : ''} hoje
              {completedTrainings.length > 0 && ` · ${completedTrainings.length} executado${completedTrainings.length !== 1 ? 's' : ''}`}
              {' '}· {overduePayments.length} atrasado{overduePayments.length !== 1 ? 's' : ''}
              {todayBirthdays.length > 0 && ` · ${todayBirthdays.length} 🎂`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
