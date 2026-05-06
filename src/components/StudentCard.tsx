import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Award, Pencil, Trash2, DollarSign, CalendarDays, MapPin, FileText, Beaker, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StudentForm } from '@/components/StudentForm';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useGroups } from '@/hooks/queries/useGroups';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import type { Student } from '@/data/mockData';
import { formatCurrency } from '@/lib/formatCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useModalities } from '@/hooks/queries/useModalities';

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
  const { modalities } = useModalities();
  const { trainings } = useTrainings();
  const { groups } = useGroups();
  const { labels, isArena } = useBusinessContext();
  const navigate = useNavigate();
  const modality = student.modalityId ? modalities.find(m => m.id === student.modalityId) : undefined;
  const plan = student.planId ? plans.find((p) => p.id === student.planId) : undefined;
  const studentGroups = groups.filter(g => student.groupIds?.includes(g.id));

  const today = new Date().toISOString().split('T')[0];

  // Find first training for this student (experimental or not)
  const firstTraining = trainings
    .filter(t => t.studentIds.includes(student.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];

  // Count future trainings that will be affected by deactivation
  const futureTrainingsCount = useMemo(
    () => trainings.filter(t => t.studentIds.includes(student.id) && t.date >= today).length,
    [trainings, student.id, today]
  );

  // Pro-rata visual calculation based on remaining days in the month
  const getProRataInfo = () => {
    if (!plan || plan.billingType !== 'monthly' || !student.joinDate) return null;
    
    const startDate = new Date(student.joinDate + 'T12:00:00');
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    
    // Check if start date is in the current month
    const now = new Date();
    if (startYear === now.getFullYear() && startMonth === now.getMonth() && startDay > 1) {
      const daysInMonth = new Date(startYear, startMonth + 1, 0).getDate();
      const remainingDays = daysInMonth - startDay + 1;
      const proRataAmount = Math.round(plan.price * (remainingDays / daysInMonth) * 100) / 100;
      
      return {
        remainingDays,
        daysInMonth,
        proRataAmount,
      };
    }
    return null;
  };
  const proRata = getProRataInfo();

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleDelete = async () => {
    // Clean up future trainings before deleting
    await supabase.rpc('cleanup_student_future_trainings', { p_student_id: student.id });
    
    await deleteStudent(student.id);
    toast({ title: 'Aluno removido', description: `${student.name} foi removido com sucesso.` });
  };

  const handleDeactivate = async () => {
    // Clean up future trainings
    await supabase.rpc('cleanup_student_future_trainings', { p_student_id: student.id });
    
    await updateStudent(student.id, { active: false });
    toast({
      title: 'Aluno desativado',
      description: futureTrainingsCount > 0
        ? `${student.name} foi desativado e removido de ${futureTrainingsCount} treino${futureTrainingsCount !== 1 ? 's' : ''} futuro${futureTrainingsCount !== 1 ? 's' : ''}.`
        : `${student.name} foi desativado.`,
    });
  };

  const handleReactivate = async () => {
    await updateStudent(student.id, { active: true });
    toast({ title: 'Aluno reativado', description: `${student.name} está ativo novamente. Agende novos treinos para ele.` });
  };

  const levelBorderColor = {
    iniciante: 'bg-emerald-500',
    intermediário: 'bg-amber-500',
    avançado: 'bg-violet-500',
  }[student.level] || 'bg-primary';

  const handleCardClick = () => {
    navigate(`/alunos/${student.id}`);
    if (onClick) onClick();
  };

  return (
    <div 
      className={cn('card-interactive relative overflow-hidden flex flex-col group h-full cursor-pointer', !student.active && 'opacity-60')}
      onClick={handleCardClick}
    >
      {/* Side color bar indicator for level */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5 transition-opacity', levelBorderColor, student.active ? 'opacity-100' : 'opacity-40')} />
      
      <div className="flex-1 p-4 pl-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-white font-display font-bold text-lg shrink-0 shadow-sm mt-0.5 overflow-hidden">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-display font-semibold text-foreground truncate block w-full">{student.name}</h3>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1.5">
                <div className="flex gap-1.5">
                  {!isArena && (
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border shrink-0', levelStyles[student.level])}>
                      {levelLabels[student.level]}
                    </span>
                  )}
                  {modality && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border border-primary/20 bg-primary/5 text-primary flex items-center gap-1.5 shrink-0"
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: modality.color }} />
                      {modality.name}
                    </span>
                  )}
                </div>
                {!student.active && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-destructive/10 text-destructive border border-destructive/20">Inativo</span>}
                {student.isTrial && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Beaker className="h-2.5 w-2.5" />Experimental
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-1 mt-1">
              <a href={`tel:${student.phone}`} className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary transition-colors w-full" onClick={(e) => e.stopPropagation()}>
                <Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{student.phone}</span>
              </a>
              <a href={`mailto:${student.email}`} className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary transition-colors w-full" onClick={(e) => e.stopPropagation()}>
                <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{student.email}</span>
              </a>
              {student.cpf && (
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">CPF: {student.cpf}</span>
                </div>
              )}
              {(student.city || student.state) && (
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{[student.city, student.state].filter(Boolean).join(' - ')}</span>
                </div>
              )}
              {studentGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {studentGroups.map(g => (
                    <span key={g.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-muted/10 truncate max-w-full" style={{ borderColor: `${g.color}40`, color: g.color }}>
                      <UsersRound className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{g.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {plan ? (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 w-fit px-2.5 py-1 rounded-md border border-primary/10">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-[150px]">{plan.name}</span> <span className="text-primary/40 mx-1">—</span> R$ {plan.price.toFixed(2)}{plan.billingType === 'per_session' ? `/${labels.trainingLabelSingular.toLowerCase()}` : '/mês'}
              </div>
            ) : student.planId ? (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 w-fit px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
                <span className="text-xs">🧪</span>
                <span className="truncate">{labels.trainingLabelSingular} Experimental</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 w-fit px-2.5 py-1 rounded-md border border-border">
                <span className="text-xs">📋</span>
                <span className="truncate">Sem {labels.planLabelSingular}</span>
              </div>
            )}
          </div>
        </div>

        {/* Join date & first training info */}
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
               <Award className="h-3.5 w-3.5 shrink-0 text-primary/70" />
               <span>Cadastro: <span className="font-medium text-foreground/80">{new Date(student.joinDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span></span>
            </div>
            {firstTraining && (
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span>1º treino: <span className="font-medium text-foreground/80">{new Date(firstTraining.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span></span>
              </div>
            )}
            {student.paymentDueDay && plan?.billingType === 'monthly' && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>Vencimento: <span className="font-semibold">Dia {student.paymentDueDay.toString().padStart(2, '0')}</span></span>
              </div>
            )}
          </div>
          
          {proRata && (
            <div className="mt-1 bg-primary/5 rounded-lg px-3 py-2.5 border border-primary/10 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                 <span className="font-medium text-primary">1º Mês Pro-rata ({proRata.remainingDays}/{proRata.daysInMonth} dias)</span>
                 <span className="font-bold text-primary">{formatCurrency(proRata.proRataAmount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Actions Footer */}
      <div className="bg-muted/30 border-t border-border/50 px-4 py-2.5 flex items-center justify-between gap-4" onClick={e => e.stopPropagation()}>
        {student.active ? (
          /* Desativar — with confirmation dialog */
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors px-2" onClick={(e) => e.stopPropagation()}>
                Desativar {labels.studentLabelSingular}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar {student.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {futureTrainingsCount > 0 ? (
                    <>
                      Ao desativar, <strong>{futureTrainingsCount} treino{futureTrainingsCount !== 1 ? 's' : ''} futuro{futureTrainingsCount !== 1 ? 's' : ''}</strong> ser{futureTrainingsCount !== 1 ? 'ão' : 'á'} removido{futureTrainingsCount !== 1 ? 's' : ''} do calendário.
                      {' '}Para reagendar, ative o(a) {labels.studentLabelSingular.toLowerCase()} novamente e crie novos treinos.
                    </>
                  ) : (
                    <>O(A) {labels.studentLabelSingular.toLowerCase()} será marcado(a) como inativo(a). Para reativá-lo(a), clique em "Ativar".</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate} className="bg-amber-600 text-white hover:bg-amber-700">
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          /* Ativar — simple button, no side effects */
          <Button variant="ghost" size="sm" className="h-7 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors px-2" onClick={(e) => { e.stopPropagation(); handleReactivate(); }}>
            Ativar {labels.studentLabelSingular}
          </Button>
        )}
        
        <div className="flex items-center gap-0.5">
          <StudentForm
            student={student}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" onClick={(e) => e.stopPropagation()}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover {student.name}? 
                  {futureTrainingsCount > 0 && (<> {futureTrainingsCount} treino{futureTrainingsCount !== 1 ? 's' : ''} futuro{futureTrainingsCount !== 1 ? 's' : ''} também ser{futureTrainingsCount !== 1 ? 'ão' : 'á'} removido{futureTrainingsCount !== 1 ? 's' : ''}.</>)}
                  {' '}Essa ação não pode ser desfeita.
                </AlertDialogDescription>
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
  );
}

