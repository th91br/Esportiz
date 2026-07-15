export type PaymentFinancialStatus = 'paid' | 'pending' | 'overdue';
export type FinancialSummaryMode = 'competence' | 'cashflow';

export interface FinancialPayment {
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAmount?: number | null;
  paidAt?: string | null;
  fullPrice?: number | null;
}

export interface FinancialReservation {
  date: string;
  finalPrice: number;
  totalPaid?: number | null;
  remainingBalance?: number | null;
  paymentStatus: 'paid' | 'pending' | string;
  status: 'confirmed' | 'pending' | 'cancelled' | string;
}

export interface FinancialSale {
  total: number;
}

export interface FinancialExpense {
  amount: number;
  paid: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface FinancialSummaryInput {
  payments: FinancialPayment[];
  todayDate: string;
  mode: FinancialSummaryMode;
  sales?: FinancialSale[];
  reservations?: FinancialReservation[];
  expenses?: FinancialExpense[];
  range?: DateRange | null;
  includeArenaReservations?: boolean;
}

export interface FinancialSummary {
  expectedRevenue: number;
  receivedRevenue: number;
  overdueRevenue: number;
  pendingRevenue: number;
  totalExpensesPaid: number;
  netProfit: number;
  revenueProgress: number;
}

export interface ReceivableSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  overdueCount: number;
}

function paidAmountOf(payment: FinancialPayment): number {
  return Number(payment.paidAmount || 0);
}

export function isCancelledPayment(payment: FinancialPayment): boolean {
  return Number(payment.fullPrice ?? 0) === -1;
}

export function getRemainingPaymentAmount(payment: FinancialPayment): number {
  return Math.max(0, payment.amount - paidAmountOf(payment));
}

function normalizeAmount(value: number | null | undefined): number {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function getReservationPaidAmount(reservation: FinancialReservation): number {
  const finalPrice = normalizeAmount(reservation.finalPrice);
  if (reservation.paymentStatus === 'paid') return finalPrice;
  return Math.min(finalPrice, normalizeAmount(reservation.totalPaid));
}

export function getReservationRemainingAmount(reservation: FinancialReservation): number {
  const finalPrice = normalizeAmount(reservation.finalPrice);
  if (reservation.paymentStatus === 'paid') return 0;

  if (reservation.remainingBalance !== undefined && reservation.remainingBalance !== null) {
    return Math.min(finalPrice, normalizeAmount(reservation.remainingBalance));
  }

  return Math.max(0, finalPrice - getReservationPaidAmount(reservation));
}

export function getPaymentFinancialStatus(
  payment: FinancialPayment,
  todayDate: string,
): PaymentFinancialStatus {
  if (payment.paid) return 'paid';
  return payment.dueDate < todayDate ? 'overdue' : 'pending';
}

export function summarizePayments(
  payments: FinancialPayment[],
  todayDate: string,
): ReceivableSummary {
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + paidAmountOf(payment), 0);
  const overdueCount = payments.filter(
    (payment) => getPaymentFinancialStatus(payment, todayDate) === 'overdue',
  ).length;

  return {
    totalAmount,
    totalPaid,
    totalPending: Math.max(0, totalAmount - totalPaid),
    overdueCount,
  };
}

export function summarizeReservationReceivables(
  reservations: FinancialReservation[],
  todayDate: string,
): ReceivableSummary {
  const activeReservations = reservations.filter((reservation) => reservation.status !== 'cancelled');
  const totalAmount = activeReservations.reduce((sum, reservation) => sum + reservation.finalPrice, 0);
  const totalPaid = activeReservations.reduce(
    (sum, reservation) => sum + getReservationPaidAmount(reservation),
    0,
  );
  const overdueCount = activeReservations.filter(
    (reservation) => (
      reservation.paymentStatus === 'pending'
      && reservation.date < todayDate
      && getReservationRemainingAmount(reservation) > 0
    ),
  ).length;

  return {
    totalAmount,
    totalPaid,
    totalPending: activeReservations.reduce(
      (sum, reservation) => sum + getReservationRemainingAmount(reservation),
      0,
    ),
    overdueCount,
  };
}

function isDateInRange(date: string | null | undefined, range?: DateRange | null): boolean {
  if (!date || !range) return false;
  const localDate = date.slice(0, 10);
  return localDate >= range.start && localDate <= range.end;
}

export function calculateFinancialSummary({
  payments,
  todayDate,
  mode,
  sales = [],
  reservations = [],
  expenses = [],
  range = null,
  includeArenaReservations = false,
}: FinancialSummaryInput): FinancialSummary {
  let expectedRevenue = 0;
  let receivedRevenue = 0;
  let overdueRevenue = 0;

  payments.forEach((payment) => {
    if (mode === 'competence') {
      expectedRevenue += payment.amount;
      receivedRevenue += paidAmountOf(payment);

      if (!payment.paid && payment.dueDate < todayDate) {
        overdueRevenue += getRemainingPaymentAmount(payment);
      }
      return;
    }

    const isDueInRange = isDateInRange(payment.dueDate, range);
    const isPaidInRange = isDateInRange(payment.paidAt, range);

    if (isDueInRange) {
      expectedRevenue += payment.amount;
      if (!payment.paid && payment.dueDate < todayDate) {
        overdueRevenue += getRemainingPaymentAmount(payment);
      }
    }

    if (isPaidInRange) {
      receivedRevenue += paidAmountOf(payment);
    }
  });

  sales.forEach((sale) => {
    expectedRevenue += sale.total;
    receivedRevenue += sale.total;
  });

  if (includeArenaReservations) {
    reservations
      .filter((reservation) => reservation.status !== 'cancelled')
      .forEach((reservation) => {
        expectedRevenue += reservation.finalPrice;
        receivedRevenue += getReservationPaidAmount(reservation);

        if (
          reservation.paymentStatus !== 'paid'
          && reservation.date < todayDate
        ) {
          overdueRevenue += getReservationRemainingAmount(reservation);
        }
      });
  }

  const totalExpensesPaid = expenses
    .filter((expense) => expense.paid)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pendingRevenue = expectedRevenue - receivedRevenue - overdueRevenue;

  return {
    expectedRevenue,
    receivedRevenue,
    overdueRevenue,
    pendingRevenue: Math.max(0, pendingRevenue),
    totalExpensesPaid,
    netProfit: receivedRevenue - totalExpensesPaid,
    revenueProgress: expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0,
  };
}
