import { MapPin, Users, Clock, Sun, Sunset, Moon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useStudents } from '@/hooks/queries/useStudents';
import { getDayName, formatDate, getEndTime, getTimePeriod } from '@/data/mockData';

const periodIcons = { manhã: Sun, tarde: Sunset, noite: Moon };

export function TodaySchedule() {
  const { trainings, loadingTrainings } = useTrainings();
  const { students } = useStudents();
  
  const today = new Date().toISOString().split('T')[0];
  const todayTrainings = trainings.filter(t => t.date === today).sort((a, b) => a.time.localeCompare(b.time));

  if (loadingTrainings) return <div className="card-elevated p-6 animate-pulse bg-muted/20 h-[300px] rounded-2xl"></div>;

  return (
    <div className="card-elevated p-5 md:p-6 flex flex-col h-full bg-card/50 backdrop-blur-sm border-primary/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title text-xl mb-1">Agenda de Hoje</h2>
          <p className="text-sm text-muted-foreground capitalize">{getDayName(today)}, {formatDate(today)}</p>
        </div>
        <Button variant="outline" size="sm" asChild className="hidden sm:flex group bg-background">
          <a href="/calendario">
            Semana Completa <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </Button>
      </div>

      <div className="space-y-4 flex-1">
        {todayTrainings.length > 0 ? (
          todayTrainings.map(training => {
            const timePeriod = getTimePeriod(training.time);
            const PeriodIcon = periodIcons[timePeriod];
            const trainingStudents = students.filter(s => training.studentIds.includes(s.id));

            return (
              <div key={training.id} className="relative overflow-hidden rounded-xl bg-background border border-border/50 hover:border-primary/40 shadow-sm transition-all group p-4 md:p-5">
                {/* Decorative left accent */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1", 
                  timePeriod === 'manhã' ? 'bg-amber-400' : timePeriod === 'tarde' ? 'bg-orange-500' : 'bg-indigo-500'
                )} />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 font-bold uppercase tracking-wider", 
                        timePeriod === 'manhã' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 
                        timePeriod === 'tarde' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 
                        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                      )}>
                        <PeriodIcon className="h-3 w-3" /> {timePeriod}
                      </div>
                      <div className="flex items-center gap-1.5 text-base font-bold text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        {training.time} - {getEndTime(training.time)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> <span className="truncate max-w-[200px] font-medium">{training.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 bg-muted/40 sm:bg-transparent px-3 py-2 sm:p-0 rounded-lg border sm:border-0 border-border/30">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" /> <span className="font-semibold text-foreground">{trainingStudents.length}</span><span className="hidden sm:inline"> alunos</span>
                    </div>
                    <div className="flex items-center -space-x-1.5 pl-3 border-l border-border/50">
                      {trainingStudents.slice(0, 4).map(s => {
                        const lc: Record<string, string> = { iniciante: 'bg-emerald-500', intermediário: 'bg-amber-500', avançado: 'bg-violet-500' };
                        return <div key={s.id} className={cn('h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm', lc[s.level] || 'bg-slate-500')} title={`${s.name} - ${s.level}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                      })}
                      {trainingStudents.length > 4 && (
                         <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            +{trainingStudents.length - 4}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Sun className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-foreground font-semibold text-lg">Nenhum treino hoje</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">Aproveite o dia livre ou crie novos agendamentos no calendário.</p>
          </div>
        )}
      </div>
      
      <Button variant="outline" className="w-full mt-6 sm:hidden bg-background" asChild>
        <a href="/calendario">Ver agenda completa</a>
      </Button>
    </div>
  );
}
