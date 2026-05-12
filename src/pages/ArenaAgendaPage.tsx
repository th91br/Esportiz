import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ReservationModal } from '@/components/ReservationModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCourts, SPORT_LABELS } from '@/hooks/queries/useCourts';
import { useReservations, type Reservation } from '@/hooks/queries/useReservations';
import { useStudents } from '@/hooks/queries/useStudents';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, CheckCircle, XCircle,
  Clock, User, DollarSign, Pencil, Trash2, Globe, MessageCircle, Copy, Send, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatCurrency';
import { PAYMENT_METHOD_LABELS } from '@/hooks/queries/useReservations';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 → 22

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function isReservationInSlot(r: Reservation, hour: number): boolean {
  const startH = parseInt(r.time.split(':')[0]);
  const startM = parseInt(r.time.split(':')[1]);
  const endTotalMin = startH * 60 + startM + r.durationMinutes;
  const slotStart = hour * 60;
  const slotEnd = slotStart + 60;
  return startH * 60 + startM < slotEnd && endTotalMin > slotStart;
}

function isReservationStartingInSlot(r: Reservation, hour: number): boolean {
  return parseInt(r.time.split(':')[0]) === hour;
}

interface ReservationDetailPanelProps {
  reservation: Reservation;
  students: ReturnType<typeof useStudents>['students'];
  courts: ReturnType<typeof useCourts>['courts'];
  profile: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReservationDetailPanel({ reservation, students, courts, profile, onClose, onEdit, onDelete }: ReservationDetailPanelProps) {
  const isBlocked = reservation.reservationType === 'blocked';
  const reservante = students.find(s => reservation.reservanteIds.includes(s.id));
  const court = courts.find(c => c.id === reservation.courtId);
  const arenaName = profile?.ct_name || 'Esportiz Arena';

  const buildVoucherText = () => {
    const dateFormatted = new Date(reservation.date + 'T12:00:00').toLocaleDateString('pt-BR');
    const clientName = reservante?.name || 'Cliente';
    const courtName = court?.name || 'Quadra Principal';
    const durationLabel = reservation.durationMinutes === 60 ? '1h' :
                          reservation.durationMinutes === 90 ? '1h30' :
                          reservation.durationMinutes === 120 ? '2h' :
                          reservation.durationMinutes === 150 ? '2h30' :
                          reservation.durationMinutes === 180 ? '3h' : `${reservation.durationMinutes} min`;
    const priceLabel = formatCurrency(reservation.finalPrice);
    const paymentMethodLabel = PAYMENT_METHOD_LABELS[reservation.paymentMethod] || 'Pix';
    const paymentStatusLabel = reservation.paymentStatus === 'paid' ? 'Pago ✅' : 'Pendente ⏳';
    const pixDetails = (reservation.paymentStatus === 'pending' && profile?.pix_key) ? 
                       `\n🔑 *Chave Pix:* ${profile.pix_key}${profile.pix_receiver ? `\n👤 *Beneficiário:* ${profile.pix_receiver}` : ''}\n` : '';

    const customTemplate = profile?.niche_settings?.arena?.templates?.booking_confirmation;
    if (customTemplate) {
      return customTemplate
        .replace(/{nome}/g, clientName)
        .replace(/{escola}/g, arenaName)
        .replace(/{quadra}/g, courtName)
        .replace(/{data}/g, dateFormatted)
        .replace(/{hora}/g, `${reservation.time} (${durationLabel})`)
        .replace(/{valor}/g, priceLabel);
    }

    return `━━━━━━━━━━━━━━━━━━━━━━━━
🏆 *COMPROVANTE DE RESERVA* 🏆
*${arenaName}*
━━━━━━━━━━━━━━━━━━━━━━━━

👤 *Cliente:* ${clientName}
🏟 *Quadra:* ${courtName}
📅 *Data:* ${dateFormatted}
⏰ *Horário:* ${reservation.time} (${durationLabel})
💰 *Valor do Play:* ${priceLabel}
💳 *Pagamento:* ${paymentMethodLabel} (${paymentStatusLabel})
${pixDetails}
📍 *${arenaName}*
_Agradecemos a preferência. Bom jogo!_ 🎾🔥
━━━━━━━━━━━━━━━━━━━━━━━━`;
  };

  const handleCopyVoucher = () => {
    const text = buildVoucherText();
    navigator.clipboard.writeText(text);
    toast.success('Comprovante copiado com sucesso!');
  };

  const handleShareWhatsApp = () => {
    const text = buildVoucherText();
    const cleanPhone = reservante?.phone ? reservante.phone.replace(/\D/g, '') : '';
    const waPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-5 border-b flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">
          {isBlocked ? 'Detalhes do Bloqueio' : 'Detalhes da Reserva'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}><XCircle className="h-5 w-5" /></Button>
      </div>
      <div className="p-5 space-y-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800">
              <Lock className="h-3 w-3" /> Bloqueado / Fechado
            </span>
          ) : (
            <>
              <span className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold',
                reservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}>
                {reservation.status === 'confirmed' ? '✅ Confirmada' :
                 reservation.status === 'pending' ? '⏳ Pendente' : '❌ Cancelada'}
              </span>
              <span className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold',
                reservation.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
              )}>
                {reservation.paymentStatus === 'paid' ? '💰 Pago' : '⏳ A Receber'}
              </span>
              {reservation.online && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1 shrink-0">
                  <Globe className="h-3 w-3 animate-pulse" /> Web
                </span>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Data e Horário</p>
              <p className="font-semibold text-sm">
                {new Date(reservation.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {reservation.time} ({reservation.durationMinutes / 60}h)
              </p>
            </div>
          </div>

          {!isBlocked && reservante && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Reservante</p>
                <p className="font-semibold text-sm">{reservante.name}</p>
                <p className="text-xs text-muted-foreground">{reservante.phone}</p>
              </div>
            </div>
          )}

          {!isBlocked && reservation.finalPrice > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <DollarSign className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-bold text-primary text-lg">{formatCurrency(reservation.finalPrice)}</p>
                {reservation.discount > 0 && (
                  <p className="text-xs text-muted-foreground">Desconto: {formatCurrency(reservation.discount)}</p>
                )}
                <p className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[reservation.paymentMethod]}</p>
              </div>
            </div>
          )}

          {reservation.notes && (
            <div className="p-3 rounded-xl bg-muted/40">
              <p className="text-xs text-muted-foreground mb-1">
                {isBlocked ? 'Motivo do Bloqueio' : 'Observações'}
              </p>
              <p className="text-sm">{reservation.notes}</p>
            </div>
          )}

          {/* Comprovante WhatsApp */}
          {!isBlocked && (
            <div className="p-4 border border-border/50 bg-muted/10 rounded-xl space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" /> Comprovante de Reserva
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-xs gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 hover:text-emerald-700 border-emerald-500/20 font-bold transition-all"
                  onClick={handleShareWhatsApp}
                >
                  <Send className="h-3.5 w-3.5 shrink-0" /> Enviar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-xs gap-1.5 font-bold transition-all"
                  onClick={handleCopyVoucher}
                >
                  <Copy className="h-3.5 w-3.5 shrink-0" /> Copiar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="p-5 border-t flex gap-2">
        <Button variant="outline" className="flex-1 gap-1 text-sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-1 text-sm text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" /> {isBlocked ? 'Desbloquear' : 'Cancelar'}
        </Button>
      </div>
    </div>
  );
}

