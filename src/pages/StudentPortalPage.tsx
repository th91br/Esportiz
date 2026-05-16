import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, XCircle, LogOut, Clock, Calendar, GraduationCap, 
  DollarSign, MapPin, Copy, QrCode, ClipboardList, BookOpen, UserCheck, ShieldAlert 
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { getLocalTodayDate } from '@/lib/dateUtils';
import {
  formatCpf,
  isTodayOrPastDate,
  isValidCpf,
  isValidUuid,
} from '@/lib/publicPortalSecurity';

interface AttendanceLog {
  date: string;
  status: 'present' | 'absent';
  notes?: string;
}

interface PaymentLog {
  id: string;
  amount: number;
  paid_amount: number;
  paid: boolean;
  due_date: string;
  paid_at: string | null;
  month_ref: string;
}

interface StudentPortalData {
  id: string;
  name: string;
  school_name: string;
  plan_name: string;
}

interface PaymentConfig {
  pix_key: string | null;
  pix_receiver: string | null;
}

interface GroupPortalData {
  id: string;
  name: string;
  location?: string;
  schedule: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
}

interface AttendanceStats {
  percent: number;
  total_classes: number;
  presences: number;
  absences: number;
}

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function StudentPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerId = searchParams.get('ct');
  const hasInvalidOwnerId = ownerId !== null && !isValidUuid(ownerId);
  const scopedOwnerId = isValidUuid(ownerId) ? ownerId : null;

  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Login Input State
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Portal Data State
  const [student, setStudent] = useState<StudentPortalData | null>(null);
  const [groups, setGroups] = useState<GroupPortalData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  // Authenticate student via credentials
  const authenticate = async (forceCpf?: string, forceBirthDate?: string) => {
    const loginCpf = forceCpf || cpf;
    const loginBirthDate = forceBirthDate || birthDate;

    if (hasInvalidOwnerId) {
      toast.error('Link do portal invalido.');
      return;
    }

    if (!isValidCpf(loginCpf)) {
      toast.error('CPF invalido. Confira os numeros digitados.');
      return;
    }

    if (!isTodayOrPastDate(loginBirthDate)) {
      toast.error('Data de nascimento invalida.');
      return;
    }

    setAuthenticating(true);
    try {
      const { data, error } = await supabase.rpc('get_student_portal_data', {
        p_cpf: formatCpf(loginCpf),
        p_birth_date: loginBirthDate,
        p_user_id: scopedOwnerId,
      });

      if (error) throw error;

      if (data && data.authenticated) {
        setStudent(data.student);
        setGroups(data.groups || []);
        setAttendanceStats(data.attendance_stats);
        setAttendanceLogs(data.attendance_logs || []);
        setPayments(data.payments || []);
        setPaymentConfig(data.payment_config || null);
        setAuthenticated(true);
      } else {
        toast.error('Dados incorretos. CPF ou Data de Nascimento inválidos.');
      }
    } catch (err: unknown) {
      console.error('Erro de autenticação no portal:', err);
      toast.error('Ocorreu um erro ao conectar com o servidor.');
    } finally {
      setAuthenticating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  // Mask CPF
  const handleCpfChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setCpf(formatCpf(clean));
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || !birthDate) {
      toast.error('Preencha o CPF e a Data de Nascimento.');
      return;
    }
    authenticate(cpf, birthDate);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setStudent(null);
    setGroups([]);
    setAttendanceStats(null);
    setAttendanceLogs([]);
    setPayments([]);
    setPaymentConfig(null);
    setSearchParams(scopedOwnerId ? { ct: scopedOwnerId } : {});
    setCpf('');
    setBirthDate('');
  };

  const copyPixKey = (amountStr: string) => {
    if (!paymentConfig?.pix_key) {
      toast.info('Pix ainda nao configurado pela escola.');
      return;
    }

    navigator.clipboard.writeText(paymentConfig.pix_key);
    toast.success(`Chave Pix copiada com sucesso! Insira o valor de ${amountStr}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Carregando portal do aluno...</p>
      </div>
    );
  }

  if (hasInvalidOwnerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-border/80 card-elevated">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold font-display text-foreground">Link Invalido</CardTitle>
            <CardDescription className="text-sm">
              Este link do portal possui uma identificacao invalida. Solicite um novo link para a secretaria.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full btn-primary-gradient" onClick={() => setSearchParams({})}>
              Acessar Portal Manualmente
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- VIEW: LOGIN PORTAL ---
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6">
        <Card className="max-w-md w-full border-border/60 card-elevated shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-indigo-600" />
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-black font-display text-foreground tracking-tight">Portal do Aluno</CardTitle>
            <CardDescription className="text-sm">
              Consulte seu cronograma de aulas, frequência e faturamento mensal de forma integrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold uppercase text-muted-foreground">CPF do Aluno</label>
                <Input 
                  required 
                  placeholder="000.000.000-00" 
                  value={cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold uppercase text-muted-foreground">Data de Nascimento</label>
                <Input 
                  required 
                  type="date" 
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full btn-primary-gradient py-5 font-bold mt-2"
                disabled={authenticating}
              >
                {authenticating ? 'Autenticando...' : 'Acessar Portal'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t border-border/40 p-4 justify-center">
            <span className="text-[10px] text-muted-foreground/80 leading-normal text-center max-w-xs">
              Esportiz Security: Suas informações cadastrais e financeiras estão encriptadas com criptografia de ponta.
            </span>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- VIEW: PORTAL DASHBOARD ---
  const attendancePercent = attendanceStats?.percent || 0;
  const isAttendanceGood = attendancePercent >= 85;
  const isAttendanceWarning = attendancePercent >= 75 && attendancePercent < 85;

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* HEADER DO PORTAL */}
      <header className="bg-background border-b border-border/50 sticky top-0 z-50 shadow-sm backdrop-blur">
        <div className="container max-w-6xl py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/10">
              <GraduationCap className="h-5.5 w-5.5" />
            </div>
            <div>
              <h2 className="text-base font-black font-display text-foreground leading-tight">{student.school_name}</h2>
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase font-display">Portal do Aluno</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="text-muted-foreground border-border/60 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Sair do Portal
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl py-8 space-y-8">
        {/* BANNER DE BEM VINDO */}
        <div className="bg-background border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-elevated">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Seja bem-vindo(a),</span>
            <h1 className="text-xl sm:text-2xl font-black font-display text-foreground tracking-tight">{student.name}</h1>
            <p className="text-sm text-muted-foreground">
              Plano Ativo: <strong className="text-foreground font-semibold">{student.plan_name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/15 px-3 py-1 text-xs border border-primary/20 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Matrícula Ativa
            </Badge>
          </div>
        </div>

        {/* SECTION METRICS & TIMETABLE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CARD 1: FREQUÊNCIA (ACADÊMICO) */}
          <Card className="border-border/50 shadow-sm card-elevated overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Frequência de Aulas
              </CardTitle>
              <CardDescription>Acompanhe suas faltas e aproveitamento escolar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center py-2">
                <div className="relative flex items-center justify-center">
                  {/* Circular progress bar SVG representation */}
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" className="text-muted/20" fill="transparent" />
                    <circle 
                      cx="56" 
                      cy="56" 
                      r="48" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      strokeDasharray={301.6} 
                      strokeDashoffset={301.6 - (301.6 * attendancePercent) / 100}
                      className={cn(
                        isAttendanceGood && "text-emerald-500",
                        isAttendanceWarning && "text-amber-500",
                        !isAttendanceGood && !isAttendanceWarning && "text-destructive"
                      )} 
                      strokeLinecap="round" 
                      fill="transparent" 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-foreground">{attendancePercent}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Presença</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-muted/40 p-3 rounded-xl border border-border/50">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Aulas</span>
                  <span className="font-bold text-foreground text-sm">{attendanceStats?.total_classes || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Presenças</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{attendanceStats?.presences || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Faltas</span>
                  <span className="font-bold text-destructive text-sm">{attendanceStats?.absences || 0}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border/30 py-3.5 px-4">
              <span className="text-[11px] text-muted-foreground leading-normal flex items-center gap-1.5">
                {attendancePercent < 85 ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" /> Alerta: Frequência abaixo do mínimo ideal de 85%.
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Parabéns! Excelente taxa de frequência.
                  </>
                )}
              </span>
            </CardFooter>
          </Card>

          {/* CARD 2: TURMA E HORÁRIOS */}
          <Card className="border-border/50 shadow-sm card-elevated lg:col-span-2 flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Grade de Horários e Salas
              </CardTitle>
              <CardDescription>Consulte os seus dias, disciplinas e locais de aula.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto opacity-40 mb-2" />
                  <p className="text-sm">Você ainda não está matriculado em uma turma específica.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div key={g.id} className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <GraduationCap className="h-4.5 w-4.5 text-primary" /> {g.name}
                        </span>
                        {g.location && (
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {g.location}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {Array.isArray(g.schedule) && g.schedule.length > 0 ? (
                          g.schedule.map((slot, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 bg-background border border-border/40 p-2.5 rounded-lg text-xs font-medium">
                              <Calendar className="h-4 w-4 text-primary shrink-0" />
                              <div>
                                <span className="text-foreground capitalize font-semibold block">{slot.day}</span>
                                <span className="text-muted-foreground text-[11px]">{slot.startTime} - {slot.endTime}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Cronograma ainda não cadastrado.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border/30 py-3.5 px-4 text-xs text-muted-foreground">
              Qualquer dúvida sobre horários, solicite mudança junto à secretaria de ensino.
            </CardFooter>
          </Card>
        </div>

        {/* SECTION FINANCIALS & HISTORICAL ATTENDANCE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CARD 3: FINANCEIRO (MENSALIDADES) */}
          <Card className="border-border/50 shadow-sm card-elevated lg:col-span-2 flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Faturas e Mensalidades
              </CardTitle>
              <CardDescription>Consulte os vencimentos e realize os seus pagamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto opacity-40 mb-2" />
                  <p className="text-sm">Nenhum registro de mensalidade encontrado para você.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {payments.map((p) => {
                    const isPartial = !p.paid && p.paid_amount > 0;
                    const isOverdue = !p.paid && p.due_date < getLocalTodayDate();
                    const remainingToPay = p.amount - (p.paid_amount || 0);

                    return (
                      <div key={p.id} className="bg-background border border-border/40 hover:border-border rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              Mensalidade de {monthNames[Number(p.month_ref.split('-')[1]) - 1]} / {p.month_ref.split('-')[1]}
                            </span>
                            {p.paid ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                                ✓ Pago
                              </Badge>
                            ) : isPartial ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                ⏳ Parcial
                              </Badge>
                            ) : isOverdue ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px]">
                                ⚠ Atrasado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]">
                                ⏳ Pendente
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            <span>Vence em: <strong className="text-foreground">{new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                            {p.paid_at && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Pago em: {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {isPartial && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Recebido: {formatCurrency(p.paid_amount)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">
                              {p.paid ? 'Total Pago' : isPartial ? 'Restante Devido' : 'Valor Total'}
                            </span>
                            <span className="font-extrabold text-foreground text-sm">
                              {p.paid ? formatCurrency(p.amount) : isPartial ? formatCurrency(remainingToPay) : formatCurrency(p.amount)}
                            </span>
                          </div>

                          {!p.paid && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs border-border/50 text-foreground"
                                onClick={() => copyPixKey(formatCurrency(p.paid ? p.amount : isPartial ? remainingToPay : p.amount))}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copiar Pix
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 text-xs btn-primary-gradient px-3"
                                onClick={() => toast.info('Aponte a câmera do seu banco para o QRCode Pix no verso da secretaria.')}
                              >
                                <QrCode className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border/30 py-3.5 px-4 text-xs text-muted-foreground flex items-center gap-1">
              <GraduationCap className="h-4 w-4 text-primary shrink-0" /> Chaves Pix copiadas geram um Pix Copia e Cola padrão da escola.
            </CardFooter>
          </Card>

          {/* CARD 4: ÚLTIMAS CHAMADAS (PRESENÇAS) */}
          <Card className="border-border/50 shadow-sm card-elevated flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Histórico de Presenças
              </CardTitle>
              <CardDescription>Suas últimas 5 chamadas em sala.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {attendanceLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto opacity-40 mb-2" />
                  <p className="text-sm">Nenhuma presença lançada para você até o momento.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {attendanceLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="bg-background border border-border/40 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-bold text-foreground text-xs block">
                            {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          {log.notes && (
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                              Obs: {log.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      {log.status === 'present' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Presente
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px] flex items-center gap-1 font-semibold">
                          <XCircle className="h-3.5 w-3.5" /> Falta
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/10 border-t border-border/30 py-3.5 px-4 text-xs text-muted-foreground">
              A presença é lançada diariamente pelo seu professor de turma.
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
