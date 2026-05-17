import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { usePayments } from '@/hooks/queries/usePayments';
import { useReservations } from '@/hooks/queries/useReservations';
import { useCourts } from '@/hooks/queries/useCourts';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { formatCurrency } from '@/lib/formatCurrency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, DollarSign, AlertTriangle, Clock, TrendingUp, Eye, EyeOff, Percent, Trash2, Download, Search, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/exportUtils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { getLocalTodayDate } from '@/lib/dateUtils';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function PaymentsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const { payments, generateMonthlyPayments, markAsPaid, markAsUnpaid, markBatchAsPaid, markBatchAsUnpaid, deletePayment, loadingPayments } = usePayments();
  const { reservations, setReservationPaymentStatus } = useReservations();
  const { courts } = useCourts();
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();
  const [searchTerm, setSearchTerm] = useState('');
  const { labels, isArena } = useBusinessContext();
  
  const [receivingPayment, setReceivingPayment] = useState<typeof payments[0] | null>(null);
  const [receiptAmount, setReceiptAmount] = useState<string>('');
  
  // Tab selector for Arena mode: 'pacotes' (monthly plans) vs 'reservas' (single court rentals)
  const [activeSubTab, setActiveSubTab] = useState<'pacotes' | 'reservas'>('pacotes');

  // Seleção em lote (Batch Payments)
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
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

  // --- Single Reservations (Locações) filtering ---
  const monthReservations = useMemo(() => {
    return reservations.filter(r => r.date.startsWith(monthRef) && r.status !== 'cancelled');
  }, [reservations, monthRef]);

  const filteredReservations = useMemo(() => {
    return monthReservations
      .filter(r => {
        const student = students.find(s => s.id === r.reservanteIds[0]);
        const reservanteName = student?.name || r.notes || 'Reserva Avulsa';
        return reservanteName.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
  }, [monthReservations, students, searchTerm]);

  const getStatus = useCallback((p: typeof monthPayments[0]): 'paid' | 'pending' | 'overdue' => {
    if (p.paid) return 'paid';
    return p.dueDate < todayStr ? 'overdue' : 'pending';
  }, [todayStr]);

  // --- Dynamic Stats calculation depending on active sub-tab ---
  const showReservationsTab = isArena && activeSubTab === 'reservas';

  const totalAmount = useMemo(() => {
    if (showReservationsTab) {
      return monthReservations.reduce((sum, r) => sum + r.finalPrice, 0);
    }
    return monthPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [showReservationsTab, monthReservations, monthPayments]);

  const totalPaid = useMemo(() => {
    if (showReservationsTab) {
      return monthReservations.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.finalPrice, 0);
    }
    return monthPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  }, [showReservationsTab, monthReservations, monthPayments]);

  const totalPending = Math.max(0, totalAmount - totalPaid);

  const overdueCount = useMemo(() => {
    if (showReservationsTab) {
      return monthReservations.filter(r => r.paymentStatus === 'pending' && r.date < todayStr).length;
    }
    return monthPayments.filter(p => getStatus(p) === 'overdue').length;
  }, [showReservationsTab, monthReservations, monthPayments, todayStr, getStatus]);

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
      const message = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error('Erro ao atualizar pagamento da reserva: ' + message);
    }
  };


  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Pagamentos</h1>
            <p className="text-sm text-muted-foreground">Controle de pagamentos mensais dos(as) {labels.studentLabel.toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
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
              <Download className="h-4 w-4" /> <span className="hidden xs:inline">Exportar</span>
            </Button>
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
                {monthNames.map((name, i) => (
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
        </div>

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
              <Percent className="h-3.5 w-3.5" />
              Pacotes Mensais (Mensalistas)
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1',
                activeSubTab === 'pacotes' ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {monthPayments.length}
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
              Locações Avulsas (Agenda)
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1',
                activeSubTab === 'reservas' ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {monthReservations.length}
              </span>
            </button>
          </div>
        )}

        {/* Dynamic Payment / Reservation list */}
        {showReservationsTab ? (
          // --- VIEW 1: LOCAÇÕES AVULSAS (AGENDA) ---
          monthReservations.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground">Nenhuma locação avulsa para {monthNames[selectedMonth - 1]}/{selectedYear}</h3>
              <p className="text-sm text-muted-foreground mt-1">As reservas agendadas e confirmadas na agenda de quadras aparecerão aqui automaticamente.</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground">Nenhuma locação encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1">Não encontramos nenhum resultado para "{searchTerm}".</p>
              <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                Limpar busca
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map(reservation => {
                const firstStudent = students.find(s => s.id === reservation.reservanteIds[0]);
                const reservanteName = firstStudent?.name || reservation.notes || 'Reserva Avulsa / Sem Nome';
                const court = courts.find(c => c.id === reservation.courtId);
                const courtName = court?.name || 'Quadra Desconhecida';
                const status = reservation.paymentStatus;
                const isOverdue = status === 'pending' && reservation.date < todayStr;

                return (
                  <div key={reservation.id} className="card-elevated p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/20 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{reservanteName}</span>
                        <Badge
                          className={cn(
                            'text-xs font-bold',
                            status === 'paid' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                            status === 'pending' && !isOverdue && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                            isOverdue && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
                          )}
                        >
                          {status === 'paid' ? '✓ Pago' : isOverdue ? '⚠ Atrasado (Data Passada)' : '⏳ Pendente'}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-muted/30">
                          Reserva Avulsa
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
                            Pago via {reservation.paymentMethod.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end mt-2 sm:mt-0">
                      <Button
                        size="sm"
                        variant={status === 'paid' ? 'outline' : 'default'}
                        className={cn(
                          'text-xs font-bold w-full sm:w-auto',
                          status === 'paid' ? 'text-muted-foreground hover:bg-destructive/5 hover:text-destructive' : 'btn-primary-gradient'
                        )}
                        onClick={() => handleToggleReservationPayment(reservation)}
                      >
                        {status === 'paid' ? (
                          <>
                            <X className="h-3.5 w-3.5 mr-1" /> Estornar / Pendente
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" /> Confirmar Pagamento
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // --- VIEW 2: MENSALISTAS / PACOTES (PRO-RATA / REGULARES) ---
          monthPayments.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground">Nenhum pagamento para {monthNames[selectedMonth - 1]}/{selectedYear}</h3>
              <p className="text-sm text-muted-foreground mt-1">{labels.studentLabel} com {labels.planLabel.toLowerCase()} mensal e dia de vencimento definido aparecerão aqui automaticamente.</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display font-semibold text-lg text-foreground">Nenhum(a) {labels.studentLabelSingular.toLowerCase()} encontrado(a)</h3>
              <p className="text-sm text-muted-foreground mt-1">Não encontramos nenhum resultado para "{searchTerm}".</p>
              <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                Limpar busca
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Barra de Ações em Lote */}
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
                {selectedPayments.length > 0 && (
                  <div className="flex items-center gap-2">
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
                  </div>
                )}
              </div>

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
                          <Badge className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            ⏳ Parcial (Falta {formatCurrency(payment.amount - (payment.paidAmount || 0))})
                          </Badge>
                        ) : (
                          <Badge
                            className={cn(
                              'text-xs font-bold',
                              status === 'paid' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
                              status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
                              status === 'overdue' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
                            )}
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-muted-foreground text-xs"
                          onClick={() => markAsUnpaid(payment.id)}
                        >
                          <X className="h-4 w-4 mr-1" /> Desmarcar
                        </Button>
                      ) : (
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
          )
        )}

        {/* Modal Premium de Recebimento Parcial ou Total */}
        {receivingPayment && (
          <Dialog open={!!receivingPayment} onOpenChange={(open) => !open && setReceivingPayment(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground font-display font-bold">
                  <DollarSign className="h-5 w-5 text-primary" /> Confirmar Recebimento
                </DialogTitle>
                <DialogDescription>
                  Registre o pagamento para o(a) aluno(a) <strong className="text-foreground font-semibold">{students.find(s => s.id === receivingPayment.studentId)?.name}</strong>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-left">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-3.5 rounded-xl border border-border/50 text-left">
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

              <DialogFooter className="flex gap-2 sm:gap-0 mt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setReceivingPayment(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 btn-primary-gradient"
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
      </main>
    </div>
  );
}
// Final de arquivo - PaymentsPage
