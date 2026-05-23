import { useState, useMemo } from 'react';
import { Eye, EyeOff, Users, Calendar, CheckCircle, DollarSign, TrendingUp, Activity, UserMinus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { usePayments } from '@/hooks/queries/usePayments';
import { useCourts } from '@/hooks/queries/useCourts';
import { PAYMENT_METHOD_LABELS as RESERVATION_PAYMENT_METHOD_LABELS, useReservations, type PaymentMethod as ReservationPaymentMethod } from '@/hooks/queries/useReservations';
import { getPaymentMethodLabel, useSales, type PaymentMethod as SalePaymentMethod } from '@/hooks/queries/useSales';
import { useExpenses } from '@/hooks/queries/useExpenses';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { formatCurrency } from '@/lib/formatCurrency';
import { getReservationPaidAmount, getReservationRemainingAmount } from '@/lib/financialContracts';
import { cn } from '@/lib/utils';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { getLocalTodayDate, toLocalDateString } from '@/lib/dateUtils';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = {
  primary: 'hsl(24, 95%, 53%)',
  secondary: 'hsl(222, 47%, 20%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  destructive: 'hsl(0, 84%, 60%)',
  emerald: 'hsl(152, 68%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  violet: 'hsl(263, 70%, 55%)',
  slate: 'hsl(215, 16%, 47%)',
};

type FilterPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

const filterLabels: Record<FilterPeriod, string> = {
  day: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
  all: 'Todos',
};

type FinancialOriginKey = 'payments' | 'reservations' | 'direct_sales' | 'comandas';
type ReportPaymentMethod = SalePaymentMethod | ReservationPaymentMethod;

type FinancialOriginDatum = {
  key: FinancialOriginKey;
  name: string;
  description: string;
  expected: number;
  received: number;
  pending: number;
  overdue: number;
  count: number;
  color: string;
};

type PaymentMethodDatum = {
  method: ReportPaymentMethod;
  label: string;
  total: number;
  count: number;
  color: string;
};

const PAYMENT_METHOD_COLORS: Record<ReportPaymentMethod, string> = {
  dinheiro: COLORS.success,
  pix: COLORS.emerald,
  cartao: COLORS.violet,
  cartao_debito: COLORS.primary,
  cartao_credito: COLORS.warning,
  a_receber: COLORS.slate,
};

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function getReportPaymentMethodLabel(method: ReportPaymentMethod) {
  if (method === 'dinheiro' || method === 'pix' || method === 'cartao_credito' || method === 'cartao_debito') {
    return getPaymentMethodLabel(method);
  }

  return RESERVATION_PAYMENT_METHOD_LABELS[method];
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(period: FilterPeriod): { start: string; end: string } | null {
  if (period === 'all') return null;
  const now = new Date();
  
  let start: Date;
  let endD = new Date(now);

  switch (period) {
    case 'day':
      start = new Date(now);
      endD = new Date(now);
      break;
    case 'week': {
      start = new Date(now);
      const dow = start.getDay();
      start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
      endD = new Date(start);
      endD.setDate(start.getDate() + 6);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      endD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      endD = new Date(now.getFullYear(), 11, 31);
      break;
  }

  return { 
    start: formatLocalDate(start!), 
    end: formatLocalDate(endD) 
  };
}

/**
 * Returns monthRef strings for filtering payments by monthRef
 * (consistent with Dashboard's monthRef-based filtering).
 */
function getMonthRefsForPeriod(period: FilterPeriod): string[] | null {
  if (period === 'all') return null;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  switch (period) {
    case 'day':
    case 'week':
    case 'month':
      return [currentMonth];
    case 'year': {
      const year = now.getFullYear();
      return Array.from({ length: 12 }, (_, i) => 
        `${year}-${String(i + 1).padStart(2, '0')}`
      );
    }
    default:
      return null;
  }
}

export default function ReportsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const { trainings } = useTrainings();
  const { attendance } = useAttendance();
  const { payments } = usePayments();
  const { courts } = useCourts();
  const { reservations } = useReservations();
  const { sales } = useSales();
  const { expenses } = useExpenses();
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [privacyMode, togglePrivacyMode] = usePrivacyMode();
  const { labels, isArena, isSportSchool } = useBusinessContext();

  const range = useMemo(() => getDateRange(period), [period]);
  const monthRefs = useMemo(() => getMonthRefsForPeriod(period), [period]);

  const filteredAttendance = useMemo(() => {
    if (!range) return attendance;
    return attendance.filter((a) => a.date >= range.start && a.date <= range.end);
  }, [attendance, range]);

  const filteredTrainings = useMemo(() => {
    if (!range) return trainings;
    return trainings.filter((t) => t.date >= range.start && t.date <= range.end);
  }, [trainings, range]);

  const filteredPayments = useMemo(() => {
    if (period === 'month' || period === 'year' || period === 'all') {
      if (!monthRefs) return payments;
      // Filtragem por competência (monthRef) para alinhar 100% com o Dashboard
      return payments.filter((p) => monthRefs.includes(p.monthRef));
    } else {
      if (!range) return payments;
      // Para "Dia" e "Semana", a visão é de CAIXA (Cashflow).
      // Entra o que vence no período OR o que foi pago no período.
      return payments.filter((p) => {
        const isDueInRange = p.dueDate >= range.start && p.dueDate <= range.end;
        const isPaidInRange = p.paidAt && p.paidAt.slice(0, 10) >= range.start && p.paidAt.slice(0, 10) <= range.end;
        return isDueInRange || isPaidInRange;
      });
    }
  }, [payments, monthRefs, range, period]);

  const filteredSales = useMemo(() => {
    if (!range) return sales;
    return sales.filter((s) => {
      const soldDate = s.soldAt.slice(0, 10);
      return soldDate >= range.start && soldDate <= range.end;
    });
  }, [sales, range]);

  const filteredExpenses = useMemo(() => {
    if (!range) return expenses;
    return expenses.filter((e) => {
      return e.date >= range.start && e.date <= range.end;
    });
  }, [expenses, range]);

  const totalExpensesPaid = useMemo(() => {
    return filteredExpenses.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // KPIs Calculations
  const presentCount = filteredAttendance.filter((a) => a.present).length;
  const absentCount = filteredAttendance.filter((a) => !a.present).length;
  const attendanceRate = filteredAttendance.length > 0
    ? Math.round((presentCount / filteredAttendance.length) * 100)
    : 0;

  const activeMonthly = getActiveMonthlyStudents(students, plans);
  const totalActive = activeMonthly.length;

  const filteredReservations = useMemo(() => {
    if (!range) return reservations;
    return reservations.filter(r => r.date >= range.start && r.date <= range.end && r.status !== 'cancelled');
  }, [reservations, range]);

  const reservationsByCourtData = useMemo(() => {
    if (!isArena) return [];
    return courts.filter(c => c.isActive).map(court => {
      const courtRes = filteredReservations.filter(r => r.courtId === court.id);
      return {
        name: court.name,
        hours: courtRes.reduce((acc, r) => acc + (r.durationMinutes / 60), 0),
        revenue: courtRes.reduce((acc, r) => acc + getReservationPaidAmount(r), 0)
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [courts, filteredReservations, isArena]);

  const topReservantesData = useMemo(() => {
    if (!isArena) return [];
    const map: Record<string, { count: number, revenue: number, name: string }> = {};
    filteredReservations.forEach(r => {
       r.reservanteIds.forEach(id => {
         const s = students.find(st => st.id === id);
         if (s) {
           if (!map[s.id]) map[s.id] = { count: 0, revenue: 0, name: s.name };
           map[s.id].count += 1;
           map[s.id].revenue += getReservationPaidAmount(r);
         }
       });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredReservations, students, isArena]);

  const todayDateStr = getLocalTodayDate();
  const isMonthlyFinancialView = period === 'month' || period === 'year' || period === 'all';

  const financialOriginData = useMemo<FinancialOriginDatum[]>(() => {
    const createOrigin = (
      origin: Omit<FinancialOriginDatum, 'pending'> & { pending?: number },
    ): FinancialOriginDatum => ({
      ...origin,
      pending: Math.max(0, origin.pending ?? (origin.expected - origin.received - origin.overdue)),
    });

    const origins: FinancialOriginDatum[] = [];

    let paymentsExpected = 0;
    let paymentsReceived = 0;
    let paymentsOverdue = 0;

    filteredPayments.forEach((payment) => {
      const paidAmount = Number(payment.paidAmount || 0);
      const remainingAmount = Math.max(0, payment.amount - paidAmount);

      if (isMonthlyFinancialView) {
        paymentsExpected += payment.amount;
        paymentsReceived += paidAmount;

        if (!payment.paid && payment.dueDate < todayDateStr) {
          paymentsOverdue += remainingAmount;
        }
        return;
      }

      const isDueInRange = range && payment.dueDate >= range.start && payment.dueDate <= range.end;
      const isPaidInRange = range && payment.paidAt && payment.paidAt.slice(0, 10) >= range.start && payment.paidAt.slice(0, 10) <= range.end;

      if (isDueInRange) {
        paymentsExpected += payment.amount;
        if (!payment.paid && payment.dueDate < todayDateStr) {
          paymentsOverdue += remainingAmount;
        }
      }

      if (isPaidInRange) {
        paymentsReceived += paidAmount;
      }
    });

    if (paymentsExpected > 0 || paymentsReceived > 0 || paymentsOverdue > 0) {
      origins.push(createOrigin({
        key: 'payments',
        name: 'Mensalidades',
        description: isMonthlyFinancialView ? 'Competência do período' : 'Vencimentos e recebimentos do caixa',
        expected: paymentsExpected,
        received: paymentsReceived,
        overdue: paymentsOverdue,
        count: filteredPayments.length,
        color: COLORS.primary,
      }));
    }

    if (isArena) {
      let reservationsExpected = 0;
      let reservationsReceived = 0;
      let reservationsOverdue = 0;

      filteredReservations.forEach((reservation) => {
        const paidAmount = getReservationPaidAmount(reservation);
        const remainingAmount = getReservationRemainingAmount(reservation);

        reservationsExpected += reservation.finalPrice;
        reservationsReceived += paidAmount;

        if (reservation.paymentStatus !== 'paid' && reservation.date < todayDateStr) {
          reservationsOverdue += remainingAmount;
        }
      });

      if (reservationsExpected > 0 || reservationsReceived > 0 || reservationsOverdue > 0) {
        origins.push(createOrigin({
          key: 'reservations',
          name: 'Reservas de Quadra',
          description: 'Avulsas e mensalistas da Arena',
          expected: reservationsExpected,
          received: reservationsReceived,
          overdue: reservationsOverdue,
          count: filteredReservations.length,
          color: COLORS.emerald,
        }));
      }
    }

    const directSales = filteredSales.filter((sale) => !sale.comandaId);
    const directSalesTotal = directSales.reduce((sum, sale) => sum + sale.total, 0);
    if (directSalesTotal > 0) {
      origins.push(createOrigin({
        key: 'direct_sales',
        name: 'Vendas Diretas',
        description: 'Produtos vendidos no balcão',
        expected: directSalesTotal,
        received: directSalesTotal,
        overdue: 0,
        count: new Set(directSales.map((sale) => sale.checkoutId || sale.id)).size,
        color: COLORS.warning,
      }));
    }

    const comandaSales = filteredSales.filter((sale) => Boolean(sale.comandaId));
    const comandaSalesTotal = comandaSales.reduce((sum, sale) => sum + sale.total, 0);
    if (comandaSalesTotal > 0) {
      origins.push(createOrigin({
        key: 'comandas',
        name: 'Comandas',
        description: 'Contas fechadas e baixadas',
        expected: comandaSalesTotal,
        received: comandaSalesTotal,
        overdue: 0,
        count: new Set(comandaSales.map((sale) => sale.comandaId || sale.checkoutId || sale.id)).size,
        color: COLORS.violet,
      }));
    }

    return origins;
  }, [
    filteredPayments,
    filteredReservations,
    filteredSales,
    isArena,
    isMonthlyFinancialView,
    range,
    todayDateStr,
  ]);

  const financialTotals = useMemo(() => {
    return financialOriginData.reduce(
      (totals, origin) => ({
        expectedRevenue: totals.expectedRevenue + origin.expected,
        receivedRevenue: totals.receivedRevenue + origin.received,
        overdueRevenue: totals.overdueRevenue + origin.overdue,
        pendingRevenue: totals.pendingRevenue + origin.pending,
      }),
      { expectedRevenue: 0, receivedRevenue: 0, overdueRevenue: 0, pendingRevenue: 0 },
    );
  }, [financialOriginData]);

  const expectedRevenue = financialTotals.expectedRevenue;
  const receivedRevenue = financialTotals.receivedRevenue;
  const overdueRevenue = financialTotals.overdueRevenue;
  const pendingRevenue = financialTotals.pendingRevenue;
  const revenueProgress = expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;
  const netProfit = receivedRevenue - totalExpensesPaid;

  const paymentMethodData = useMemo<PaymentMethodDatum[]>(() => {
    const methodMap = new Map<ReportPaymentMethod, PaymentMethodDatum>();

    const addPaymentMethod = (method: ReportPaymentMethod, amount: number) => {
      if (amount <= 0 || method === 'a_receber') return;
      const current = methodMap.get(method) || {
        method,
        label: getReportPaymentMethodLabel(method),
        total: 0,
        count: 0,
        color: PAYMENT_METHOD_COLORS[method],
      };

      methodMap.set(method, {
        ...current,
        total: current.total + amount,
        count: current.count + 1,
      });
    };

    filteredSales.forEach((sale) => {
      addPaymentMethod(sale.paymentMethod, sale.total);
    });

    if (isArena) {
      filteredReservations.forEach((reservation) => {
        const partialPayments = reservation.partialPayments || [];
        if (partialPayments.length > 0) {
          partialPayments.forEach((payment) => {
            addPaymentMethod(payment.method, payment.amount);
          });
          return;
        }

        if (reservation.paymentStatus === 'paid') {
          addPaymentMethod(reservation.paymentMethod, reservation.finalPrice);
          return;
        }

        const paidAmount = getReservationPaidAmount(reservation);
        if (paidAmount > 0) {
          addPaymentMethod(reservation.paymentMethod, paidAmount);
        }
      });
    }

    return Array.from(methodMap.values()).sort((a, b) => b.total - a.total);
  }, [filteredReservations, filteredSales, isArena]);

  // Chart Data - Dynamic Evolution for Attendance
  const evolutionAttendanceData = useMemo(() => {
    if (period === 'year' || period === 'all') {
      const yearToUse = period === 'year' ? new Date().getFullYear() : new Date().getFullYear();
      const months = Array.from({ length: 12 }, (_, i) => ({ year: yearToUse, month: i + 1 }));
      return months.map(({ year, month }) => {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const attInMonth = attendance.filter(a => a.date.startsWith(monthStr));
        const p = attInMonth.filter(a => a.present).length;
        const f = attInMonth.filter(a => !a.present).length;
        const label = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short' });
        return { name: label.charAt(0).toUpperCase() + label.slice(1), presentes: p, faltas: f };
      });
    } else {
      if (!range) return [];
      const days = [];
      const start = new Date(range.start);
      const end = new Date(range.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
      return days.map(d => {
        const dateStr = toLocalDateString(d);
        const attInDay = attendance.filter(a => a.date === dateStr);
        const p = attInDay.filter(a => a.present).length;
        const f = attInDay.filter(a => !a.present).length;
        
        // Use split to avoid timezone shift on label
        const [year, month, day] = dateStr.split('-');
        const name = `${day}/${month}`;
        
        return { name, presentes: p, faltas: f };
      });
    }
  }, [attendance, period, range]);

  const financialData = [{
    name: filterLabels[period],
    Total: expectedRevenue,
    Recebido: receivedRevenue,
    Pendente: pendingRevenue > 0 ? pendingRevenue : 0,
    Atrasado: overdueRevenue,
    Despesas: totalExpensesPaid,
    Lucro: netProfit
  }];

  const levelData = [
    { name: 'Iniciante', value: activeMonthly.filter((s) => s.level === 'iniciante').length, color: COLORS.emerald },
    { name: 'Intermediário', value: activeMonthly.filter((s) => s.level === 'intermediário').length, color: COLORS.amber },
    { name: 'Avançado', value: activeMonthly.filter((s) => s.level === 'avançado').length, color: COLORS.violet },
  ];

  const studentKey = labels.studentLabel.toLowerCase();
  type PlanDistributionDatum = { name: string } & Record<string, string | number>;
  const planDistributionData: PlanDistributionDatum[] = plans.filter(p => activeMonthly.some(s => s.planId === p.id)).map(plan => ({
    name: plan.name,
    [studentKey]: activeMonthly.filter((s) => s.planId === plan.id).length,
  })).sort((a, b) => Number(b[studentKey]) - Number(a[studentKey]));

  // Historical Financial Data - Dynamic Evolution based on period
  const historicalFinancialData = useMemo(() => {
    if (period === 'year' || period === 'all') {
      const yearToUse = period === 'year' ? new Date().getFullYear() : new Date().getFullYear();
      const months = Array.from({ length: 12 }, (_, i) => ({ year: yearToUse, month: i + 1 }));
      return months.map(({ year, month }) => {
        const monthRef = `${year}-${String(month).padStart(2, '0')}`;
        
        // 1. Pagamentos
        const monthPayments = payments.filter(p => p.monthRef === monthRef);
        let expected = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
        let received = monthPayments.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
        
        // 2. Vendas de Produtos
        const monthSales = sales.filter(s => s.soldAt.startsWith(monthRef));
        const salesTotal = monthSales.reduce((acc, curr) => acc + curr.total, 0);
        expected += salesTotal;
        received += salesTotal;

        // 3. Reservas (Arena)
        if (isArena) {
          const monthReservations = reservations.filter(r => r.date.startsWith(monthRef) && r.status !== 'cancelled');
          expected += monthReservations.reduce((acc, r) => acc + r.finalPrice, 0);
          received += monthReservations.reduce((acc, r) => acc + getReservationPaidAmount(r), 0);
        }

        // 4. Despesas Pagas (Sincronia!)
        const monthExpenses = expenses.filter(e => e.date.startsWith(monthRef) && e.paid);
        const expensesTotal = monthExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        const label = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short' });
        return { 
          name: label.charAt(0).toUpperCase() + label.slice(1), 
          Total: expected, 
          Recebido: received,
          Despesas: expensesTotal,
          Lucro: received - expensesTotal
        };
      });
    } else {
      if (!range) return [];
      const days = [];
      const start = new Date(range.start);
      const end = new Date(range.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }

      // Usa filteredPayments (filtrados por monthRef, igual aos KPIs) para que
      // o total do gráfico bata com os cards. Distribui visualmente pelo dueDate.
      return days.map(d => {
        const dateStr = toLocalDateString(d);
        
        // 1. Pagamentos — mesma base dos KPIs (filteredPayments por monthRef)
        let expected = filteredPayments
          .filter(p => p.dueDate === dateStr)
          .reduce((acc, curr) => acc + curr.amount, 0);
          
        let received = filteredPayments
          .filter(p => p.paidAt ? p.paidAt.slice(0, 10) === dateStr : (p.dueDate === dateStr && p.paid))
          .reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);

        // 2. Vendas de Produtos
        const daySales = sales.filter(s => s.soldAt.startsWith(dateStr));
        const salesTotal = daySales.reduce((acc, curr) => acc + curr.total, 0);
        expected += salesTotal;
        received += salesTotal;

        // 3. Reservas (Arena)
        if (isArena) {
          const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
          expected += dayReservations.reduce((acc, r) => acc + r.finalPrice, 0);
          received += dayReservations.reduce((acc, r) => acc + getReservationPaidAmount(r), 0);
        }

        // 4. Despesas Pagas (Sincronia!)
        const dayExpenses = expenses.filter(e => e.date === dateStr && e.paid);
        const expensesTotal = dayExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        
        // Use split para evitar problemas de fuso horário no label
        const [year, month, day] = dateStr.split('-');
        const name = `${day}/${month}`;
        
        return { 
          name, 
          Total: expected, 
          Recebido: received,
          Despesas: expensesTotal,
          Lucro: received - expensesTotal
        };
      });
    }
  }, [payments, filteredPayments, sales, reservations, expenses, isArena, period, range]);

  // Retention Data (Funnel)
  const retentionData = useMemo(() => {
    const ativos = students.filter(s => s.active && !s.isTrial).length;
    const experimentais = students.filter(s => s.active && s.isTrial).length;
    const inativos = students.filter(s => !s.active).length;
    return [
      { name: `${labels.studentLabel} Ativos`, value: ativos, color: COLORS.emerald },
      { name: `${labels.trainingLabel} Experimentais`, value: experimentais, color: COLORS.warning },
      { name: 'Inativos (Churn)', value: inativos, color: COLORS.destructive },
    ];
  }, [students, labels.studentLabel, labels.trainingLabel]);

  const churnRate = useMemo(() => {
    const total = students.length;
    const inativos = students.filter(s => !s.active).length;
    if (total === 0) return 0;
    return Math.round((inativos / total) * 100);
  }, [students]);

  const customTooltipStyle = {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    color: 'hsl(var(--foreground))',
    fontSize: '13px',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />
      <main className="container py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight text-foreground">Relatórios Analíticos</h1>
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">Métricas, faturamento e engajamento da sua {labels.ctLabelShort.toLowerCase()}.</p>
          </div>

          <div className="flex w-full items-center gap-2 overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-1.5 sm:gap-3 md:w-auto">
            <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 bg-background shadow-sm border border-border/50 hover:bg-muted" onClick={togglePrivacyMode} title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}>
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-primary" />}
            </Button>
            {/* Period Filter */}
            <div className="flex min-w-max rounded-lg overflow-hidden border border-border/50 bg-background shadow-sm">
              {(Object.keys(filterLabels) as FilterPeriod[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={cn(
                    'whitespace-nowrap px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-colors',
                    period === key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {filterLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs Premium */}
        <section className={cn(
          "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 xl:gap-3 animate-fade-in",
          isSportSchool ? "xl:grid-cols-5" : "xl:grid-cols-7"
        )}>
          <StatCard 
            title={`${labels.studentLabel} Base`} 
            value={privacyMode ? '••••' : totalActive} 
            icon={Users} 
            description={privacyMode ? '' : `${labels.planLabel} mensais ativos`} 
          />
          <StatCard 
            title={`${labels.trainingLabel} (${filterLabels[period]})`} 
            value={privacyMode ? '••••' : filteredTrainings.length} 
            icon={Calendar} 
            variant="default" 
            description={filteredTrainings.length === 1 ? `${labels.trainingLabelSingular} computado` : `${labels.trainingLabel} computados`}
          />
          <StatCard 
            title="Engajamento" 
            value={privacyMode ? '••••' : `${attendanceRate}%`} 
            icon={CheckCircle} 
            description={privacyMode ? '' : `Média de ${labels.attendanceLabel.toLowerCase()}`}
            progress={privacyMode ? undefined : { value: attendanceRate, label: `Taxa de ${labels.attendanceLabel}` }}
          />
          <StatCard 
            title="Faturamento Total" 
            value={privacyMode ? '••••' : formatCurrency(expectedRevenue)} 
            icon={DollarSign} 
            description={privacyMode ? '' : 'Total bruto faturado'}
          />
          <StatCard 
            title="Caixa (Recebido)" 
            value={privacyMode ? '••••' : formatCurrency(receivedRevenue)} 
            icon={CheckCircle} 
            variant="primary"
            progress={privacyMode ? undefined : { value: revenueProgress, label: "Meta vs Esperado" }}
          />
          {!isSportSchool && (
            <StatCard 
              title="Despesas (Pagas)" 
              value={privacyMode ? '••••' : formatCurrency(totalExpensesPaid)} 
              icon={DollarSign} 
              variant="default"
              description={privacyMode ? '' : 'Total de despesas pagas'}
            />
          )}
          {!isSportSchool && (
            <StatCard 
              title="Resultado Líquido" 
              value={privacyMode ? '••••' : formatCurrency(netProfit)} 
              icon={TrendingUp} 
              variant="success"
              description={privacyMode ? '' : netProfit >= 0 ? 'Saldo positivo (Superávit)' : 'Saldo negativo (Déficit)'}
            />
          )}
        </section>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
          
          {/* Gráfico Financeiro Real */}
          <div className="card-interactive p-4 md:p-6 border-primary/10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Balanço Financeiro
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Realidade dos pagamentos no período selecionado</p>
              </div>
            </div>
            <div className="h-[280px] w-full">
              {!privacyMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData} barSize={50} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} formatter={(value: number) => [formatCurrency(value), '']} />
                    <Bar dataKey="Total" name="Esperado" fill="hsl(var(--muted-foreground)/0.3)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recebido" stackId="a" name="Recebido" fill={COLORS.success} radius={pendingRevenue === 0 && overdueRevenue === 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]} />
                    <Bar dataKey="Pendente" stackId="a" name="Pendente" fill={COLORS.slate} radius={overdueRevenue === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                    <Bar dataKey="Atrasado" stackId="a" name="Atrasado" fill={COLORS.destructive} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas" name="Despesas" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro" name="Lucro Líquido" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                  <EyeOff className="h-6 w-6 text-muted-foreground/50 mb-2"/>
                  <p className="text-muted-foreground font-medium text-sm">Dados Financeiros Ocultos</p>
                </div>
              )}
            </div>
          </div>

          {/* Receita por Origem */}
          <div className="card-interactive p-4 md:p-6 border-emerald/10">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" /> Receita por Origem
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Separação do caixa por frente operacional</p>
              </div>
            </div>

            {financialOriginData.length > 0 ? (
              <div className="space-y-3">
                {financialOriginData.map((origin) => (
                  <div key={origin.key} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{origin.name}</p>
                        <p className="text-xs text-muted-foreground">{origin.description} · {origin.count} registro(s)</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-600">
                          {privacyMode ? '••••' : formatCurrency(origin.received)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">recebido</p>
                      </div>
                    </div>

                    {!privacyMode && (
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${getPercent(origin.received, origin.expected)}%`,
                            backgroundColor: origin.color,
                          }}
                        />
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Esperado</p>
                        <p className="font-semibold text-foreground">{privacyMode ? '••••' : formatCurrency(origin.expected)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pendente</p>
                        <p className="font-semibold text-foreground">{privacyMode ? '••••' : formatCurrency(origin.pending)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Atrasado</p>
                        <p className="font-semibold text-destructive">{privacyMode ? '••••' : formatCurrency(origin.overdue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-sm font-medium text-muted-foreground">
                Nenhuma receita encontrada no período.
              </div>
            )}
          </div>

          {/* Recebido por Forma de Pagamento */}
          <div className="card-interactive p-4 md:p-6 border-primary/10">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" /> Recebido por Forma
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Vendas, comandas e reservas baixadas</p>
              </div>
            </div>

            {paymentMethodData.length > 0 ? (
              <div className="space-y-4">
                {paymentMethodData.map((method) => (
                  <div key={method.method}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{method.label}</p>
                        <p className="text-xs text-muted-foreground">{method.count} lançamento(s)</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-foreground">
                        {privacyMode ? '••••' : formatCurrency(method.total)}
                      </p>
                    </div>
                    {!privacyMode && (
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${getPercent(method.total, receivedRevenue)}%`,
                            backgroundColor: method.color,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-sm font-medium text-muted-foreground">
                Nenhum recebimento baixado no período.
              </div>
            )}
          </div>

          {/* Gráfico de Presença X Faltas */}
          <div className="card-interactive p-4 md:p-6">
            <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">{labels.attendanceLabel} Geral</h3>
            <p className="text-sm text-muted-foreground mb-6">Controle de engajamento nos registros realizados</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionAttendanceData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Bar dataKey="presentes" name="Presentes" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="faltas" name="Ausentes (Faltas)" fill={COLORS.slate} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demografia: Alunos por Nível */}
          {!isArena && (
            <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
              <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Perfil Técnico (Base Ativa)</h3>
              <p className="text-sm text-muted-foreground mb-6">Distribuição da base por nível</p>
              <div className="h-[250px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={levelData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value"
                      label={({ name, value }) => privacyMode ? '••••' : `${value}`} labelLine={{ strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' }}>
                      {levelData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [privacyMode ? '••••' : value, labels.studentLabel]} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Demografia: Planos */}
          {!isArena && (
            <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
              <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Aderência de {labels.planLabel}</h3>
              <p className="text-sm text-muted-foreground mb-6">Preferência da base de {labels.studentLabel.toLowerCase()}</p>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planDistributionData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={160}
                    />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : `${value} ${labels.studentLabelSingular.toLowerCase()}(s)`, 'Aderência']} />
                    <Bar dataKey={studentKey} fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={28}>
                      {
                        planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.primary : 'hsl(var(--primary)/0.6)'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {isArena && (
            <>
              {/* Ocupação por Quadra (Horas) */}
              <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Ocupação por Quadra</h3>
                <p className="text-sm text-muted-foreground mb-6">Horas reservadas no período</p>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reservationsByCourtData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [`${value}h`, 'Horas']} />
                      <Bar dataKey="hours" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recebido por Quadra (Pie) */}
              <div className="card-interactive p-4 md:p-6 lg:col-span-1 border-border/60">
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Recebido por Quadra</h3>
                <p className="text-sm text-muted-foreground mb-6">Distribuição da receita recebida</p>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reservationsByCourtData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="revenue"
                        label={({ name, value }) => privacyMode ? '••••' : formatCurrency(value)} labelLine={{ strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' }}>
                        {reservationsByCourtData.map((entry, index) => (<Cell key={index} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [privacyMode ? '••••' : formatCurrency(value), 'Recebido']} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Histórico Financeiro Mensal */}
          <div className="card-interactive p-4 md:p-6 lg:col-span-2 mt-4 border-primary/20 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Evolução de Faturamento
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Comparativo de receita prevista vs realizada ({filterLabels[period]})</p>
              </div>
            </div>
            <div className="h-[320px] w-full">
              {!privacyMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalFinancialData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }} formatter={(value: number) => [formatCurrency(value), '']} />
                    <Line type="monotone" dataKey="Total" name="Previsto (Total)" stroke={COLORS.slate} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Recebido" name="Realizado (Caixa)" stroke={COLORS.emerald} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                  <EyeOff className="h-6 w-6 text-muted-foreground/50 mb-2"/>
                  <p className="text-muted-foreground font-medium text-sm">Dados Históricos Ocultos</p>
                </div>
              )}
            </div>
          </div>

          {/* Métricas de Retenção e Churn */}
          {!isArena && (
            <div className="card-interactive p-4 md:p-6 lg:col-span-2 border-destructive/10 mt-4">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-lg md:text-xl text-foreground flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-destructive" /> Retenção e Churn
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Visão geral do funil de retenção e perda de {labels.studentLabel.toLowerCase()} na base inteira</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-lg text-center shrink-0">
                  <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-0.5">Taxa de Churn</p>
                  <p className="text-2xl font-display font-bold text-destructive">{privacyMode ? '••%' : `${churnRate}%`}</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retentionData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={150} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : `${value} ${labels.studentLabelSingular.toLowerCase()}(s)`, 'Quantidade']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                      {
                        retentionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {isArena && (
            <>
              {/* Top Reservantes */}
              <div className="card-interactive p-4 md:p-6 lg:col-span-2 border-primary/10 mt-4">
                <h3 className="font-display font-bold text-lg md:text-xl text-foreground mb-1">Top Reservantes</h3>
                <p className="text-sm text-muted-foreground mb-6">Clientes que geraram mais caixa recebido no período</p>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topReservantesData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }} axisLine={false} tickLine={false} width={150} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} formatter={(value: number) => [privacyMode ? '••••' : formatCurrency(value), 'Recebido']} />
                      <Bar dataKey="revenue" fill={COLORS.emerald} radius={[0, 4, 4, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
