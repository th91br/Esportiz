import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/formatCurrency';
import { type Reservation, useReservations } from '@/hooks/queries/useReservations';
import { type PaymentMethod, PAYMENT_METHOD_LABELS, RECEIVED_RESERVATION_PAYMENT_METHODS } from '@/lib/reservationContracts';
import { toast } from 'sonner';

interface ArenaPartialPaymentDialogProps {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArenaPartialPaymentDialog({ reservation, open, onOpenChange }: ArenaPartialPaymentDialogProps) {
  const { addPartialPayment } = useReservations();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod('pix');
    }
  }, [open, reservation?.id]);

  if (!reservation) return null;

  const remainingBalance = reservation.remainingBalance;
  const parsedAmount = Number(amount.replace(',', '.'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return toast.error('Informe um valor válido.');
    }
    if (parsedAmount > remainingBalance) {
      return toast.error('O valor informado é maior que o saldo devedor.');
    }
    if (!RECEIVED_RESERVATION_PAYMENT_METHODS.includes(method)) {
      return toast.error('Escolha uma forma de pagamento recebida.');
    }

    setIsSubmitting(true);
    try {
      await addPartialPayment({
        id: reservation.id,
        amount: parsedAmount,
        method,
      });
      setAmount('');
      onOpenChange(false);
    } catch {
      // Error is handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Pagamento</DialogTitle>
          <DialogDescription>
            Registre um pagamento parcial (rachadinha) ou total para este horário.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 p-4 rounded-lg flex justify-between items-center mb-4 border">
          <div>
            <p className="text-sm font-semibold">Valor Total</p>
            <p className="text-lg font-bold">{formatCurrency(reservation.finalPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-muted-foreground">Já Pago</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(reservation.totalPaid)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex justify-between">
              <span>Valor a Receber (R$)</span>
              <span className="text-muted-foreground text-xs font-semibold">
                Falta {formatCurrency(remainingBalance)}
              </span>
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={remainingBalance.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setAmount(remainingBalance.toFixed(2))}
              >
                Quitar Tudo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECEIVED_RESERVATION_PAYMENT_METHODS.map((paymentMethod) => (
                  <SelectItem key={paymentMethod} value={paymentMethod}>{PAYMENT_METHOD_LABELS[paymentMethod]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full btn-primary-gradient" disabled={isSubmitting || !amount.trim()}>
            {isSubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
          </Button>
        </form>

        {reservation.partialPayments && reservation.partialPayments.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-semibold mb-3">Histórico de Pagamentos</p>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {reservation.partialPayments.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/20 border text-muted-foreground">
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                  <span>{PAYMENT_METHOD_LABELS[p.method]}</span>
                  <span className="text-xs">{new Date(p.date).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
