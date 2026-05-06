import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Payment, Attendance } from '@/data/mockData';
import { useTheme } from 'next-themes';
import { formatCurrency } from '@/lib/formatCurrency';

interface DashboardChartsProps {
    payments: Payment[];
    attendance: Attendance[];
    privacyMode: boolean;
    isArena?: boolean;
    reservations?: any[];
    sales?: any[];
}

export function DashboardCharts({ 
    payments, 
    attendance, 
    privacyMode, 
    isArena = false, 
    reservations = [], 
    sales = [] 
}: DashboardChartsProps) {
    const { theme } = useTheme();

    // Calculate Revenue Data by month
    const revenueMap: Record<string, { expected: number; paid: number }> = {};

    if (isArena) {
        // Arena: Bookings (Reservations) + Product Sales
        reservations.forEach(r => {
            if (r.status !== 'cancelled') {
                const month = r.date.slice(0, 7); // e.g., "2026-03"
                if (!revenueMap[month]) revenueMap[month] = { expected: 0, paid: 0 };
                revenueMap[month].expected += r.finalPrice;
                if (r.paymentStatus === 'paid') {
                    revenueMap[month].paid += r.finalPrice;
                }
            }
        });

        sales.forEach(s => {
            const month = s.soldAt.slice(0, 7);
            if (!revenueMap[month]) revenueMap[month] = { expected: 0, paid: 0 };
            revenueMap[month].expected += s.total;
            revenueMap[month].paid += s.total;
        });
    } else {
        // School / Other: Monthly plan payments + Product Sales
        payments.forEach(payment => {
            const month = payment.monthRef;
            if (!revenueMap[month]) revenueMap[month] = { expected: 0, paid: 0 };
            revenueMap[month].expected += payment.amount;
            if (payment.paid) revenueMap[month].paid += payment.amount;
        });

        sales.forEach(s => {
            const month = s.soldAt.slice(0, 7);
            if (!revenueMap[month]) revenueMap[month] = { expected: 0, paid: 0 };
            revenueMap[month].expected += s.total;
            revenueMap[month].paid += s.total;
        });
    }

    const revenueData = Object.keys(revenueMap)
        .sort()
        .slice(-6) // Last 6 months
        .map(month => ({
            name: month.split('-').reverse().join('/'),
            'Faturamento Total': revenueMap[month].expected,
            Recebido: revenueMap[month].paid,
        }));

    // Calculate Attendance / Bookings Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const secondChartData = last7Days.map(date => {
        if (isArena) {
            const dayReservations = reservations.filter(r => r.date === date && r.status !== 'cancelled');
            return {
                name: date.split('-').slice(1).reverse().join('/'), // DD/MM
                Total: dayReservations.length,
            };
        } else {
            const dayAttendance = attendance.filter(a => a.date === date);
            const total = dayAttendance.length;
            const presentCount = dayAttendance.filter(a => a.present).length;
            return {
                name: date.split('-').slice(1).reverse().join('/'), // DD/MM
                Presenças: presentCount,
                Ausências: total - presentCount,
                Total: total,
            };
        }
    });

    const tooltipFormatter = (value: number) => {
        if (privacyMode) return ['••••', ''];
        return [formatCurrency(value), ''];
    };

    const attendanceTooltipFormatter = (value: number) => {
        if (privacyMode) return ['••••', ''];
        return [value, ''];
    };

    const chartColorPrimary = theme === 'dark' ? '#10b981' : '#059669'; // Tailwind Emerald
    const chartColorSecondary = theme === 'dark' ? '#334155' : '#cbd5e1'; // Tailwind Slate

    const maxRevenue = Math.max(0, ...revenueData.map(d => d['Faturamento Total']));
    const maxSecondValue = Math.max(0, ...secondChartData.map(d => isArena ? (d.Total || 0) : ((d.Presenças || 0) + (d.Ausências || 0))));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Receita Mensal</CardTitle>
                    <CardDescription>
                        {isArena 
                          ? 'Expectativa vs Recebimentos de reservas e vendas recentes' 
                          : 'Expectativa vs Recebimentos nos últimos 6 meses'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full mt-4">
                        {maxRevenue === 0 ? (
                            <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                                <p className="text-muted-foreground font-medium text-sm">Sem dados</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => privacyMode ? '•••' : formatCurrency(val)}
                                    />
                                    <Tooltip
                                        cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                                        contentStyle={{ backgroundColor: theme === 'dark' ? '#020817' : '#ffffff', borderRadius: '8px' }}
                                        formatter={tooltipFormatter}
                                    />
                                    <Bar dataKey="Faturamento Total" fill={chartColorSecondary} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Recebido" fill={chartColorPrimary} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{isArena ? 'Volume de Locações' : 'Frequência (Últimos 7 dias)'}</CardTitle>
                    <CardDescription>
                        {isArena 
                          ? 'Quantidade de reservas realizadas nos últimos 7 dias' 
                          : 'Evolução de presenças nas aulas recentes'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full mt-4">
                        {maxSecondValue === 0 ? (
                            <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-xl border border-dashed border-border/50">
                                <p className="text-muted-foreground font-medium text-sm">Sem dados</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={secondChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColorPrimary} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={chartColorPrimary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => privacyMode ? '•••' : val}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? '#020817' : '#ffffff', borderRadius: '8px' }}
                                        formatter={attendanceTooltipFormatter}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey={isArena ? "Total" : "Presenças"} 
                                        name={isArena ? "Reservas" : "Presenças"}
                                        stroke={chartColorPrimary} 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#colorPresent)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
