import { Check, X, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getDayName, formatDate, getEndTime, getTimePeriod } from '@/data/mockData';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useStudents } from '@/hooks/queries/useStudents';
import { useAttendance } from '@/hooks/queries/useAttendance';

interface AttendanceListProps {
  selectedDate?: string;
}

const periodStyles = {
  manhã: 'badge-morning',
  tarde: 'badge-afternoon',
  noite: 'badge-evening',
};

export function AttendanceList({ selectedDate }: AttendanceListProps) {
  const { trainings } = useTrainings();
  const { students } = useStudents();
  const { toggleAttendance, getAttendanceStatus } = useAttendance();
  const today = new Date().toISOString().split('T')[0];
  const activeDate = selectedDate || today;

  const dayTrainings = trainings.filter((t) => t.date === activeDate);

  if (dayTrainings.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-lg font-medium text-muted-foreground">Sem treinos para esta data</p>
        <p className="text-sm text-muted-foreground/70 mt-1">{getDayName(activeDate)}, {formatDate(activeDate)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dayTrainings.map((training) => {
        const trainingStudents = students.filter((s) => training.studentIds.includes(s.id));
        const timePeriod = getTimePeriod(training.time);

        return (
          <div key={training.id} className="card-elevated overflow-hidden">
            <div className="p-4 bg-gradient-beach border-b border-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('badge-period', periodStyles[timePeriod])}>{timePeriod}</span>
                    <span className="text-sm font-medium">{training.time} - {getEndTime(training.time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />{training.location}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold">{getDayName(training.date)}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(training.date)}</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/30">
              {trainingStudents.map((student) => {
                const isPresent = getAttendanceStatus(training.id, student.id);

                return (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-display font-semibold text-sm">
                        {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{student.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => toggleAttendance(training.id, student.id, activeDate)}
                        className={cn('transition-all', isPresent === true && 'bg-success text-success-foreground border-success hover:bg-success/90')}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => toggleAttendance(training.id, student.id, activeDate)}
                        className={cn('transition-all', isPresent === false && 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90')}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-muted/30 border-t border-border/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {trainingStudents.length} aluno{trainingStudents.length > 1 ? 's' : ''} agendado{trainingStudents.length > 1 ? 's' : ''}
                </span>
                <span className="text-success font-medium">
                  <Check className="h-3.5 w-3.5 inline mr-1" />
                  {trainingStudents.filter((s) => getAttendanceStatus(training.id, s.id) === true).length} presente{trainingStudents.filter((s) => getAttendanceStatus(training.id, s.id) === true).length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
