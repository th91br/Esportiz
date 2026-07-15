import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentPortalPixDialog, type SelectedPixPayment } from './StudentPortalPixDialog';

const payment: SelectedPixPayment = {
  id: 'payment-1',
  amount: 120,
  amountStr: 'R$ 120,00',
  monthRef: 'Julho/2026',
};

const createProps = () => ({
  open: true,
  onOpenChange: vi.fn(),
  schoolName: 'Arena Central',
  paymentReceiver: 'Arena Central LTDA',
  selectedPayment: payment,
  paymentValueMode: 'remaining' as const,
  adhocInputAmount: '',
  customAmountInput: '',
  pixCode: 'pix-code',
  pixQrCodeUrl: 'data:image/png;base64,qr',
  generatingQrCode: false,
  copiedCode: false,
  onAdhocAmountChange: vi.fn(),
  onCustomAmountChange: vi.fn(),
  onPaymentValueModeChange: vi.fn(),
  onCopyPixCode: vi.fn(),
  onConfirmPayment: vi.fn(),
});

describe('StudentPortalPixDialog', () => {
  it('renders the payment summary and exposes named payment actions', () => {
    const props = createProps();
    render(<StudentPortalPixDialog {...props} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Pagamento via Pix');
    expect(screen.getByText('Mensalidade, Julho/2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar código Pix' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Enviar comprovante pelo WhatsApp' })).toBeEnabled();
    expect(screen.getByAltText('QR Code Pix')).toBeInTheDocument();
  });

  it('routes value mode, copy, and confirmation actions to the page', () => {
    const props = createProps();
    render(<StudentPortalPixDialog {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Outro valor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar código Pix' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprovante pelo WhatsApp' }));

    expect(props.onPaymentValueModeChange).toHaveBeenCalledWith('custom');
    expect(props.onCopyPixCode).toHaveBeenCalledWith('pix-code');
    expect(props.onConfirmPayment).toHaveBeenCalledOnce();
  });

  it('keeps the Pix code action disabled until a value generates a payload', () => {
    const props = createProps();
    render(
      <StudentPortalPixDialog
        {...props}
        selectedPayment={{ ...payment, id: 'adhoc', isAdhoc: true }}
        pixCode=""
        pixQrCodeUrl=""
      />,
    );

    expect(screen.getByLabelText('Valor do pagamento')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByRole('button', { name: 'Copiar código Pix' })).toBeDisabled();
    expect(screen.getByText('Aguardando valor')).toBeInTheDocument();
  });
});