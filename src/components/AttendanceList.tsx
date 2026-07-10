/* eslint-disable @typescript-eslint/no-explicit-any */
import { Check, X, Clock, MapPin, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getDayName, formatDate, getEndTime, getTimePeriod } from '@/data/mockData';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useStudents } from '@/hooks/queries/useStudents';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface AttendanceListProps {
  selectedDate?: string;
}

const periodStyles = {
  manhã: 'badge-morning',
  tarde: 'badge-afternoon',
  noite: 'badge-evening',
};

function AttendanceRow({ 
  student, 
  training, 
  activeDate, 
  disabled, 
  status, 
  attDetail, 
  setAttendanceStatus 
}: { 
  student: any; 
  training: any; 
  activeDate: string; 
  disabled: boolean; 
  status: 'presente' | 'falta' | 'justificada' | undefined; 
  attDetail: any; 
  setAttendanceStatus: any; 
}) {
  const [justificationNotes, setJustificationNotes] = useState(attDetail?.justificationNotes || '');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleJustify = async () => {
    await setAttendanceStatus({ 
      trainingId: training.id, 
      studentId: student.id, 
      date: activeDate, 
      status: 'justificada', 
      justificationNotes 
    });
    setPopoverOpen(false);
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-display font-semibold text-sm">
          {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className={cn("font-medium", disabled && "text-muted-foreground/60")}>{student.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground capitalize">{student.level}</span>
            {status === 'justificada' && attDetail?.justificationNotes && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                Motivo: {attDetail.justificationNotes}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm"
          disabled={disabled}
          onClick={() => setAttendanceStatus({ trainingId: training.id, studentId: student.id, date: activeDate, status: 'presente' })}
          className={cn('transition-all h-8 w-8 p-0', status === 'presente' && 'bg-success text-success-foreground border-success hover:bg-success/90')}>
          <Check className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm"
          disabled={disabled}
          onClick={() => setAttendanceStatus({ trainingId: training.id, studentId: student.id, date: activeDate, status: 'falta' })}
          className={cn('transition-all h-8 w-8 p-0', status === 'falta' && 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90')}>
          <X className="h-4 w-4" />
        </Button>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"
              disabled={disabled}
              className={cn('transition-all h-8 w-8 p-0', status === 'justificada' && 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600')}>
              <AlertCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 shadow-xl border-border bg-card" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Justificar Ausência</h4>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Observação (Ex: Doença, Viagem)</label>
                <Input 
                  placeholder="Digite o motivo..." 
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      await handleJustify();
                    }
                  }}
                  className="h-9"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setPopoverOpen(false)}>Cancelar</Button>
                  <Button size="sm" className="btn-primary-gradient text-white" onClick={handleJustify}>Confirmar</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function AttendanceList({ selectedDate }: AttendanceListProps) {
  const { trainings } = useTrainings();
  const { students } = useStudents();
  const { getAttendanceStatus, getAttendanceDetail, setAttendanceStatus } = useAttendance();
  const { labels } = useBusinessContext();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const activeDate = selectedDate || today;

  const dayTrainings = trainings.filter((t) => t.date === activeDate);

  if (dayTrainings.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={(
          <span className="text-lg font-medium text-foreground">
            Sem {labels.trainingLabel.toLowerCase()} para esta data
          </span>
        )}
        description={`${getDayName(activeDate)}, ${formatDate(activeDate)}`}
        variant="outlined"
        className="card-elevated p-8"
      />
    );
  }

  return (
    <div className="space-y-4">
      {dayTrainings.map((training) => {
        const trainingStudents = students.filter((s) => training.studentIds.includes(s.id));
        const timePeriod = getTimePeriod(training.time);

        return (
          <div key={training.id} className={cn("card-elevated overflow-hidden", training.cancelled && "opacity-85")}>
            <div className={cn("p-4 border-b border-border/30", training.cancelled ? "bg-slate-100 dark:bg-slate-900" : "bg-gradient-beach")}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('badge-period', periodStyles[timePeriod])}>{timePeriod}</span>
                    <span className="text-sm font-medium">{training.time} - {getEndTime(training.time, training.durationMinutes)}</span>
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

            {training.cancelled && (
              <div className="p-4 bg-destructive/10 border-b border-destructive/20 text-destructive flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Treino Cancelado</p>
                  <p className="text-xs opacity-90 mt-0.5">
                    Motivo: <span className="font-semibold capitalize">{
                      training.cancellationReason === 'holiday' ? 'Feriado' :
                      training.cancellationReason === 'weather' ? 'Chuva / Clima' :
                      training.cancellationReason === 'coach_absence' ? 'Falta do Professor' : 'Outro Motivo'
                    }</span>
                    {training.cancellationNotes && ` — "${training.cancellationNotes}"`}
                  </p>
                </div>
              </div>
            )}

            <div className="divide-y divide-border/30">
              {trainingStudents.map((student) => {
                const attDetail = getAttendanceDetail(training.id, student.id);
                const status = attDetail ? (attDetail.present ? 'presente' : (attDetail.justified ? 'justificada' : 'falta')) : undefined;

                return (
                  <AttendanceRow 
                    key={student.id}
                    student={student}
                    training={training}
                    activeDate={activeDate}
                    disabled={!!training.cancelled}
                    status={status}
                    attDetail={attDetail}
                    setAttendanceStatus={setAttendanceStatus}
                  />
                );
              })}
            </div>

            <div className="p-4 bg-muted/30 border-t border-border/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {trainingStudents.length} {labels.studentLabelSingular.toLowerCase()}{trainingStudents.length !== 1 ? 's' : ''} agendado{trainingStudents.length !== 1 ? 's' : ''}
                </span>
                <span className="text-success font-medium">
                  <Check className="h-3.5 w-3.5 inline mr-1" />
                  {trainingStudents.filter((s) => getAttendanceStatus(training.id, s.id) === true).length} presente{trainingStudents.filter((s) => getAttendanceStatus(training.id, s.id) === true).length !== 1 ? 's' : ''}
                  {trainingStudents.filter((s) => getAttendanceDetail(training.id, s.id)?.justified === true).length > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-3">
                      <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                      {trainingStudents.filter((s) => getAttendanceDetail(training.id, s.id)?.justified === true).length} justificada{trainingStudents.filter((s) => getAttendanceDetail(training.id, s.id)?.justified === true).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
