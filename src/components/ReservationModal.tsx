import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/formatCurrency';
import { useCourts } from '@/hooks/queries/useCourts';
import { useStudents } from '@/hooks/queries/useStudents';
import {
  useReservations,
  type PaymentMethod,
  type ReservationMeta,
  type ReservationType,
  PAYMENT_METHOD_LABELS,
  RESERVATION_TYPE_LABELS,
} from '@/hooks/queries/useReservations';
import { toast } from 'sonner';
import { CalendarDays, Clock, User, DollarSign, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalTodayDate } from '@/lib/dateUtils';

const DURATION_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' },
  { value: 150, label: '2h30' },
  { value: 180, label: '3h' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 23; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefilledDate?: string;
  prefilledTime?: string;
  prefilledCourtId?: string;
  reservationId?: string; // if editing
}

export function ReservationModal({
  open, onOpenChange, prefilledDate, prefilledTime, prefilledCourtId, reservationId,
}: ReservationModalProps) {
  const { courts } = useCourts();
  const { students } = useStudents();
  const { reservations, addReservation, updateReservation, setReservationPaymentStatus } = useReservations();
  const isEditing = !!reservationId;
  const existing = reservations.find(r => r.id === reservationId);

  const today = getLocalTodayDate();

  const [courtId, setCourtId] = useState(prefilledCourtId || '');
  const [date, setDate] = useState(prefilledDate || today);
  const [time, setTime] = useState(prefilledTime || '08:00');
  const [duration, setDuration] = useState(60);
  const [reservanteId, setReservanteId] = useState('');
  const [reservanteSearch, setReservanteSearch] = useState('');
  const [reservationType, setReservationType] = useState<ReservationMeta['reservationType']>('avulsa');
  const [paymentMethod, setPaymentMethod] = useState<ReservationMeta['paymentMethod']>('pix');
  const [paymentStatus, setPaymentStatus] = useState<ReservationMeta['paymentStatus']>('pending');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedCourt = courts.find(c => c.id === courtId);
  const basePrice = useMemo(() => {
    if (!selectedCourt) return 0;
    let hourlyPrice = selectedCourt.pricePerHour;
    if (selectedCourt.usePeakPricing && selectedCourt.peakPrice && selectedCourt.peakStart && selectedCourt.peakEnd) {
      if (time >= selectedCourt.peakStart && time < selectedCourt.peakEnd) {
        hourlyPrice = selectedCourt.peakPrice;
      }
    }
    return (hourlyPrice * duration) / 60;
  }, [selectedCourt, duration, time]);

  const finalPrice = Math.max(0, basePrice - discount);

  useEffect(() => {
    if (!open) return;
    if (isEditing && existing) {
      setCourtId(existing.courtId);
      setDate(existing.date);
      setTime(existing.time);
      setDuration(existing.durationMinutes);
      setReservanteId(existing.reservanteIds[0] || '');
      setReservationType(existing.reservationType);
      setPaymentMethod(existing.paymentMethod);
      setPaymentStatus(existing.paymentStatus);
      setDiscount(existing.discount);
      setNotes(existing.notes);
    } else {
      setCourtId(prefilledCourtId || (courts[0]?.id || ''));
      setDate(prefilledDate || today);
      setTime(prefilledTime || '08:00');
      setDuration(60);
      setReservanteId('');
      setReservanteSearch('');
      setReservationType('avulsa');
      setPaymentMethod('pix');
      setPaymentStatus('pending');
      setDiscount(0);
      setNotes('');
    }
  }, [open, isEditing, existing, prefilledCourtId, courts, prefilledDate, today, prefilledTime]);

  const filteredStudents = students.filter(s =>
    s.active && s.name.toLowerCase().includes(reservanteSearch.toLowerCase())
  ).slice(0, 6);

  const handleSubmit = async () => {
    if (!courtId) return toast.error('Selecione uma quadra.');
    if (!date) return toast.error('Informe a data.');
    if (!time) return toast.error('Informe o horário.');

    setSaving(true);
    try {
      const isBlocked = reservationType === 'blocked';
      const nextPaymentMethod = isBlocked ? 'pix' : paymentMethod;
      const nextPaymentStatus = isBlocked ? 'paid' : paymentStatus;
      const meta: ReservationMeta = {
        price: isBlocked ? 0 : basePrice,
        discount: isBlocked ? 0 : discount,
        finalPrice: isBlocked ? 0 : finalPrice,
        reservationType,
        paymentMethod: isEditing && existing ? existing.paymentMethod : nextPaymentMethod,
        paymentStatus: isEditing && existing ? existing.paymentStatus : nextPaymentStatus,
        status: 'confirmed',
      };
      if (isEditing && existing?.online !== undefined) {
        meta.online = existing.online;
      }
      if (isEditing && existing?.paymentUpdatedAt) {
        meta.paymentUpdatedAt = existing.paymentUpdatedAt;
      }
      if (isEditing && existing?.paymentPaidAt) {
        meta.paymentPaidAt = existing.paymentPaidAt;
      }
      const input = {
        date,
        time,
        courtId,
        reservanteIds: isBlocked ? [] : (reservanteId ? [reservanteId] : []),
        durationMinutes: duration,
        notes,
        meta,
      };
      if (isEditing && reservationId) {
        await updateReservation({ id: reservationId, input });
        if (
          existing &&
          !isBlocked &&
          (existing.paymentStatus !== nextPaymentStatus || existing.paymentMethod !== nextPaymentMethod)
        ) {
          await setReservationPaymentStatus({
            id: reservationId,
            paymentStatus: nextPaymentStatus,
            paymentMethod: nextPaymentMethod,
          });
        }
      } else {
        await addReservation(input);
      }
      onOpenChange(false);
    } catch {
      /* toast already shown */
    } finally {
      setSaving(false);
    }
  };

  const selectedReservante = students.find(s => s.id === reservanteId);

  const todayStr = getLocalTodayDate();
  const isRetroactive = date < todayStr || (date === todayStr && time < new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Editar Reserva' : 'Nova Reserva'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados da reserva.' : 'Preencha os dados para criar uma nova reserva.'}
          </DialogDescription>
        </DialogHeader>

        {isRetroactive && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg flex items-start gap-2.5 mt-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Aviso: Lançamento Retroativo</p>
              <p className="opacity-90 text-xs">Você está agendando ou editando um horário no passado.</p>
            </div>
          </div>
        )}

        <div className="space-y-5 mt-2">
          {/* Quadra */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center">🏟</div>
              Quadra *
            </Label>
            <Select value={courtId} onValueChange={setCourtId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a quadra" />
              </SelectTrigger>
              <SelectContent>
                {courts.filter(c => c.isActive).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name} — R${c.pricePerHour.toFixed(0)}/h
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" /> Data *
              </Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-primary" /> Início *
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Duração</Label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-semibold border transition-all',
                    duration === opt.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Reserva */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tipo de Reserva</Label>
            <Select value={reservationType} onValueChange={v => setReservationType(v as ReservationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESERVATION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reservante */}
          {reservationType !== 'blocked' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-primary" /> Reservante
              </Label>
              {selectedReservante ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div>
                    <p className="font-semibold text-sm">{selectedReservante.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedReservante.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReservanteId(''); setReservanteSearch(''); }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar reservante..."
                      value={reservanteSearch}
                      onChange={e => setReservanteSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {reservanteSearch && filteredStudents.length > 0 && (
                    <div className="border rounded-lg divide-y shadow-md bg-background">
                      {filteredStudents.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setReservanteId(s.id); setReservanteSearch(''); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {reservanteSearch && filteredStudents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nenhum reservante encontrado. Cadastre-o em Reservantes.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Financeiro */}
          {reservationType !== 'blocked' && (
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Financeiro
              </p>
              <div className="grid grid-cols-1 gap-3 text-center min-[420px]:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valor Base</p>
                  <p className="font-bold text-sm">{formatCurrency(basePrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Desconto</p>
                  <Input
                    type="number"
                    min={0}
                    max={basePrice}
                    step={0.5}
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="h-8 text-center text-sm"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Final</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(finalPrice)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={paymentStatus} onValueChange={v => setPaymentStatus(v as ReservationMeta['paymentStatus'])}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">✅ Pago</SelectItem>
                      <SelectItem value="pending">⏳ Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {reservationType === 'blocked' ? 'Motivo do Bloqueio' : 'Observações'}
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={reservationType === 'blocked' ? 'Descreva o motivo do bloqueio (ex: Feriado, Manutenção)...' : 'Anotações adicionais...'}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="w-full sm:flex-1 btn-primary-gradient" onClick={handleSubmit} disabled={saving}>
              {saving
                ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isEditing ? 'Salvar' : 'Criar Reserva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