export default function ArenaAgendaPage() {
  const { user } = useAuth();
  const { courts } = useCourts();
  const { profile } = useProfile();
  const { reservations, deleteReservation, updateReservation, addReservation } = useReservations();
  const { students } = useStudents();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | undefined>();
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>();
  const [prefilledCourtId, setPrefilledCourtId] = useState<string | undefined>();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingPaymentsOpen, setPendingPaymentsOpen] = useState(false);

  // States for block entire day feature
  const [blockDayOpen, setBlockDayOpen] = useState(false);
  const [blockDayCourtId, setBlockDayCourtId] = useState<string>('all');
  const [blockDayReason, setBlockDayReason] = useState<string>('');
  const [blockingDay, setBlockingDay] = useState(false);

  const handleBlockDay = async () => {
    if (!blockDayReason.trim()) {
      return toast.error('Informe o motivo do bloqueio (ex: Feriado).');
    }

    setBlockingDay(true);
    try {
      const courtsToBlock = blockDayCourtId === 'all' ? activeCourts : activeCourts.filter(c => c.id === blockDayCourtId);
      
      if (courtsToBlock.length === 0) {
        return toast.error('Nenhuma quadra ativa disponível para bloqueio.');
      }

      for (const court of courtsToBlock) {
        await addReservation({
          date: selectedDate,
          time: '07:00',
          courtId: court.id,
          durationMinutes: 960, // 16h total coverage
          notes: blockDayReason,
          meta: {
            price: 0,
            discount: 0,
            finalPrice: 0,
            reservationType: 'blocked',
            paymentMethod: 'pix',
            paymentStatus: 'paid',
            status: 'confirmed',
          },
          reservanteIds: [],
        });
      }

      toast.success(blockDayCourtId === 'all' ? 'Todas as quadras foram bloqueadas para este dia!' : 'A quadra selecionada foi bloqueada para este dia!');
      setBlockDayOpen(false);
      setBlockDayReason('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao bloquear o dia.');
    } finally {
      setBlockingDay(false);
    }
  };

  const pendingReservations = useMemo(() => 
    reservations.filter(r => r.paymentStatus === 'pending' && r.status !== 'cancelled'),
    [reservations]
  );
  const pendingCount = pendingReservations.length;

  const deleteTargetIsBlocked = useMemo(() => {
    if (!deleteId) return false;
    const res = reservations.find(r => r.id === deleteId);
    return res?.reservationType === 'blocked';
  }, [deleteId, reservations]);

  const activeCourts = courts.filter(c => c.isActive);
  const displayedCourts = courtFilter === 'all' ? activeCourts : activeCourts.filter(c => c.id === courtFilter);

  const todayReservations = useMemo(() =>
    reservations.filter(r => r.date === selectedDate && r.status !== 'cancelled'),
    [reservations, selectedDate]
  );

  const reservationsBySlot = useMemo(() => {
    const map = new Map<string, Reservation>();
    todayReservations.forEach(r => {
      const startH = parseInt(r.time.split(':')[0]);
      const startM = parseInt(r.time.split(':')[1]);
      const duration = r.durationMinutes || 60;
      
      // Calculate which hours this reservation overlaps
      for (let hour = 0; hour < 24; hour++) {
        const slotStart = hour * 60;
        const slotEnd = slotStart + 60;
        const endTotalMin = startH * 60 + startM + duration;
        
        if (startH * 60 + startM < slotEnd && endTotalMin > slotStart) {
          map.set(`${r.courtId}_${hour}`, r);
        }
      }
    });
    return map;
  }, [todayReservations]);

  const studentMap = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const openNewReservation = (courtId: string, hour: number) => {
    setEditingReservationId(undefined);
    setPrefilledCourtId(courtId);
    setPrefilledTime(`${String(hour).padStart(2, '0')}:00`);
    setReservationModalOpen(true);
  };

  const copyOnlineBookingLink = () => {
    if (!user) return;
    const url = `${window.location.origin}/agendar?ct=${user.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link de Agendamento Online copiado com sucesso!");
  };

  const handleMarkAsPaid = async (r: Reservation) => {
    try {
      const updatedMeta = {
        price: r.price,
        discount: r.discount,
        finalPrice: r.finalPrice,
        reservationType: r.reservationType,
        paymentMethod: r.paymentMethod,
        paymentStatus: 'paid' as const,
        status: r.status,
        online: r.online
      };

      await updateReservation({
        id: r.id,
        input: {
          meta: updatedMeta
        }
      });
      toast.success('Recebimento confirmado com sucesso!');
    } catch (err) {
      console.error('Erro ao dar baixa:', err);
      toast.error('Ocorreu um erro ao processar o pagamento.');
    }
  };

  const handleChargeClient = (r: Reservation) => {
    const reservante = students.find(s => r.reservanteIds.includes(s.id));
    const court = courts.find(c => c.id === r.courtId);
    const dateFormatted = new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR');
    const arenaName = profile?.ct_name || 'Esportiz Arena';
    
    const pixDetails = profile?.pix_key ? 
                       `\n🔑 *Chave Pix:* ${profile.pix_key}${profile.pix_receiver ? `\n👤 *Beneficiário:* ${profile.pix_receiver}` : ''}` : '';

    const customTemplate = profile?.niche_settings?.arena?.templates?.payment_reminder;
    let text = '';
    
    if (customTemplate) {
      text = customTemplate
        .replace(/{nome}/g, reservante?.name || 'Cliente')
        .replace(/{escola}/g, arenaName)
        .replace(/{valor}/g, formatCurrency(r.finalPrice))
        .replace(/{chave_pix}/g, profile?.pix_key || '')
        .replace(/{beneficiario_pix}/g, profile?.pix_receiver || '');
    } else {
      text = `Olá, ${reservante?.name || 'Cliente'}! Tudo bem? \n\nPassando para lembrar do acerto do seu horário reservado na *${arenaName}*:\n🏟 *Quadra:* ${court?.name || 'Quadra Principal'}\n📅 *Data:* ${dateFormatted} às ${r.time}\n💰 *Valor:* ${formatCurrency(r.finalPrice)}\n${pixDetails}\n\nSe preferir, você pode efetuar o pagamento via Pix. Muito obrigado! 🎾🔥`;
    }

    const cleanPhone = reservante?.phone ? reservante.phone.replace(/\D/g, '') : '';
    const waPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-5">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">Agenda</h1>
            <p className="text-muted-foreground mt-1">Visualize e gerencie as reservas por quadra</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="gap-2 border-primary/20 text-primary bg-background hover:bg-muted w-full sm:w-auto shrink-0"
              onClick={copyOnlineBookingLink}
            >
              <Globe className="h-4 w-4 text-primary animate-pulse" /> Link de Agendamento
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-orange-500/20 text-orange-600 bg-orange-500/5 hover:bg-orange-500/10 w-full sm:w-auto shrink-0 relative font-bold"
              onClick={() => setPendingPaymentsOpen(true)}
            >
              <DollarSign className="h-4 w-4 text-orange-500" /> Recebimentos
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {pendingCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-zinc-500/20 text-zinc-700 bg-zinc-500/5 hover:bg-zinc-500/10 dark:text-zinc-300 dark:bg-zinc-500/10 w-full sm:w-auto shrink-0 font-semibold"
              onClick={() => setBlockDayOpen(true)}
            >
              <Lock className="h-4 w-4 text-zinc-500" /> Bloquear Dia
            </Button>
            <Button
              className="btn-primary-gradient gap-2 w-full sm:w-auto shrink-0"
              onClick={() => { setEditingReservationId(undefined); setPrefilledCourtId(undefined); setPrefilledTime(undefined); setReservationModalOpen(true); }}
            >
              <Plus className="h-4 w-4" /> Nova Reserva
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Date Navigator */}
          <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-xl p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 min-w-[160px] text-center">
              <p className="font-semibold text-sm capitalize">{formatDateLabel(selectedDate)}</p>
              {isToday && <p className="text-xs text-primary font-bold">Hoje</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                Hoje
              </Button>
            )}
          </div>

          {/* Court filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCourtFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                courtFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              Todas
            </button>
            {activeCourts.map(c => (
              <button
                key={c.id}
                onClick={() => setCourtFilter(c.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
                  courtFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary of today */}
        <div className="flex gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span><strong className="text-foreground">{todayReservations.length}</strong> reservas</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span><strong className="text-foreground">{formatCurrency(todayReservations.reduce((a, r) => a + r.finalPrice, 0))}</strong> faturado</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4 text-blue-500" />
            <span><strong className="text-foreground">{todayReservations.reduce((a, r) => a + r.durationMinutes, 0) / 60}h</strong> ocupadas</span>
          </div>
        </div>

        {/* Grid */}
        {displayedCourts.length === 0 ? (
          <div className="card-elevated p-16 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-bold text-xl">Nenhuma quadra ativa</h3>
            <p className="text-muted-foreground mt-1">Cadastre quadras em <strong>Quadras</strong> para visualizar a agenda.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 overflow-auto shadow-sm bg-background">
            {/* Header row */}
            <div
              className="grid sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b"
              style={{ gridTemplateColumns: `80px repeat(${displayedCourts.length}, 1fr)` }}
            >
              <div className="p-3 text-xs font-bold text-muted-foreground uppercase tracking-wider border-r border-border/50">Hora</div>
              {displayedCourts.map(c => (
                <div key={c.id} className="p-3 border-r border-border/50 last:border-r-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{SPORT_LABELS[c.sportType]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Time rows */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="grid border-b border-border/30 last:border-b-0"
                style={{ gridTemplateColumns: `80px repeat(${displayedCourts.length}, 1fr)` }}
              >
                {/* Hour label */}
                <div className="p-3 border-r border-border/50 flex items-center">
                  <span className="text-xs font-bold text-muted-foreground">{String(hour).padStart(2, '0')}:00</span>
                </div>

                {/* Court cells */}
                {displayedCourts.map(court => {
                  const reservation = reservationsBySlot.get(`${court.id}_${hour}`);
                  const isStart = reservation && isReservationStartingInSlot(reservation, hour);
                  const reservante = reservation && reservation.reservanteIds && reservation.reservanteIds.length > 0
                    ? studentMap.get(reservation.reservanteIds[0])
                    : null;

                  return (
                    <div key={court.id} className="border-r border-border/30 last:border-r-0 min-h-[56px] relative">
                      {reservation ? (
                        <button
                          className={cn(
                            'w-full h-full min-h-[56px] p-2 text-left transition-all hover:opacity-90 flex flex-col justify-center',
                            isStart ? 'rounded-t-lg' : '',
                            reservation.reservationType === 'blocked'
                              ? 'bg-zinc-100 dark:bg-zinc-900/40 border-l-2 border-zinc-400/60 text-zinc-500 dark:text-zinc-400 [background-image:repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(0,0,0,0.03)_8px,rgba(0,0,0,0.03)_16px)] dark:[background-image:repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(255,255,255,0.015)_8px,rgba(255,255,255,0.015)_16px)]'
                              : reservation.paymentStatus === 'paid'
                                ? 'bg-emerald-500/20 border-l-2 border-emerald-500'
                                : 'bg-primary/20 border-l-2 border-primary'
                          )}
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          {isStart && (
                            reservation.reservationType === 'blocked' ? (
                              <>
                                <p className="text-xs font-bold truncate flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                                  <Lock className="h-3.5 w-3.5 shrink-0" />
                                  Bloqueado
                                </p>
                                {reservation.notes && (
                                  <p className="text-[10px] text-muted-foreground truncate font-medium">
                                    {reservation.notes}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-bold truncate flex items-center gap-1" style={{ color: court.color }}>
                                  {reservation.online && <Globe className="h-3.5 w-3.5 shrink-0 text-primary animate-pulse" />}
                                  {reservante?.name || 'Reservado'}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {reservation.time} · {reservation.durationMinutes / 60}h · {formatCurrency(reservation.finalPrice)}
                                </p>
                              </>
                            )
                          )}
                          {!isStart && (
                            <div className="h-full w-2 rounded-sm mx-auto opacity-30" style={{ backgroundColor: court.color }} />
                          )}
                        </button>
                      ) : (
                        <button
                          className="w-full h-full min-h-[56px] hover:bg-primary/5 transition-colors text-muted-foreground/30 hover:text-primary/50 flex items-center justify-center group"
                          onClick={() => openNewReservation(court.id, hour)}
                          title={`Reservar ${court.name} às ${hour}:00`}
                        >
                          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB Mobile */}
      <button
        className="fixed bottom-6 right-6 md:hidden h-14 w-14 rounded-full btn-primary-gradient shadow-xl flex items-center justify-center z-40"
        onClick={() => { setEditingReservationId(undefined); setPrefilledCourtId(undefined); setPrefilledTime(undefined); setReservationModalOpen(true); }}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* Detail panel */}
      {selectedReservation && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedReservation(null)} />
          <ReservationDetailPanel
            reservation={selectedReservation}
            students={students}
            courts={courts}
            profile={profile}
            onClose={() => setSelectedReservation(null)}
            onEdit={() => { setEditingReservationId(selectedReservation.id); setReservationModalOpen(true); setSelectedReservation(null); }}
            onDelete={() => { setDeleteId(selectedReservation.id); setSelectedReservation(null); }}
          />
        </>
      )}

      <ReservationModal
        open={reservationModalOpen}
        onOpenChange={setReservationModalOpen}
        prefilledDate={selectedDate}
        prefilledTime={prefilledTime}
        prefilledCourtId={prefilledCourtId}
        reservationId={editingReservationId}
      />

      {/* Pending payments sheet */}
      <Sheet open={pendingPaymentsOpen} onOpenChange={setPendingPaymentsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background border-l shadow-2xl p-6 flex flex-col h-full animate-in slide-in-from-right duration-300">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="font-display font-extrabold text-2xl tracking-tight flex items-center gap-2 text-foreground">
              <DollarSign className="h-6 w-6 text-orange-500" /> Recebimentos Pendentes
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Controle de caixa de reservas e plays em aberto</p>
          </SheetHeader>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {pendingReservations.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-foreground text-sm">Caixa 100% em Dia!</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">Nenhum recebimento ou reserva pendente no momento.</p>
              </div>
            ) : (
              pendingReservations.map((r) => {
                const client = students.find(s => r.reservanteIds.includes(s.id));
                const court = courts.find(c => c.id === r.courtId);
                const dateFormatted = new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR');
                const durationLabel = r.durationMinutes === 60 ? '1h' :
                                      r.durationMinutes === 90 ? '1h30' :
                                      r.durationMinutes === 120 ? '2h' : `${r.durationMinutes}m`;

                return (
                  <div key={r.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-all space-y-3 shadow-sm text-left">
                    {/* Header Row: Client Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-primary shrink-0" />
                          {client?.name || 'Cliente'}
                        </p>
                        {client?.phone && (
                          <p className="text-xs text-muted-foreground ml-5 truncate">{client.phone}</p>
                        )}
                      </div>
                      {r.online && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 flex items-center gap-1 shrink-0">
                          <Globe className="h-3 w-3 animate-pulse" /> Web
                        </span>
                      )}
                    </div>

                    {/* Details: Court, Date & Time */}
                    <div className="text-xs space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/30">
                      <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: court?.color || '#ccc' }} />
                        {court?.name || 'Quadra'}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {dateFormatted} às {r.time} ({durationLabel})
                      </p>
                    </div>

                    {/* Bottom: Price and Actions */}
                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/30">
                      <p className="font-extrabold text-base text-orange-600 dark:text-orange-400">
                        {formatCurrency(r.finalPrice)}
                      </p>
                      <div className="flex gap-1.5">
                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-2.5 gap-1 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 hover:text-emerald-700 font-bold transition-all"
                          onClick={() => handleMarkAsPaid(r)}
                        >
                          Dar Baixa
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-2.5 gap-1 text-muted-foreground hover:text-emerald-600"
                          onClick={() => handleChargeClient(r)}
                          title="Cobrar via WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Cobrar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTargetIsBlocked ? 'Desbloquear horário?' : 'Cancelar reserva?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetIsBlocked
                ? 'O bloqueio será removido e a quadra ficará disponível para reservas novamente.'
                : 'A reserva será removida e o horário ficará disponível novamente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground font-semibold"
              onClick={() => { deleteReservation(deleteId!); setDeleteId(null); }}
            >
              {deleteTargetIsBlocked ? 'Desbloquear' : 'Cancelar Reserva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Day Dialog */}
      <Dialog open={blockDayOpen} onOpenChange={setBlockDayOpen}>
        <DialogContent className="sm:max-w-md bg-background border shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
              <Lock className="h-5 w-5 text-zinc-500" /> Bloquear Funcionamento
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Feche as quadras para feriados, manutenções ou folgas gerais neste dia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="block-court" className="text-sm font-semibold">Quadra a ser Bloqueada</Label>
              <Select value={blockDayCourtId} onValueChange={setBlockDayCourtId}>
                <SelectTrigger id="block-court">
                  <SelectValue placeholder="Selecione a quadra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 Todas as Quadras Ativas</SelectItem>
                  {activeCourts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-reason" className="text-sm font-semibold">Motivo do Fechamento *</Label>
              <Input
                id="block-reason"
                placeholder="Ex: Feriado, Manutenção da rede, Natal..."
                value={blockDayReason}
                onChange={e => setBlockDayReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="flex-1" onClick={() => setBlockDayOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 btn-primary-gradient font-bold" onClick={handleBlockDay} disabled={blockingDay}>
              {blockingDay ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Confirmar Bloqueio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
