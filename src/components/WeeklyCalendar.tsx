import { useState, useMemo } from 'react';
import { Calendar, MapPin, Users, Sun, Sunset, Moon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getDayName,
  formatDate,
  getWeekDatesArray,
  getEndTime,
  getTimePeriod,
  getMonthName,
  getWeekNumber,
} from '@/data/mockData';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useStudents } from '@/hooks/queries/useStudents';

const periodIcons = {
  manhã: Sun,
  tarde: Sunset,
  noite: Moon,
};

const periodStyles = {
  manhã: 'badge-morning',
  tarde: 'badge-afternoon',
  noite: 'badge-evening',
};

export function WeeklyCalendar() {
  const { trainings } = useTrainings();
  const { students } = useStudents();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => getWeekDatesArray(weekOffset), [weekOffset]);
  const today = new Date().toISOString().split('T')[0];

  const weekStart = weekDates[0];
  const weekStartDate = new Date(weekStart + 'T12:00:00');
  const weekLabel = `${getMonthName(weekStartDate.getMonth())} ${weekStartDate.getFullYear()}`;
  const weekNum = getWeekNumber(weekStart);

  return (
    <div className="card-elevated p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <h2 className="section-title text-xl">{weekLabel}</h2>
            <p className="text-xs text-muted-foreground">Semana {weekNum} · {formatDate(weekDates[0])} — {formatDate(weekDates[6])}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-primary font-medium hover:underline mr-2">Hoje</button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="space-y-3">
        {weekDates.map((date, index) => {
          const dayTrainings = trainings.filter((t) => t.date === date);
          const isToday = date === today;
          const isPast = date < today;

          return (
            <div key={date}
              className={cn(
                'rounded-xl border transition-all duration-200',
                isToday ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : isPast ? 'border-border/30 bg-muted/30' : 'border-border/50 bg-card hover:border-primary/30',
                'animate-fade-up opacity-0', `stagger-${Math.min(index + 1, 4)}`
              )}
              style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl font-display text-lg font-bold', isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {formatDate(date).split('/')[0]}
                  </div>
                  <div>
                    <p className={cn('font-display font-semibold', isToday && 'text-primary')}>{getDayName(date)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
                  </div>
                </div>
                {isToday && <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Hoje</span>}
                {dayTrainings.length > 0 && (
                  <span className="text-sm font-medium text-muted-foreground">{dayTrainings.length} treino{dayTrainings.length > 1 ? 's' : ''}</span>
                )}
              </div>

              {dayTrainings.length > 0 ? (
                <div className="p-3 md:p-4 space-y-2">
                  {dayTrainings.map((training) => {
                    const timePeriod = getTimePeriod(training.time);
                    const PeriodIcon = periodIcons[timePeriod];
                    const trainingStudents = students.filter((s) => training.studentIds.includes(s.id));

                    return (
                      <div key={training.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-background/80 border border-border/30">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={periodStyles[timePeriod]}>
                            <PeriodIcon className="h-3 w-3 inline mr-1" />{timePeriod}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {training.time} - {getEndTime(training.time, training.durationMinutes)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]">{training.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" /><span>{trainingStudents.length}</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-1">
                            {trainingStudents.slice(0, 4).map((s) => {
                              const lc: Record<string, string> = { iniciante: 'bg-emerald-500', intermediário: 'bg-amber-500', avançado: 'bg-violet-500' };
                              return <span key={s.id} className={cn('h-2 w-2 rounded-full', lc[s.level] || 'bg-muted')} title={`${s.name} - ${s.level}`} />;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">Sem treinos agendados</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
