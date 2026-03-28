import { Phone, Mail, Award, Pencil, Trash2, DollarSign, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StudentForm } from '@/components/StudentForm';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import type { Student } from '@/data/mockData';

interface StudentCardProps {
  student: Student;
  onClick?: () => void;
}

const levelStyles = {
  iniciante: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  intermediário: 'bg-amber-100 text-amber-700 border-amber-200',
  avançado: 'bg-violet-100 text-violet-700 border-violet-200',
};

const levelLabels = {
  iniciante: 'Iniciante',
  intermediário: 'Intermediário',
  avançado: 'Avançado',
};

export function StudentCard({ student, onClick }: StudentCardProps) {
  const { deleteStudent, updateStudent } = useStudents();
  const { plans } = usePlans();
  const { trainings } = useTrainings();
  const plan = student.planId ? plans.find((p) => p.id === student.planId) : undefined;

  // Find first training for this student (experimental or not)
  const firstTraining = trainings
    .filter(t => t.studentIds.includes(student.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];

  // Pro-rata calculation based on remaining weeks in the month
  // Rule: if first training was in the last week of previous month OR first week (days 1-7)
  // of current month → full price. Pro-rata only applies after week 1.
  const getProRataInfo = () => {
    if (!plan || plan.billingType !== 'monthly') return null;
    
    const refDate = firstTraining?.date || student.joinDate;
    const startDate = new Date(refDate + 'T12:00:00');
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    
    // Check if the first training was in the last week of the previous month
    const daysInPrevMonth = new Date(startYear, startMonth, 0).getDate();
    const prevMonthLastWeekStart = daysInPrevMonth - 6; // last 7 days
    
    // If experimental was end of previous month, first paid month = next month = full price
    // We detect this by checking: if the student has no plan yet during that training, skip
    // For display purposes: if start is in first week (1-7), pay full
    if (startDay <= 7) return null;
    
    // Calculate weeks remaining in the month
    const daysInMonth = new Date(startYear, startMonth + 1, 0).getDate();
    const totalWeeks = Math.ceil(daysInMonth / 7);
    
    // Which week of the month is the start? (1-indexed)
    const startWeek = Math.ceil(startDay / 7);
    const remainingWeeks = totalWeeks - startWeek + 1;
    
    // Weekly rate based on plan price
    const weeklyRate = plan.price / totalWeeks;
    const proRataAmount = Math.round(weeklyRate * remainingWeeks * 100) / 100;
    
    return {
      startDay,
      daysInMonth,
      totalWeeks,
      remainingWeeks,
      proRataAmount,
      weeklyRate: Math.round(weeklyRate * 100) / 100,
      refDate,
      planPrice: plan.price,
      sessionsPerWeek: plan.sessionsPerWeek,
    };
  };
  const proRata = getProRataInfo();

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleDelete = async () => {
    await deleteStudent(student.id);
    toast({ title: 'Aluno removido', description: `${student.name} foi removido com sucesso.` });
  };

  const handleToggleActive = async () => {
    await updateStudent(student.id, { active: !student.active });
    toast({ title: student.active ? 'Aluno desativado' : 'Aluno reativado', description: `${student.name} foi ${student.active ? 'desativado' : 'reativado'}.` });
  };

  return (
    <div className={cn('card-interactive p-4 group', !student.active && 'opacity-60')}>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-hero text-white font-display font-bold text-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-display font-semibold text-foreground truncate">{student.name}</h3>
              {!student.active && <span className="text-xs text-destructive font-medium">Inativo</span>}
            </div>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0', levelStyles[student.level])}>
              {levelLabels[student.level]}
            </span>
          </div>
          <div className="space-y-1.5">
            <a href={`tel:${student.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
              <Phone className="h-3.5 w-3.5" />{student.phone}
            </a>
            <a href={`mailto:${student.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors truncate" onClick={(e) => e.stopPropagation()}>
              <Mail className="h-3.5 w-3.5" /><span className="truncate">{student.email}</span>
            </a>
          </div>
          {plan ? (
            <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
              <DollarSign className="h-3.5 w-3.5" />
              {plan.name} — R$ {plan.price.toFixed(2)}{plan.billingType === 'per_session' ? '/treino' : '/mês'}
            </div>
          ) : student.planId ? (
            <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <span className="text-xs">🧪</span>
              Aula Experimental
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <span className="text-xs">📋</span>
              Sem Plano
            </div>
          )}
        </div>
      </div>

      {/* Join date & first training info */}
      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            <span>Cadastro: {new Date(student.joinDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          </div>
          {firstTraining && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>1º treino: {new Date(firstTraining.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>
        {proRata && (
          <div className="bg-accent/50 rounded-lg px-3 py-2 text-xs">
            <span className="font-medium text-foreground">Pro-rata ({proRata.remainingWeeks}/{proRata.totalWeeks} semanas): </span>
            <span className="text-muted-foreground">
              R$ {proRata.planPrice.toFixed(2)} ÷ {proRata.totalWeeks} sem. × {proRata.remainingWeeks} sem. = <span className="font-semibold text-primary">R$ {proRata.proRataAmount.toFixed(2)}</span>
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleToggleActive(); }}>
            {student.active ? 'Desativar' : 'Ativar'}
          </Button>
          <StudentForm
            student={student}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza que deseja remover {student.name}? Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        </div>
      </div>
    </div>
  );
}
