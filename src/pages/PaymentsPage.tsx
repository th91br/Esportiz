import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { usePayments } from '@/hooks/queries/usePayments';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { formatCurrency } from '@/lib/formatCurrency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, DollarSign, AlertTriangle, Clock, TrendingUp, Eye, EyeOff, Percent, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/exportUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function PaymentsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const { payments, generateMonthlyPayments, markAsPaid, markAsUnpaid, deletePayment, loadingPayments } = usePayments();
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const monthRef = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const todayStr = now.toLocaleDateString('en-CA');

  // Month reference using local time
  const currentMonthRef = now.toLocaleDateString('en-CA').slice(0, 7);

  useEffect(() => {
    if (!loadingPayments && monthRef !== currentMonthRef) {
      generateMonthlyPayments(monthRef);
    }
  }, [monthRef, loadingPayments, currentMonthRef]);

  const monthPayments = payments.filter(p => p.monthRef === monthRef);

  const getStatus = (p: typeof monthPayments[0]): 'paid' | 'pending' | 'overdue' => {
    if (p.paid) return 'paid';
    return p.dueDate < todayStr ? 'overdue' : 'pending';
  };

  const totalAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = monthPayments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const totalPending = totalAmount - totalPaid;
  const overdueCount = monthPayments.filter(p => getStatus(p) === 'overdue').length;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Pagamentos</h1>
            <p className="text-sm text-muted-foreground">Controle de pagamentos mensais dos alunos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const exportData = monthPayments.map(p => {
                  const student = students.find(s => s.id === p.userId);
                  return {
                    'Aluno': student?.name || 'Aluno Desconhecido',
                    'Status': getStatus(p) === 'paid' ? 'Pago' : getStatus(p) === 'overdue' ? 'Atrasado' : 'Pendente',
                    'Valor (R$)': p.amount.toFixed(2).replace('.', ','),
                    'Referência': p.monthRef,
                    'Vencimento': new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
                    'Data de Pagamento': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('pt-BR') : '',
                  };
                });
                exportToCSV(exportData, `Pagamentos_${monthRef}`);
              }}
              disabled={loadingPayments || monthPayments.length === 0}
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={togglePrivacyMode}
              title={privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthNames.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" /> Total do mês
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{privacyMode ? '••••' : formatCurrency(totalAmount)}</p>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 text-sm mb-1 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" /> Recebido
            </div>
            <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{privacyMode ? '••••' : formatCurrency(totalPaid)}</p>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 text-sm mb-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" /> Pendente
            </div>
            <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">{privacyMode ? '••••' : formatCurrency(totalPending)}</p>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 text-sm mb-1 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Atrasados
            </div>
            <p className="font-display text-2xl font-bold text-destructive">{privacyMode ? '••••' : overdueCount}</p>
          </div>
        </div>

        {/* Payment list */}
        {monthPayments.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display font-semibold text-lg text-foreground">Nenhum pagamento para {monthNames[selectedMonth - 1]}/{selectedYear}</h3>
            <p className="text-sm text-muted-foreground mt-1">Alunos com plano mensal e dia de vencimento definido aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...monthPayments]
              .sort((a, b) => {
                const nameA = students.find(s => s.id === a.studentId)?.name || '';
                const nameB = students.find(s => s.id === b.studentId)?.name || '';
                return nameA.localeCompare(nameB, 'pt-BR');
              })
              .map(payment => {
              const student = students.find(s => s.id === payment.studentId);
              const plan = plans.find(p => p.id === payment.planId);
              const status = getStatus(payment);
              if (!student) return null;

              return (
                <div key={payment.id} className="card-elevated p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{student.name}</span>
                      <Badge
                        className={cn(
                          'text-xs',
                          status === 'paid' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                          status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                          status === 'overdue' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
                        )}
                      >
                        {status === 'paid' ? '✓ Pago' : status === 'pending' ? '⏳ Pendente' : '⚠ Atrasado'}
                      </Badge>
                      {payment.isProrata && (
                        <Badge className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                          <Percent className="h-3 w-3 mr-0.5" /> Pro-rata
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{plan?.name || 'Plano removido'}</span>
                      {payment.isProrata && payment.fullPrice ? (
                        <span>
                          <span className="line-through opacity-60">{formatCurrency(payment.fullPrice)}</span>
                          {' → '}
                          <span className="font-semibold text-primary">{formatCurrency(payment.amount)}</span>
                        </span>
                      ) : (
                        <span>{formatCurrency(payment.amount)}</span>
                      )}
                      <span>Vence: {new Date(payment.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      {payment.paid && payment.paidAt && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Pago em: {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {payment.paid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => markAsUnpaid(payment.id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Desmarcar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="btn-primary-gradient"
                        onClick={() => markAsPaid(payment.id)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Marcar Pago
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja excluir o pagamento de {student.name} ({monthNames[selectedMonth - 1]}/{selectedYear})? Você pode regenerá-lo depois.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePayment(payment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
