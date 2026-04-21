import { useMemo } from 'react';
import { AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePayments } from '@/hooks/queries/usePayments';
import { useStudents } from '@/hooks/queries/useStudents';
import { formatCurrency } from '@/lib/formatCurrency';

interface OverdueAlertProps {
  privacyMode?: boolean;
}

export function OverdueAlert({ privacyMode = false }: OverdueAlertProps) {
  const { payments } = usePayments();
  const { students } = useStudents();
  const today = new Date().toISOString().split('T')[0];

  const overduePayments = useMemo(
    () => payments.filter((p) => !p.paid && p.dueDate < today),
    [payments, today]
  );

  const overdueStudentIds = useMemo(
    () => new Set(overduePayments.map((p) => p.studentId)),
    [overduePayments]
  );

  const totalOverdue = overduePayments.reduce((s, p) => s + p.amount, 0);

  if (overduePayments.length === 0 || privacyMode) return null;

  return (
    <Link
      to="/pagamentos"
      className="block animate-fade-up rounded-xl border border-destructive/30 bg-destructive/5 p-4 md:p-5 hover:bg-destructive/10 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-destructive">
              Pagamentos Atrasados
            </h3>
            <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Gerenciar <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{privacyMode ? '••••' : overdueStudentIds.size}</span> aluno{overdueStudentIds.size !== 1 ? 's' : ''} com{' '}
            <span className="font-semibold text-foreground">{privacyMode ? '••••' : overduePayments.length}</span> pagamento{overduePayments.length !== 1 ? 's' : ''} pendente{overduePayments.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-destructive font-semibold">
              <DollarSign className="h-4 w-4" />
              {privacyMode ? '••••' : formatCurrency(totalOverdue)}
            </div>
            {!privacyMode && (
              <div className="flex flex-wrap gap-1">
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
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
