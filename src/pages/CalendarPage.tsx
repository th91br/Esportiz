import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sun, Sunset, Moon, MapPin, Users, Clock, Pencil, Trash2, CalendarDays, CalendarRange, Repeat } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getDayName, formatDate, getWeekDatesArray, getEndTime, getTimePeriod, timeSlots, getMonthName, getWeekNumber, getWeekOffsetForDate,
} from '@/data/mockData';
import type { TimeSlot, Training } from '@/data/mockData';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

import { toast } from '@/hooks/use-toast';
import { useStudents } from '@/hooks/queries/useStudents';
import { useTrainings } from '@/hooks/queries/useTrainings';

const periodIcons = { manhã: Sun, tarde: Sunset, noite: Moon };
const periodStyles = { manhã: 'bg-amber-500', tarde: 'bg-orange-500', noite: 'bg-indigo-500' };

function TrainingFormDialog({
  open, onOpenChange, training, selectedDate, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; training?: Training; selectedDate: string; onSaved?: (date: string) => void;
}) {
  const { students } = useStudents();
  const { trainings, addTraining, updateTraining } = useTrainings();
  const activeStudents = students.filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const isEditing = !!training;
  const [saving, setSaving] = useState(false);
  const [formDate, setFormDate] = useState(training?.date || selectedDate);
  const [formTime, setFormTime] = useState<string>(training?.time || '');
  const [formLocation, setFormLocation] = useState(training?.location || '');
  const [formStudentIds, setFormStudentIds] = useState<string[]>(training?.studentIds || []);
  const [recurrence, setRecurrence] = useState<'none' | 'month' | 'quarter'>('none');
  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = activeStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setFormStudentIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const getFutureDatesForDayOfWeek = (dateStr: string, monthsAhead: number): string[] => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay();
    const startYear = date.getFullYear();
    const startMonth = date.getMonth();
    
    const endDate = new Date(startYear, startMonth + monthsAhead + 1, 0); 
    const dates: string[] = [];
    
    const currentIterDate = new Date(startYear, startMonth, 1);
    while (currentIterDate <= endDate) {
      if (currentIterDate.getDay() === dayOfWeek) {
        dates.push(currentIterDate.toISOString().split('T')[0]);
      }
      currentIterDate.setDate(currentIterDate.getDate() + 1);
    }
    
    return dates.filter((d) => d >= dateStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTime || !formLocation || formStudentIds.length === 0) {
      toast({ title: 'Preencha todos os campos', description: 'Selecione horário, local e pelo menos um aluno.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const baseData = { time: formTime as TimeSlot, studentIds: formStudentIds, location: formLocation };
      
      let datesToSchedule: string[] = [formDate];
      if (recurrence === 'month') {
        datesToSchedule = getFutureDatesForDayOfWeek(formDate, 0);
      } else if (recurrence === 'quarter') {
        datesToSchedule = getFutureDatesForDayOfWeek(formDate, 3);
      }

      if (isEditing) {
        // Atualiza a data atual do modal
        await updateTraining(training.id, { ...baseData, date: formDate });
        const extraDates = datesToSchedule.filter((d) => d !== formDate && d > formDate);
        
        for (const date of extraDates) {
          // Anti-Ghosting: Busca colisões na agenda para sobrescrever em vez de duplicar
          const existing = trainings.find((t) => t.date === date && t.time === formTime);
          if (existing) {
            await updateTraining(existing.id, { ...baseData, date });
          } else {
            await addTraining({ ...baseData, date });
          }
        }
        
        if (extraDates.length > 0) {
          toast({ title: `Treino atualizado e replicado!`, description: `${extraDates.length + 1} treinos ajustados na agenda.` });
        } else {
          toast({ title: 'Treino atualizado!' });
        }
      } else {
        for (const date of datesToSchedule) {
          // O mesmo processo previne duplicatas ao se cadastrar em lote novo
          const existing = trainings.find((t) => t.date === date && t.time === formTime);
          if (existing) {
            await updateTraining(existing.id, { ...baseData, date });
          } else {
            await addTraining({ ...baseData, date });
          }
        }
        
        if (datesToSchedule.length > 1) {
          toast({ title: `${datesToSchedule.length} treinos processados!`, description: `Pauta atualizada usando a proteção de agenda.` });
        } else {
          toast({ title: 'Treino agendado!' });
        }
      }
      onSaved?.(formDate);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? 'Editar Treino' : 'Agendar Novo Treino'}</DialogTitle>
          <DialogDescription>Configure os detalhes do treino</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Recorrência de Treino</Label>
            <Select value={recurrence} onValueChange={(value: any) => setRecurrence(value)}>
              <SelectTrigger className="bg-muted/50 border-border/50">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Selecione a recorrência" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Somente nesta data ({formatDate(formDate)})</SelectItem>
                <SelectItem value="month">Repetir até o fim do mês (Todas as {getDayName(formDate)}s)</SelectItem>
                <SelectItem value="quarter">Repetir por 3 meses (Mensalidade Completa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={formTime} onValueChange={setFormTime}>
              <SelectTrigger><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>{time} - {getEndTime(time)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Local</Label>
            <Input placeholder="Ex: Praia de Copacabana" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Alunos ({formStudentIds.length} selecionado{formStudentIds.length !== 1 ? 's' : ''})</Label>
            <Input
              placeholder="Buscar aluno pelo nome..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="mb-2"
            />
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
              {filteredStudents.length === 0 && activeStudents.length > 0 && (
                <p className="text-sm text-muted-foreground p-2">Nenhum aluno encontrado.</p>
              )}
              {activeStudents.length === 0 && <p className="text-sm text-muted-foreground p-2">Cadastre alunos primeiro.</p>}
              {filteredStudents.map((student) => {
                const isSelected = formStudentIds.includes(student.id);
                return (
                  <button key={student.id} type="button" onClick={() => toggleStudent(student.id)}
                    className={cn('flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors', isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
                    <div className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0', isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30')}>
                      {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    {student.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1 btn-primary-gradient" disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
               isEditing ? 'Salvar' : 
               recurrence !== 'none' ? 'Agendar em Lote' : 'Agendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Annual calendar mini-view with hover tooltips
function AnnualCalendar({ year, trainings, students, onDayClick }: { year: number; trainings: Training[]; students: { id: string; name: string }[]; onDayClick?: (dateStr: string) => void }) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const studentMap = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [students]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => {
          const firstDay = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];

          return (
            <div key={month} className="rounded-xl border border-border/50 p-3 bg-card">
              <h4 className="font-display font-semibold text-sm mb-2 text-center">{getMonthName(month)}</h4>
              <div className="grid grid-cols-7 gap-px text-center">
                {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                  <span key={i} className="text-[10px] text-muted-foreground font-medium">{d}</span>
                ))}
                {Array.from({ length: startDayOfWeek }).map((_, i) => <span key={`e-${i}`} />)}
                {days.map((day) => {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayTrainings = trainings.filter((t) => t.date === dateStr);
                  const hasTraining = dayTrainings.length > 0;
                  const isToday = dateStr === todayStr;

                  if (hasTraining) {
                    const allStudentNames = Array.from(new Set(
                      dayTrainings.flatMap((t) => t.studentIds.map((id) => studentMap.get(id) || 'Desconhecido'))
                    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));

                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>
                          <span
                            onClick={() => onDayClick?.(dateStr)}
                            className={cn(
                              'text-[11px] leading-5 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all',
                              isToday && 'bg-primary text-primary-foreground font-bold',
                              hasTraining && !isToday && 'bg-primary/20 text-primary font-semibold',
                            )}>
                            {day}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="font-semibold text-xs mb-1">{dayTrainings.length} treino{dayTrainings.length !== 1 ? 's' : ''}</p>
                          <div className="space-y-0.5">
                            {allStudentNames.map((name) => (
                              <p key={name} className="text-xs text-muted-foreground">• {name.split(' ')[0]}</p>
                            ))}
                          </div>
                          <p className="text-xs text-primary mt-1 font-medium">Clique para agendar</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <span key={day}
                      onClick={() => onDayClick?.(dateStr)}
                      className={cn(
                        'text-[11px] leading-5 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all',
                        isToday && 'bg-primary text-primary-foreground font-bold',
                      )}>
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export default function CalendarPage() {
  const { students } = useStudents();
  const { trainings, deleteTraining } = useTrainings();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<'week' | 'year'>('week');
  const [yearView, setYearView] = useState(today.getFullYear());
  const [newTrainingOpen, setNewTrainingOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | undefined>();
  const [editOpen, setEditOpen] = useState(false);

  const weekDates = useMemo(() => getWeekDatesArray(weekOffset), [weekOffset]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekStartDate = new Date(weekStart + 'T12:00:00');
  const weekLabel = `${getMonthName(weekStartDate.getMonth())} ${weekStartDate.getFullYear()}`;
  const weekNum = getWeekNumber(weekStart);

  const selectedTrainings = trainings.filter((t) => t.date === selectedDate);

  const goToToday = () => {
    setWeekOffset(0);
    setSelectedDate(todayStr);
  };

  const handleDeleteTraining = async (training: Training) => {
    await deleteTraining(training.id);
    toast({ title: 'Treino removido' });
  };

  const handleTrainingSaved = (date: string) => {
    const offset = getWeekOffsetForDate(date);
    setWeekOffset(offset);
    setSelectedDate(date);
    setViewMode('week');
  };

  const handleAnnualDayClick = (dateStr: string) => {
    const offset = getWeekOffsetForDate(dateStr);
    setWeekOffset(offset);
    setSelectedDate(dateStr);
    setViewMode('week');
    setNewTrainingOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">Calendário de Treinos</h1>
            <p className="text-muted-foreground mt-1">Gerencie a agenda de aulas</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setViewMode('week')}
                className={cn('px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5', viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <CalendarRange className="h-3.5 w-3.5" />Semana
              </button>
              <button onClick={() => setViewMode('year')}
                className={cn('px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5', viewMode === 'year' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <CalendarDays className="h-3.5 w-3.5" />Anual
              </button>
            </div>
            <Button className="btn-primary-gradient" onClick={() => setNewTrainingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Novo Treino
            </Button>
          </div>
        </div>

        <TrainingFormDialog open={newTrainingOpen} onOpenChange={setNewTrainingOpen} selectedDate={selectedDate} onSaved={handleTrainingSaved} />
        <TrainingFormDialog key={editingTraining?.id || 'new-edit'} open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingTraining(undefined); }} training={editingTraining} selectedDate={selectedDate} onSaved={handleTrainingSaved} />

        {viewMode === 'year' ? (
          /* Annual View */
          <div className="card-elevated p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" onClick={() => setYearView((y) => y - 1)}><ChevronLeft className="h-5 w-5" /></Button>
              <h2 className="font-display font-bold text-xl">{yearView}</h2>
              <Button variant="ghost" size="icon" onClick={() => setYearView((y) => y + 1)}><ChevronRight className="h-5 w-5" /></Button>
            </div>
            <AnnualCalendar year={yearView} trainings={trainings} students={students} onDayClick={handleAnnualDayClick} />
          </div>
        ) : (
          <>
            {/* Week Navigation */}
            <div className="card-elevated p-4">
              <div className="flex items-center justify-between mb-1">
                <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft className="h-5 w-5" /></Button>
                <div className="text-center">
                  <h2 className="font-display font-bold text-lg">{weekLabel}</h2>
                  <p className="text-xs text-muted-foreground">
                    Semana {weekNum} · {formatDate(weekStart)} — {formatDate(weekEnd)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight className="h-5 w-5" /></Button>
              </div>
              {weekOffset !== 0 && (
                <div className="text-center mb-2">
                  <button onClick={goToToday} className="text-xs text-primary font-medium hover:underline">Voltar para hoje</button>
                </div>
              )}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {weekDates.map((date) => {
                  const dayTrainings = trainings.filter((t) => t.date === date);
                  const isToday = date === todayStr;
                  const isSelected = date === selectedDate;
                  return (
                    <button key={date} onClick={() => setSelectedDate(date)}
                      className={cn('p-2 md:p-3 rounded-xl text-center transition-all',
                        isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                      <p className="text-xs font-medium opacity-70">{getDayName(date).slice(0, 3)}</p>
                      <p className="font-display font-bold text-lg md:text-xl">{formatDate(date).split('/')[0]}</p>
                      {dayTrainings.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-1">
                          {dayTrainings.slice(0, 3).map((t) => {
                            const period = getTimePeriod(t.time);
                            return <div key={t.id} className={cn('h-1.5 w-1.5 rounded-full', isSelected ? 'bg-white/70' : periodStyles[period])} />;
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day */}
            <div className="card-elevated p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg">{getDayName(selectedDate)}</h3>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium">
                  {selectedTrainings.length} treino{selectedTrainings.length !== 1 ? 's' : ''}
                </span>
              </div>

              {selectedTrainings.length > 0 ? (
                <div className="space-y-3">
                  {selectedTrainings.map((training) => {
                    const timePeriod = getTimePeriod(training.time);
                    const PeriodIcon = periodIcons[timePeriod];
                    const trainingStudents = students.filter((s) => training.studentIds.includes(s.id));
                    return (
                      <div key={training.id} className="p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg', periodStyles[timePeriod], 'text-white')}>
                              <PeriodIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <p className="font-semibold">{training.time} - {getEndTime(training.time)}</p>
                              </div>
                              <p className="text-sm text-muted-foreground capitalize">{timePeriod}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col sm:items-end gap-1 text-sm mr-2">
                              <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{training.location}</div>
                              <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" />{trainingStudents.length} aluno{trainingStudents.length !== 1 ? 's' : ''}</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { setEditingTraining(training); setEditOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover treino?</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza? Essa ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTraining(training)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex flex-wrap gap-2">
                            {trainingStudents.map((student) => {
                              const levelColors: Record<string, string> = {
                                iniciante: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                                intermediário: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                                avançado: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
                              };
                              return (
                                <span key={student.id} className={cn('px-2.5 py-1 rounded-full text-xs font-medium', levelColors[student.level] || 'bg-background')}>
                                  {student.name.split(' ')[0]} · <span className="capitalize">{student.level}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum treino agendado para este dia</p>
                  <Button className="mt-4" variant="outline" onClick={() => setNewTrainingOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Agendar treino
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
