import { CheckCircle2, Copy, MessageSquare, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';

export type PaymentValueMode = 'remaining' | 'custom';

export interface SelectedPixPayment {
  id: string;
  amount: number;
  amountStr: string;
  monthRef: string;
  isAdhoc?: boolean;
}

interface StudentPortalPixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolName: string;
  paymentReceiver?: string | null;
  selectedPayment: SelectedPixPayment | null;
  paymentValueMode: PaymentValueMode;
  adhocInputAmount: string;
  customAmountInput: string;
  pixCode: string;
  pixQrCodeUrl: string;
  generatingQrCode: boolean;
  copiedCode: boolean;
  onAdhocAmountChange: (value: string) => void | Promise<void>;
  onCustomAmountChange: (value: string, maxAmount: number) => void | Promise<void>;
  onPaymentValueModeChange: (mode: PaymentValueMode) => void | Promise<void>;
  onCopyPixCode: (code: string) => void;
  onConfirmPayment: () => void;
}

export function StudentPortalPixDialog({
  open,
  onOpenChange,
  schoolName,
  paymentReceiver,
  selectedPayment,
  paymentValueMode,
  adhocInputAmount,
  customAmountInput,
  pixCode,
  pixQrCodeUrl,
  generatingQrCode,
  copiedCode,
  onAdhocAmountChange,
  onCustomAmountChange,
  onPaymentValueModeChange,
  onCopyPixCode,
  onConfirmPayment,
}: StudentPortalPixDialogProps) {
  const isWaitingForAmount = Boolean(
    selectedPayment
      && ((selectedPayment.isAdhoc && !pixQrCodeUrl)
        || (paymentValueMode === 'custom' && !pixQrCodeUrl)),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full border-border/80 shadow-2xl overflow-hidden card-elevated p-6 sm:p-7">
        <DialogHeader className="text-center space-y-2 pb-2 border-b border-border/40">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-1 border border-primary/15">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-black font-display text-foreground tracking-tight leading-none">
            Pagamento via Pix
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Escola: <strong className="text-foreground font-semibold">{schoolName}</strong>
          </DialogDescription>
        </DialogHeader>

        {selectedPayment && (
          <div className="space-y-6 pt-4">
            {selectedPayment.isAdhoc ? (
              <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 space-y-3.5 shadow-inner text-left">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Referência</span>
                    <span className="text-sm font-bold text-foreground">Pagamento avulso</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Recebedor</span>
                    <span className="text-xs font-semibold text-foreground truncate max-w-[150px] block">
                      {paymentReceiver || schoolName}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="adhoc-pix-amount" className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Valor do pagamento
                  </label>
                  <Input
                    id="adhoc-pix-amount"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    className="bg-background font-extrabold text-foreground text-sm h-10 rounded-xl"
                    value={adhocInputAmount}
                    onChange={(event) => void onAdhocAmountChange(event.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-left">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Opção de pagamento
                </span>
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl border border-border/40" role="group" aria-label="Valor do pagamento">
                  <button
                    type="button"
                    onClick={() => void onPaymentValueModeChange('remaining')}
                    aria-pressed={paymentValueMode === 'remaining'}
                    className={cn(
                      'py-2 text-xs font-bold rounded-lg transition-all',
                      paymentValueMode === 'remaining'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Restante ({selectedPayment.amountStr})
                  </button>
                  <button
                    type="button"
                    onClick={() => void onPaymentValueModeChange('custom')}
                    aria-pressed={paymentValueMode === 'custom'}
                    className={cn(
                      'py-2 text-xs font-bold rounded-lg transition-all',
                      paymentValueMode === 'custom'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Outro valor
                  </button>
                </div>

                {paymentValueMode === 'custom' ? (
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="custom-pix-amount" className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Valor parcial
                    </label>
                    <Input
                      id="custom-pix-amount"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      className="bg-background font-extrabold text-foreground text-sm h-10 rounded-xl"
                      value={customAmountInput}
                      onChange={(event) => void onCustomAmountChange(event.target.value, selectedPayment.amount)}
                    />
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex justify-between items-center shadow-inner text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Referência</span>
                      <span className="text-sm font-bold text-foreground">Mensalidade, {selectedPayment.monthRef}</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Valor a pagar</span>
                      <span className="text-lg font-black text-primary font-display">{selectedPayment.amountStr}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative p-3 bg-white dark:bg-white rounded-3xl shadow-md border border-border/30 overflow-hidden group">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-2xl" />

                {isWaitingForAmount ? (
                  <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] flex flex-col items-center justify-center bg-muted/20 text-muted-foreground text-center p-4">
                    <QrCode className="h-8 w-8 opacity-45 mb-2 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Digite o valor acima</span>
                    <span className="text-[9px] opacity-75 mt-1">para gerar o QR Code Pix</span>
                  </div>
                ) : generatingQrCode ? (
                  <LoadingState
                    label="Gerando QR Code Pix"
                    className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] items-center bg-muted/20"
                  />
                ) : pixQrCodeUrl ? (
                  <img
                    src={pixQrCodeUrl}
                    alt="QR Code Pix"
                    className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <span className="text-[10px] text-muted-foreground font-bold tracking-wide uppercase">
                {!pixQrCodeUrl ? 'Aguardando valor' : 'Aponte a câmera do seu banco para pagar'}
              </span>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pix Copia e Cola</span>
                {paymentReceiver && (
                  <span className="text-[10px] text-muted-foreground">
                    Recebedor: <strong className="text-foreground font-semibold">{paymentReceiver}</strong>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5 font-mono text-[10px] text-muted-foreground break-all select-all line-clamp-2 min-h-[52px] leading-relaxed shadow-inner">
                  {pixCode || 'Digite o valor para gerar o código Pix Copia e Cola'}
                </div>
                <Button
                  type="button"
                  onClick={() => onCopyPixCode(pixCode)}
                  disabled={!pixCode}
                  aria-label={copiedCode ? 'Código Pix copiado' : 'Copiar código Pix'}
                  className={cn(
                    'shrink-0 h-auto px-4 rounded-xl font-bold transition-all duration-300',
                    copiedCode
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'btn-primary-gradient',
                  )}
                >
                  {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {pixCode && (
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={onConfirmPayment}
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-300"
                >
                  <MessageSquare className="h-5 w-5" />
                  Enviar comprovante pelo WhatsApp
                </Button>
              </div>
            )}

            <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 space-y-2 text-xs text-muted-foreground text-left">
              <span className="font-bold text-foreground block">Como pagar:</span>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Abra o aplicativo de pagamentos do seu banco.</li>
                <li>Escolha Pix por QR Code ou Pix Copia e Cola.</li>
                <li>Escaneie ou cole o código e confirme o pagamento.</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}