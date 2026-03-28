import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Bell, Clock, Users, MapPin, AlertTriangle, X, Check, Trash2, CheckCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useStudents } from '@/hooks/queries/useStudents';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { usePayments } from '@/hooks/queries/usePayments';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { getEndTime } from '@/data/mockData';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type DismissedNotifications = {
  trainings: string[]; // dismissed training IDs
  overduePayments: boolean; // whether overdue section is dismissed
};

const STORAGE_KEY = 'resenhas-dismissed-notifications';

function getDismissed(): DismissedNotifications {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { trainings: [], overduePayments: false };
}

function saveDismissed(d: DismissedNotifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

// Clean old dismissed trainings daily
function cleanDismissedTrainings(dismissed: DismissedNotifications, validIds: string[]): DismissedNotifications {
  const validSet = new Set(validIds);
  const cleaned = dismissed.trainings.filter(id => validSet.has(id));
  return { ...dismissed, trainings: cleaned };
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { students } = useStudents();
  const { trainings, deleteTraining } = useTrainings();
  const { payments } = usePayments();
  const { attendance, toggleAttendance } = useAttendance();

  const refreshData = async () => {
    await queryClient.invalidateQueries();
  };
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<DismissedNotifications>(getDismissed);
  const [tab, setTab] = useState<'all' | 'trainings' | 'payments'>('all');
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentHour = now.getHours();

  // Today's trainings
  const todayTrainings = useMemo(
    () => trainings.filter((t) => t.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [trainings, today]
  );

  // Overdue payments
  const overduePayments = useMemo(
    () => payments.filter((p) => !p.paid && p.dueDate < today),
    [payments, today]
  );

  const overdueStudentIds = useMemo(
    () => new Set(overduePayments.map((p) => p.studentId)),
    [overduePayments]
  );

  // Active (non-dismissed) notifications
  const activeTrainings = useMemo(
    () => todayTrainings.filter(t => !dismissed.trainings.includes(t.id)),
    [todayTrainings, dismissed]
  );

  const showOverdue = overduePayments.length > 0 && !dismissed.overduePayments;

  const totalActive = activeTrainings.length + (showOverdue ? 1 : 0);

  // Clean dismissed on mount
  useEffect(() => {
    const cleaned = cleanDismissedTrainings(dismissed, todayTrainings.map(t => t.id));
    if (cleaned.trainings.length !== dismissed.trainings.length) {
      // Also reset overdue dismiss daily
      const updated = { ...cleaned, overduePayments: false };
      setDismissed(updated);
      saveDismissed(updated);
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
    const updated = {
      trainings: todayTrainings.map(t => t.id),
      overduePayments: overduePayments.length > 0,
    };
    setDismissed(updated);
    saveDismissed(updated);
  }, [todayTrainings, overduePayments]);

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

    dismissTraining(trainingId);
    await refreshData();
    toast({ title: '✅ Treino concluído', description: 'Todos os alunos foram marcados como presentes.' });
  }, [trainings, attendance, toggleAttendance, dismissTraining, refreshData]);

  const handleDeleteTraining = useCallback(async (trainingId: string) => {
    await deleteTraining(trainingId);
    dismissTraining(trainingId);
    await refreshData();
    toast({ title: '🗑️ Treino excluído', description: 'O treino foi removido com sucesso.' });
  }, [deleteTraining, dismissTraining, refreshData]);

  const getTrainingStatus = (time: string): 'upcoming' | 'now' | 'past' => {
    const hour = parseInt(time.split(':')[0]);
    if (hour === currentHour) return 'now';
    if (hour > currentHour) return 'upcoming';
    return 'past';
  };

  // Filter by tab
  const showTrainings = tab === 'all' || tab === 'trainings';
  const showPayments = tab === 'all' || tab === 'payments';

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
            {(['all', 'trainings', 'payments'] as const).map((t) => {
              const labels = { all: 'Todas', trainings: 'Treinos', payments: 'Pagamentos' };
              const counts = {
                all: totalActive,
                trainings: activeTrainings.length,
                payments: showOverdue ? 1 : 0,
              };
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
                  {counts[t] > 0 && (
                    <span className={cn(
                      "ml-1 px-1 py-0.5 rounded text-[9px] font-bold",
                      tab === t ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {counts[t]}
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
            {((showTrainings && activeTrainings.length === 0 && showPayments && !showOverdue) ||
              (tab === 'trainings' && activeTrainings.length === 0) ||
              (tab === 'payments' && !showOverdue)) &&
              !(tab === 'all' && (activeTrainings.length > 0 || showOverdue)) && (
              <div className="p-8 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/5 mb-3">
                  <CheckCheck className="h-5 w-5 text-primary/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">Nenhuma notificação pendente.</p>
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

            {/* Today's Trainings */}
            {showTrainings && activeTrainings.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Treinos de Hoje — {todayTrainings.length} total
                  </span>
                </div>
                <div className="space-y-2">
                  {activeTrainings.map((t) => {
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
              {todayTrainings.length} treino{todayTrainings.length !== 1 ? 's' : ''} hoje · {overduePayments.length} pagamento{overduePayments.length !== 1 ? 's' : ''} atrasado{overduePayments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
