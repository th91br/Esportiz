import { reportError } from '@/lib/observability';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppPage } from '@/components/layout/AppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { IconDialogTitle } from '@/components/layout/IconDialogTitle';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { usePayments } from '@/hooks/queries/usePayments';
import { PAYMENT_METHOD_LABELS, useReservations, type Reservation } from '@/hooks/queries/useReservations';
import { useCourts } from '@/hooks/queries/useCourts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { formatCurrency } from '@/lib/formatCurrency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { ArenaPartialPaymentDialog } from '@/components/arena/ArenaPartialPaymentDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, DollarSign, AlertTriangle, Clock, TrendingUp, Eye, EyeOff, Percent, Trash2, Download, Search, CalendarDays, RotateCcw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/exportUtils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter
} from '@/components/ui/dialog';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { getLocalTodayDate, getMonthNamePtBr } from '@/lib/dateUtils';
import {
  getPaymentFinancialStatus,
  summarizePayments,
  summarizeReservationReceivables,
} from '@/lib/financialContracts';

const monthOptions = Array.from({ length: 12 }, (_, index) => getMonthNamePtBr(index));

export default function PaymentsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const { payments, cancelledPayments, generateMonthlyPayments, markAsPaid, markAsUnpaid, markBatchAsPaid, markBatchAsUnpaid, deletePayment, restorePayment, loadingPayments } = usePayments();
  const { reservations, setReservationPaymentStatus } = useReservations();
  const { courts } = useCourts();
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();
  const [searchTerm, setSearchTerm] = useState('');
  const { labels, isArena } = useBusinessContext();
  const rolePermissions = useRolePermissions();
  const canExportPayments = rolePermissions.can('payments', 'export');
  const canReceivePayments = rolePermissions.can('payments', 'receive_payment');
  const canReopenPayments = rolePermissions.can('payments', 'reopen_payment');
  const canDeletePayments = rolePermissions.can('payments', 'delete');
  
  const [receivingPayment, setReceivingPayment] = useState<typeof payments[0] | null>(null);
  const [receiptAmount, setReceiptAmount] = useState<string>('');
  
  // Tab selector for Arena mode: 'pacotes' (monthly plans) vs 'reservas' (single court rentals)
  const [activeSubTab, setActiveSubTab] = useState<'pacotes' | 'reservas'>('pacotes');

  // Seleção em lote (Batch Payments)
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  
  // Arena Payment Dialog State
  const [arenaPaymentDialogRes, setArenaPaymentDialogRes] = useState<Reservation | null>(null);

  useEffect(() => {
    setSelectedPayments([]);
  }, [searchTerm, activeSubTab]);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const monthRef = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const todayStr = getLocalTodayDate();

  // Month reference using local time
  const currentMonthRef = todayStr.slice(0, 7);

  // Guarda quais meses já foram gerados nesta sessão para evitar loop se apagar pagamento
  const generatedMonthsRef = useRef<Set<string>>(new Set([currentMonthRef]));

  useEffect(() => {
    if (!loadingPayments && monthRef !== currentMonthRef && !generatedMonthsRef.current.has(monthRef)) {
      generatedMonthsRef.current.add(monthRef);
      generateMonthlyPayments(monthRef);
    }
  }, [monthRef, loadingPayments, currentMonthRef, generateMonthlyPayments]);

  // --- Monthly Payments (Pacotes) filtering ---
  const monthPayments = useMemo(() => {
    return payments.filter(p => p.monthRef === monthRef);
  }, [payments, monthRef]);

  const monthCancelledPayments = useMemo(() => {
    return cancelledPayments.filter(p => p.monthRef === monthRef);
  }, [cancelledPayments, monthRef]);

  const filteredPayments = useMemo(() => {
    return monthPayments
      .filter(p => {
        const student = students.find(s => s.id === p.studentId);
        if (!student) return false;
        return student.name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const nameA = students.find(s => s.id === a.studentId)?.name || '';
        const nameB = students.find(s => s.id === b.studentId)?.name || '';
        return nameA.localeCompare(nameB, 'pt-BR');
      });
  }, [monthPayments, students, searchTerm]);

  const filteredCancelledPayments = useMemo(() => {
    return monthCancelledPayments
      .filter(p => {
        const student = students.find(s => s.id === p.studentId);
        if (!student) return false;
        return student.name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const nameA = students.find(s => s.id === a.studentId)?.name || '';
        const nameB = students.find(s => s.id === b.studentId)?.name || '';
        return nameA.localeCompare(nameB, 'pt-BR');
      });
  }, [monthCancelledPayments, students, searchTerm]);


  const handleSelectAll = () => {
    if (selectedPayments.length === filteredPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(filteredPayments.map(p => p.id));
    }
  };

  const toggleSelectPayment = (id: string) => {
    setSelectedPayments(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // --- Reservations filtering split by type ---
  const monthAllReservations = useMemo(() => {
    return reservations.filter(r => r.date.startsWith(monthRef) && r.status !== 'cancelled');
  }, [reservations, monthRef]);

  // Locações Avulsas: only non-monthly reservations
  const monthAvulsaReservations = useMemo(() => {
    return monthAllReservations.filter(r => r.reservationType === 'avulsa');
  }, [monthAllReservations]);

  // Mensalistas da Arena: monthly court reservations
  const monthMensalistaReservations = useMemo(() => {
    return monthAllReservations.filter(r => r.reservationType === 'mensalista');
  }, [monthAllReservations]);


  const filteredReservations = useMemo(() => {
    return monthAvulsaReservations
      .filter(r => {
        const student = students.find(s => s.id === r.reservanteIds[0]);
        const reservanteName = student?.name || r.notes || 'Reserva Avulsa';
        return reservanteName.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
  }, [monthAvulsaReservations, students, searchTerm]);

  const filteredMensalistaReservations = useMemo(() => {
    return monthMensalistaReservations
      .filter(r => {
        const student = students.find(s => s.id === r.reservanteIds[0]);
        const reservanteName = student?.name || r.notes || 'Mensalista';
        return reservanteName.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
  }, [monthMensalistaReservations, students, searchTerm]);

  const getStatus = useCallback((p: typeof monthPayments[0]): 'paid' | 'pending' | 'overdue' => {
    return getPaymentFinancialStatus(p, todayStr);
  }, [todayStr]);

  // --- Dynamic Stats calculation depending on active sub-tab ---
  const showReservationsTab = isArena && activeSubTab === 'reservas';

  const paymentSummary = useMemo(() => summarizePayments(monthPayments, todayStr), [monthPayments, todayStr]);
  const avulsaReservationSummary = useMemo(
    () => summarizeReservationReceivables(monthAvulsaReservations, todayStr),
    [monthAvulsaReservations, todayStr],
  );
  const mensalistaReservationSummary = useMemo(
    () => summarizeReservationReceivables(monthMensalistaReservations, todayStr),
    [monthMensalistaReservations, todayStr],
  );
  // For the pacotes tab, combine monthly plan payments + mensalista reservations
  const combinedPacotesSummary = useMemo(() => ({
    totalAmount: paymentSummary.totalAmount + mensalistaReservationSummary.totalAmount,
    totalPaid: paymentSummary.totalPaid + mensalistaReservationSummary.totalPaid,
    totalPending: paymentSummary.totalPending + mensalistaReservationSummary.totalPending,
    overdueCount: paymentSummary.overdueCount + mensalistaReservationSummary.overdueCount,
  }), [paymentSummary, mensalistaReservationSummary]);
  const activeSummary = showReservationsTab ? avulsaReservationSummary : combinedPacotesSummary;
  const totalAmount = activeSummary.totalAmount;
  const totalPaid = activeSummary.totalPaid;
  const totalPending = activeSummary.totalPending;
  const overdueCount = activeSummary.overdueCount;

  // Computed after mensalista reservations are available
  const hasMonthlyPaymentRecords = monthPayments.length > 0 || monthCancelledPayments.length > 0 || monthMensalistaReservations.length > 0;
  const hasFilteredPaymentRecords = filteredPayments.length > 0 || filteredCancelledPayments.length > 0 || filteredMensalistaReservations.length > 0;

  const handleToggleReservationPayment = async (reservation: typeof reservations[0]) => {
    try {
      const newStatus = reservation.paymentStatus === 'paid' ? 'pending' : 'paid';
      await setReservationPaymentStatus({
        id: reservation.id,
        paymentStatus: newStatus,
        paymentMethod: reservation.paymentMethod,
      });
      toast.success(`Pagamento da reserva marcado como ${newStatus === 'paid' ? 'Pago' : 'Pendente'}!`);
    } catch (err: unknown) {
      reportError('payments.reservation_status_update_failed', err);
    }
  };


  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <AppPage>
      <PageHeader
        title="Pagamentos"
        description={`Controle de pagamentos mensais dos(as) ${labels.studentLabel.toLowerCase()}`}
        actions={(
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {canExportPayments && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              onClick={() => {
                const exportData = monthPayments.map(p => {
                  const student = students.find(s => s.id === p.studentId);
                  return {
                    [labels.studentLabelSingular]: student?.name || `${labels.studentLabelSingular} Desconhecido(a)`,
                    'Status': getStatus(p) === 'paid' ? 'Pago' : getStatus(p) === 'overdue' ? 'Atrasado' : 'Pendente',
                    'Valor (R$)': p.amount.toFixed(2).replace('.', ','),
                    'Referência': p.monthRef,
                    'Vencimento': new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR'),
                    'Data de Pagamento': p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : '',
                  };
                });
                exportToCSV(exportData, `Pagamentos_${monthRef}`);
              }}
              disabled={loadingPayments || monthPayments.length === 0}
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar</span>
            </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 shrink-0"
              onClick={togglePrivacyMode}
              title={privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[120px] sm:w-[140px] shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[90px] sm:w-[100px] shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar ${labels.studentLabelSingular.toLowerCase()} por nome...`}
            className="pl-10 bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Arena Mode Sub-Tabs (Pacotes vs Reservas Avulsas) */}
        {isArena && (
          <div className="flex rounded-xl bg-muted/20 p-1 border border-border/40 shadow-sm max-w-md">
            <button
              onClick={() => {
                setActiveSubTab('pacotes');
                setSearchTerm('');
              }}
              className={cn(
                'flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5',
                activeSubTab === 'pacotes'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Mensalistas
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1',
                activeSubTab === 'pacotes' ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {monthPayments.length + monthMensalistaReservations.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('reservas');
                setSearchTerm('');
              }}
              className={cn(
                'flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5',
                activeSubTab === 'reservas'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Locações Avulsas
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1',
                activeSubTab === 'reservas' ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {monthAvulsaReservations.length}
              </span>
            </button>
          </div>
        )}

        {/* Dynamic Payment / Reservation list */}
        {showReservationsTab ? (
          // --- VIEW 1: LOCAÇÕES AVULSAS (AGENDA) ---
          monthAvulsaReservations.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={`Nenhuma locação avulsa para ${monthOptions[selectedMonth - 1]}/${selectedYear}`}
              description="As reservas agendadas e confirmadas na agenda de quadras aparecerão aqui automaticamente."
              className="card-elevated p-12"
            />
          ) : filteredReservations.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nenhuma locação encontrada"
              description={`Não encontramos nenhum resultado para "${searchTerm}".`}
              action={(
                <Button variant="link" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              )}
              className="card-elevated p-12"
            />
          ) : (
            <div className="space-y-3">
              {filteredReservations.map(reservation => {
                const firstStudent = students.find(s => s.id === reservation.reservanteIds[0]);
                const reservanteName = firstStudent?.name || reservation.notes || 'Sem nome';
                const court = courts.find(c => c.id === reservation.courtId);
                const courtName = court?.name || 'Quadra';
                const status = reservation.paymentStatus;
                const isOverdue = status === 'pending' && reservation.date < todayStr;
                const canChangeReservationPayment = status === 'paid' ? canReopenPayments : canReceivePayments;

                return (
                  <div key={reservation.id} className="card-elevated p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/20 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{reservanteName}</span>
                        <Badge
                          variant={status === 'paid' ? 'success' : isOverdue ? 'destructive' : 'warning'}
                          className="text-xs font-bold"
                        >
                          {status === 'paid' ? '✓ Pago' : isOverdue ? '⚠ Atrasado' : '⏳ Pendente'}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-muted/30">
                          Avulsa
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1 items-center">
                        <span className="flex items-center gap-1">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: court?.color || '#f97316' }} />
                          {courtName}
                        </span>
                        <span>{formatCurrency(reservation.finalPrice)}</span>
                        <span>
                          {new Date(reservation.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {reservation.time} ({reservation.durationMinutes} min)
                        </span>
                        {reservation.paymentMethod && status === 'paid' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Pago via {PAYMENT_METHOD_LABELS[reservation.paymentMethod]}
                          </span>
                        )}
                        {status === 'pending' && reservation.totalPaid > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                            Recebido: {formatCurrency(reservation.totalPaid)} · Restante: {formatCurrency(reservation.remainingBalance)}
                          </span>
                        )}
                      </div>
                    </div>
                    {canChangeReservationPayment && (
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end mt-2 sm:mt-0">
                      <Button
                        size="sm"
                        variant={status === 'paid' ? 'outline' : 'default'}
                        className={cn(
                          'text-xs font-bold w-full sm:w-auto',
                          status === 'paid' ? 'text-muted-foreground hover:bg-destructive/5 hover:text-destructive' : 'btn-primary-gradient'
                        )}
                        onClick={() => {
                          if (status === 'paid') {
                            handleToggleReservationPayment(reservation);
                          } else {
                            setArenaPaymentDialogRes(reservation);
                          }
                        }}
                      >
                        {status === 'paid' ? (
                          <>
                            <X className="h-3.5 w-3.5 mr-1" /> Estornar
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" /> Confirmar Pagamento
                          </>
                        )}
                      </Button>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // --- VIEW 2: MENSALISTAS / PACOTES (PRO-RATA / REGULARES) ---
          !hasMonthlyPaymentRecords ? (
            <EmptyState
              icon={DollarSign}
              title={`Nenhum pagamento para ${monthOptions[selectedMonth - 1]}/${selectedYear}`}
              description={`${labels.studentLabel} com ${labels.planLabel.toLowerCase()} mensal e dia de vencimento definido aparecerão aqui automaticamente.`}
              className="card-elevated p-12"
            />
          ) : !hasFilteredPaymentRecords ? (
            <EmptyState
              icon={Search}
              title={`Nenhum(a) ${labels.studentLabelSingular.toLowerCase()} encontrado(a)`}
              description={`Não encontramos nenhum resultado para "${searchTerm}".`}
              action={(
                <Button variant="link" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              )}
              className="card-elevated p-12"
            />
          ) : (
            <div className="space-y-3">
              {/* Barra de Ações em Lote */}
              {filteredPayments.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border/50">
                <div className="flex items-center gap-2.5">
                  <Checkbox 
                    checked={selectedPayments.length === filteredPayments.length && filteredPayments.length > 0}
                    onCheckedChange={handleSelectAll}
                    id="select-all"
                  />
                  <label htmlFor="select-all" className="text-xs font-semibold cursor-pointer text-foreground select-none">
                    Selecionar Todos ({filteredPayments.length})
                  </label>
                  {selectedPayments.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1 font-bold">
                      {selectedPayments.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                {selectedPayments.length > 0 && (canReceivePayments || canReopenPayments) && (
                  <div className="flex items-center gap-2">
                    {canReceivePayments && (
                    <Button
                      size="sm"
                      className="btn-primary-gradient text-xs font-bold"
                      onClick={async () => {
                        await markBatchAsPaid(selectedPayments);
                        setSelectedPayments([]);
                      }}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Marcar como Pagos
                    </Button>
                    )}
                    {canReopenPayments && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-muted-foreground text-xs font-semibold"
                      onClick={async () => {
                        await markBatchAsUnpaid(selectedPayments);
                        setSelectedPayments([]);
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Desmarcar
                    </Button>
                    )}
                  </div>
                )}
              </div>
              )}

              {filteredPayments.map(payment => {
                const student = students.find(s => s.id === payment.studentId);
                const plan = plans.find(p => p.id === payment.planId);
                const status = getStatus(payment);
                const isPartial = !payment.paid && payment.paidAmount > 0;
                if (!student) return null;

                return (
                  <div key={payment.id} className={cn("card-elevated p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all", selectedPayments.includes(payment.id) && "border-primary/40 ring-1 ring-primary/20 bg-primary/[0.02]")}>
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <div className="pt-1">
                        <Checkbox 
                          checked={selectedPayments.includes(payment.id)} 
                          onCheckedChange={() => toggleSelectPayment(payment.id)} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{student.name}</span>
                        {isPartial ? (
                          <Badge variant="warning" className="flex items-center gap-1 text-xs">
                            ⏳ Parcial (Falta {formatCurrency(payment.amount - (payment.paidAmount || 0))})
                          </Badge>
                        ) : (
                          <Badge
                            variant={status === 'paid' ? 'success' : status === 'overdue' ? 'destructive' : 'warning'}
                            className="text-xs font-bold"
                          >
                            {status === 'paid' ? '✓ Pago' : status === 'pending' ? '⏳ Pendente' : '⚠ Atrasado'}
                          </Badge>
                        )}
                        {payment.isProrata && (
                          <Badge className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                            <Percent className="h-3 w-3 mr-0.5" /> Pro-rata
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{plan?.name || `${labels.planLabelSingular} removido`}</span>
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
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Pago em: {new Date(payment.paidAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {!payment.paid && payment.paidAmount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Recebido parcialmente: {formatCurrency(payment.paidAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                      {payment.paid ? (
                        canReopenPayments && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground text-xs"
                          onClick={() => markAsUnpaid(payment.id)}
                        >
                          <X className="h-4 w-4 mr-1" /> Desmarcar
                        </Button>
                        )
                      ) : (
                        canReceivePayments && (
                        <Button
                          size="sm"
                          className="btn-primary-gradient text-xs"
                          onClick={() => {
                            setReceivingPayment(payment);
                            setReceiptAmount(String(payment.amount - (payment.paidAmount || 0)));
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" /> Marcar Pago
                        </Button>
                        )
                      )}
                      {canDeletePayments && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar cobran&ccedil;a?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta cobran&ccedil;a de {student.name} ({monthOptions[selectedMonth - 1]}/{selectedYear}) ser&aacute; ocultada da lista ativa. Se foi um engano, voc&ecirc; poder&aacute; restaur&aacute;-la depois.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePayment(payment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Cancelar cobran&ccedil;a
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Reservas mensais de quadra */}
              {isArena && filteredMensalistaReservations.length > 0 && (
                <>
                  {filteredPayments.length > 0 && (
                    <div className="flex items-center gap-3 mt-4 mb-1">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        Reservas de Quadra
                      </span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                  )}

                  {filteredMensalistaReservations.map(reservation => {
                    const firstStudent = students.find(s => s.id === reservation.reservanteIds[0]);
                    const reservanteName = firstStudent?.name || reservation.notes || 'Sem nome';
                    const court = courts.find(c => c.id === reservation.courtId);
                    const courtName = court?.name || 'Quadra';
                    const status = reservation.paymentStatus;
                    const isOverdue = status === 'pending' && reservation.date < todayStr;
                    const canChangeReservationPayment = status === 'paid' ? canReopenPayments : canReceivePayments;

                    return (
                      <div key={reservation.id} className="card-elevated p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/20 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground truncate">{reservanteName}</span>
                            <Badge
                              variant={status === 'paid' ? 'success' : isOverdue ? 'destructive' : 'warning'}
                              className="text-xs font-bold"
                            >
                              {status === 'paid' ? '✓ Pago' : isOverdue ? '⚠ Atrasado' : '⏳ Pendente'}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-muted/30">
                              Mensalista
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1 items-center">
                            <span className="flex items-center gap-1">
                              <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: court?.color || '#f97316' }} />
                              {courtName}
                            </span>
                            <span>{formatCurrency(reservation.finalPrice)}</span>
                            <span>
                              {new Date(reservation.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {reservation.time} ({reservation.durationMinutes} min)
                            </span>
                            {reservation.paymentMethod && status === 'paid' && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Pago via {PAYMENT_METHOD_LABELS[reservation.paymentMethod]}
                              </span>
                            )}
                            {status === 'pending' && reservation.totalPaid > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                                Recebido: {formatCurrency(reservation.totalPaid)} · Restante: {formatCurrency(reservation.remainingBalance)}
                              </span>
                            )}
                          </div>
                        </div>
                        {canChangeReservationPayment && (
                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end mt-2 sm:mt-0">
                          <Button
                            size="sm"
                            variant={status === 'paid' ? 'outline' : 'default'}
                            className={cn(
                              'text-xs font-bold w-full sm:w-auto',
                              status === 'paid' ? 'text-muted-foreground hover:bg-destructive/5 hover:text-destructive' : 'btn-primary-gradient'
                            )}
                            onClick={() => {
                              if (status === 'paid') {
                                handleToggleReservationPayment(reservation);
                              } else {
                                setArenaPaymentDialogRes(reservation);
                              }
                            }}
                          >
                            {status === 'paid' ? (
                              <>
                                <X className="h-3.5 w-3.5 mr-1" /> Estornar
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" /> Confirmar Pagamento
                              </>
                            )}
                          </Button>
                        </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {canDeletePayments && filteredCancelledPayments.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-display text-base font-semibold text-amber-950 dark:text-amber-100">
                        Cobran&ccedil;as canceladas
                      </h3>
                      <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
                        Use apenas para recuperar cobran&ccedil;as canceladas por engano neste m&ecirc;s.
                      </p>
                    </div>
                    <Badge className="w-fit bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      {filteredCancelledPayments.length} cancelada(s)
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {filteredCancelledPayments.map(payment => {
                      const student = students.find(s => s.id === payment.studentId);
                      const plan = plans.find(p => p.id === payment.planId);
                      if (!student) return null;

                      return (
                        <div
                          key={payment.id}
                          className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/60"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{student.name}</span>
                              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                                Cancelada
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {plan?.name || `${labels.planLabelSingular} atual`} | {monthOptions[selectedMonth - 1]}/{selectedYear}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 sm:w-auto dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
                            onClick={() => restorePayment(payment.id)}
                          >
                            <RotateCcw className="mr-1 h-4 w-4" /> Restaurar cobran&ccedil;a
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Modal Premium de Recebimento Parcial ou Total */}
        {receivingPayment && (
          <Dialog open={!!receivingPayment} onOpenChange={(open) => !open && setReceivingPayment(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <IconDialogTitle icon={DollarSign}>
                  Confirmar Recebimento
                </IconDialogTitle>
                <DialogDescription>
                  Registre o pagamento para o(a) aluno(a) <strong className="text-foreground font-semibold">{students.find(s => s.id === receivingPayment.studentId)?.name}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/40 p-3.5 rounded-xl border border-border/50 text-left">
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Valor Total da Fatura</span>
                    <span className="font-bold text-foreground text-base">{formatCurrency(receivingPayment.amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-semibold">Já Pago Anteriormente</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{formatCurrency(receivingPayment.paidAmount || 0)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quanto o aluno pagou nesta parcela?</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ex: 50.00"
                      className="pl-9 font-semibold text-foreground bg-background focus:border-primary/50 text-left"
                      value={receiptAmount}
                      onChange={(e) => setReceiptAmount(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    Se o valor for menor que o saldo devedor de <strong>{formatCurrency(receivingPayment.amount - (receivingPayment.paidAmount || 0))}</strong>, a mensalidade continuará em aberto como <strong>Parcialmente Paga</strong>. Se for igual ou maior, será marcada como totalmente <strong>Paga</strong>.
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-0 mt-2">
                <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={() => setReceivingPayment(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="w-full sm:flex-1 btn-primary-gradient"
                  onClick={async () => {
                    if (!receiptAmount || isNaN(Number(receiptAmount))) return;
                    const inputAmt = Number(receiptAmount);
                    // Add to what they already paid in this monthly log
                    const cumulativeAmount = (receivingPayment.paidAmount || 0) + inputAmt;
                    await markAsPaid(receivingPayment.id, cumulativeAmount);
                    setReceivingPayment(null);
                  }}
                >
                  Confirmar Recebimento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      <ArenaPartialPaymentDialog
        reservation={arenaPaymentDialogRes}
        open={!!arenaPaymentDialogRes}
        onOpenChange={(open) => {
          if (!open) setArenaPaymentDialogRes(null);
        }}
      />
    </AppPage>
  );
}
// Final de arquivo - PaymentsPage
