import { describe, expect, it } from 'vitest';
import {
  calculateFinancialSummary,
  getPaymentFinancialStatus,
  getRemainingPaymentAmount,
  getReservationPaidAmount,
  getReservationRemainingAmount,
  summarizePayments,
  summarizeReservationReceivables,
  type FinancialPayment,
  type FinancialReservation,
} from './financialContracts';

const today = '2026-05-18';

function makePayment(overrides: Partial<FinancialPayment> = {}): FinancialPayment {
  return {
    amount: 100,
    dueDate: '2026-05-20',
    paid: false,
    paidAmount: 0,
    paidAt: null,
    ...overrides,
  };
}

function makeReservation(overrides: Partial<FinancialReservation> = {}): FinancialReservation {
  return {
    date: '2026-05-20',
    finalPrice: 100,
    paymentStatus: 'pending',
    status: 'confirmed',
    ...overrides,
  };
}

describe('financialContracts', () => {
  it('classifies payment status using local due dates', () => {
    expect(getPaymentFinancialStatus(makePayment({ paid: true, dueDate: '2026-05-01' }), today)).toBe('paid');
    expect(getPaymentFinancialStatus(makePayment({ dueDate: '2026-05-17' }), today)).toBe('overdue');
    expect(getPaymentFinancialStatus(makePayment({ dueDate: today }), today)).toBe('pending');
    expect(getPaymentFinancialStatus(makePayment({ dueDate: '2026-05-19' }), today)).toBe('pending');
  });

  it('summarizes monthly payments with partial receipts', () => {
    const payments = [
      makePayment({ amount: 100, paid: true, paidAmount: 100 }),
      makePayment({ amount: 200, dueDate: '2026-05-10', paidAmount: 50 }),
      makePayment({ amount: 300, dueDate: '2026-05-25' }),
    ];

    expect(getRemainingPaymentAmount(payments[1])).toBe(150);
    expect(summarizePayments(payments, today)).toEqual({
      totalAmount: 600,
      totalPaid: 150,
      totalPending: 450,
      overdueCount: 1,
    });
  });

  it('summarizes arena receivables without counting cancelled reservations', () => {
    const reservations = [
      makeReservation({ finalPrice: 100, paymentStatus: 'paid' }),
      makeReservation({ finalPrice: 80, totalPaid: 30, remainingBalance: 50, date: '2026-05-10', paymentStatus: 'pending' }),
      makeReservation({ finalPrice: 60, date: '2026-05-25', paymentStatus: 'pending' }),
      makeReservation({ finalPrice: 999, status: 'cancelled', paymentStatus: 'paid' }),
    ];

    expect(getReservationPaidAmount(reservations[1])).toBe(30);
    expect(getReservationRemainingAmount(reservations[1])).toBe(50);
    expect(summarizeReservationReceivables(reservations, today)).toEqual({
      totalAmount: 240,
      totalPaid: 130,
      totalPending: 110,
      overdueCount: 1,
    });
  });

  it('caps arena reservation paid and remaining amounts for dashboard consistency', () => {
    const paidWithoutPartialHistory = makeReservation({ finalPrice: 120, paymentStatus: 'paid' });
    const overpaidPending = makeReservation({ finalPrice: 90, totalPaid: 120, paymentStatus: 'pending' });

    expect(getReservationPaidAmount(paidWithoutPartialHistory)).toBe(120);
    expect(getReservationRemainingAmount(paidWithoutPartialHistory)).toBe(0);
    expect(getReservationPaidAmount(overpaidPending)).toBe(90);
    expect(getReservationRemainingAmount(overpaidPending)).toBe(0);
  });

  it('calculates competence financial summary for payments, sales, arena reservations, and expenses', () => {
    const summary = calculateFinancialSummary({
      mode: 'competence',
      todayDate: today,
      includeArenaReservations: true,
      payments: [
        makePayment({ amount: 200, dueDate: '2026-05-10', paidAmount: 50 }),
        makePayment({ amount: 120, paid: true, paidAmount: 120 }),
      ],
      sales: [{ total: 40 }],
      reservations: [
        makeReservation({ finalPrice: 100, paymentStatus: 'paid' }),
        makeReservation({ finalPrice: 80, totalPaid: 30, remainingBalance: 50, date: '2026-05-10', paymentStatus: 'pending' }),
        makeReservation({ finalPrice: 900, status: 'cancelled', paymentStatus: 'paid' }),
      ],
      expenses: [
        { amount: 30, paid: true },
        { amount: 999, paid: false },
      ],
    });

    expect(summary.expectedRevenue).toBe(540);
    expect(summary.receivedRevenue).toBe(340);
    expect(summary.overdueRevenue).toBe(200);
    expect(summary.pendingRevenue).toBe(0);
    expect(summary.totalExpensesPaid).toBe(30);
    expect(summary.netProfit).toBe(310);
    expect(summary.revenueProgress).toBeCloseTo((340 / 540) * 100);
  });

  it('calculates cashflow summary from due dates and paid dates in range', () => {
    const summary = calculateFinancialSummary({
      mode: 'cashflow',
      todayDate: '2026-05-19',
      range: { start: '2026-05-18', end: '2026-05-18' },
      payments: [
        makePayment({ amount: 100, dueDate: '2026-05-18', paidAmount: 20 }),
        makePayment({ amount: 200, dueDate: '2026-05-01', paid: true, paidAmount: 200, paidAt: '2026-05-18T10:00:00' }),
        makePayment({ amount: 300, dueDate: '2026-05-19' }),
      ],
      sales: [{ total: 50 }],
    });

    expect(summary.expectedRevenue).toBe(150);
    expect(summary.receivedRevenue).toBe(250);
    expect(summary.overdueRevenue).toBe(80);
    expect(summary.pendingRevenue).toBe(0);
    expect(summary.revenueProgress).toBeCloseTo((250 / 150) * 100);
  });
});
