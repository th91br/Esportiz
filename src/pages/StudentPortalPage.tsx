import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EsportizIcon } from '@/components/Logo';
import { 
  CheckCircle2, XCircle, LogOut, Clock, Calendar, GraduationCap, 
  DollarSign, MapPin, Copy, QrCode, ClipboardList, BookOpen, UserCheck, ShieldAlert 
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import {
  formatDateOnlyBr,
  getLocalTodayDate,
  parseBrazilianDateToIso,
} from '@/lib/dateUtils';
import { resolvePublicOwnerScope } from '@/lib/publicAccessContracts';
import {
  isTodayOrPastDate,
  isValidUuid,
} from '@/lib/publicPortalSecurity';
import { formatCpfInputValue } from '@/lib/cpfInput';
import { getEndTime } from '@/data/mockData';

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
  logo_url?: string | null;
  plan_name: string;
  cpf?: string | null;
  rg?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  level?: string | null;
  plan_price?: number;
  modality_name?: string;
  payment_due_day?: number | null;
  signed?: boolean;
  signed_at?: string | null;
  signature_ip?: string | null;
}

interface StudentPortalBranding {
  school_name: string;
  logo_url: string | null;
}

interface PaymentConfig {
  pix_key: string | null;
  pix_receiver: string | null;
}

interface GroupPortalData {
  id: string;
  name: string;
  location?: string;
  durationMinutes?: number;
  schedule: Array<{
    day?: string;
    dayOfWeek?: number;
    time?: string;
    startTime?: string;
    endTime?: string;
  }>;
}

interface TrainingRequestLog {
  id: string;
  request_type: 'training' | 'makeup';
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  resolved_at: string | null;
}

interface AttendanceStats {
  percent: number;
  total_classes: number;
  presences: number;
  absences: number;
}

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

function getScheduleDayLabel(slot: GroupPortalData['schedule'][number]) {
  if (slot.day) return slot.day;
  if (typeof slot.dayOfWeek === 'number') return WEEKDAY_NAMES[slot.dayOfWeek] || 'Dia';
  return 'Dia';
}

function getScheduleTimeLabel(slot: GroupPortalData['schedule'][number], durationMinutes = 60) {
  const startTime = slot.startTime || slot.time;
  if (!startTime) return 'Horário não definido';

  const endTime = slot.endTime || getEndTime(startTime, durationMinutes);
  return `${startTime} - ${endTime}`;
}

const getPortalSessionKey = (ownerId: string | null) => ownerId ? `esportiz:student-portal:${ownerId}` : null;

const getRequestTypeLabel = (type: TrainingRequestLog['request_type']) => (
  type === 'makeup' ? 'Reposição' : 'Treino'
);

const getRequestStatus = (status: TrainingRequestLog['status']) => {
  switch (status) {
    case 'approved':
      return {
        label: 'Atendida',
        description: 'Sua solicitação foi aceita pela escola. Aguarde a confirmação do horário combinado.',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        Icon: CheckCircle2,
      };
    case 'rejected':
      return {
        label: 'Recusada',
        description: 'Sua solicitação foi recusada pela escola. Fale com a secretaria se precisar de outro horário.',
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        Icon: XCircle,
      };
    case 'cancelled':
      return {
        label: 'Cancelada',
        description: 'Esta solicitação foi cancelada.',
        className: 'bg-muted text-muted-foreground border-border',
        Icon: XCircle,
      };
    default:
      return {
        label: 'Pendente',
        description: 'Sua solicitação foi enviada e aguarda análise da escola.',
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        Icon: Clock,
      };
  }
};

// --- PIX EMV GENERATOR ---
function getCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    for (let bit = 0; bit < 8; bit++) {
      const bitOnCrc = ((crc >> 15) & 1) === 1;
      const bitOnByte = ((code >> (7 - bit)) & 1) === 1;
      crc = (crc << 1) & 0xFFFF;
      if (bitOnCrc !== bitOnByte) {
        crc ^= polynomial;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEMVTag(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

function cleanString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/gi, '')
    .toUpperCase();
}

function generatePixCopiaCola(key: string, amount: number, receiver: string): string {
  const gui = formatEMVTag('00', 'br.gov.bcb.pix');
  const pixKey = formatEMVTag('01', key);
  const merchantAccountInfo = formatEMVTag('26', `${gui}${pixKey}`);

  const payloadFormat = formatEMVTag('00', '01');
  const merchantCategory = formatEMVTag('52', '0000');
  const currency = formatEMVTag('53', '986');
  const amountStr = formatEMVTag('54', amount.toFixed(2));
  const country = formatEMVTag('58', 'BR');

  const cleanReceiver = cleanString(receiver || 'ESPORTIZ SPORT').substring(0, 25) || 'ESPORTIZ SPORT';
  const merchantName = formatEMVTag('59', cleanReceiver);
  const merchantCity = formatEMVTag('60', 'BRASILIA');

  const txid = formatEMVTag('05', '***');
  const additionalData = formatEMVTag('62', txid);

  const payload = `${payloadFormat}${merchantAccountInfo}${merchantCategory}${currency}${amountStr}${country}${merchantName}${merchantCity}${additionalData}6304`;
  const crc = getCRC16(payload);
  return `${payload}${crc}`;
}

export default function StudentPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerId = searchParams.get('ct');
  const { hasInvalidOwnerId, scopedOwnerId } = resolvePublicOwnerScope(ownerId);

  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Contract state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contract'>('dashboard');
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  // Login Input State
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Portal Data State
  const [student, setStudent] = useState<StudentPortalData | null>(null);
  const [branding, setBranding] = useState<StudentPortalBranding>({
    school_name: 'Esportiz Sport',
    logo_url: null,
  });
  const [groups, setGroups] = useState<GroupPortalData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequestLog[]>([]);
  const [requestType, setRequestType] = useState<'training' | 'makeup'>('training');
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const getContractText = () => {
    if (!student) return '';
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ENSINO ESPORTIVO

CONTRATANTE: ${student.name.toUpperCase()}
CPF: ${student.cpf || 'Não informado'}
RG: ${student.rg || 'Não informado'}
Endereço: ${student.address || 'Não informado'}, ${student.city || 'Não informado'}-${student.state || 'UF'}

CONTRATADA: ${(student.school_name || branding.school_name || 'Esportiz Sport').toUpperCase()}

OBJETO: Prestação de serviços de aulas esportivas na modalidade ${student.modality_name || 'Esportiva'}.

PLANO E VALORES: Plano "${student.plan_name}" no valor mensal de ${formatCurrency(student.plan_price || 0)}, com vencimento no dia ${student.payment_due_day || '10'} de cada mês.

CONCORDÂNCIA E ASSINATURA: O contratante declara ter lido, compreendido e aceito todos os termos deste contrato de adesão eletrônico.`;
  };

  const handleSignContract = async () => {
    if (!student || !scopedOwnerId) return;
    if (!agreed) {
      toast.error('Você precisa marcar a caixa de consentimento para assinar.');
      return;
    }

    setSigning(true);
    try {
      const isoBirthDate = parseBrazilianDateToIso(birthDate);
      if (!isoBirthDate) {
        toast.error('Data de nascimento inválida. Entre novamente no portal.');
        return;
      }

      const userAgent = navigator.userAgent;

      const { data, error } = await supabase.rpc('sign_student_contract', {
        p_student_id: student.id,
        p_cpf: formatCpfInputValue(cpf),
        p_birth_date: isoBirthDate,
        p_ip_address: '',
        p_user_agent: userAgent,
        p_contract_text: getContractText(),
      });

      if (error) throw error;

      if (data && data.success) {
        toast.success(data.message || 'Contrato assinado com sucesso!');
        // Re-authenticate to reload student data and show signature status
        await authenticate(cpf, birthDate);
      } else {
        toast.error(data?.error || 'Erro ao assinar o contrato.');
      }
    } catch (err) {
      console.error('Erro ao assinar contrato:', err);
      toast.error('Erro ao processar assinatura eletrônica.');
    } finally {
      setSigning(false);
    }
  };

  const schoolName = student?.school_name || branding.school_name || 'Esportiz Sport';
  const schoolLogoUrl = student?.logo_url || branding.logo_url || null;

  const loadTrainingRequests = useCallback(async (loginCpf: string, loginBirthDate: string) => {
    if (!scopedOwnerId) return;

    const isoBirthDate = parseBrazilianDateToIso(loginBirthDate);
    if (!isoBirthDate) {
      throw new Error('Data de nascimento inválida.');
    }

    const { data, error } = await supabase.rpc('get_student_portal_requests', {
      p_cpf: formatCpfInputValue(loginCpf),
      p_birth_date: isoBirthDate,
      p_user_id: scopedOwnerId,
    });

    if (error) throw error;

    if (data?.success) {
      setTrainingRequests(Array.isArray(data.requests) ? data.requests : []);
    } else {
      setTrainingRequests([]);
    }
  }, [scopedOwnerId]);

  // Authenticate student via credentials
  const authenticate = useCallback(async (loginCpf: string, loginBirthDateBr: string) => {
    if (hasInvalidOwnerId) {
      toast.error('Link do portal inválido.');
      return;
    }

    // Format-only CPF validation for authentication (11 numeric digits, non-repeated)
    // Check digit validation is NOT used here because students may have been registered
    // with CPFs containing incorrect check digits. The server matches CPF against the stored record.
    const cpfDigits = loginCpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11 || /^(\d)\1{10}$/.test(cpfDigits)) {
      toast.error('CPF inválido. Confira os números digitados.');
      return;
    }

    const isoBirthDate = parseBrazilianDateToIso(loginBirthDateBr);
    if (!isoBirthDate || !isTodayOrPastDate(isoBirthDate)) {
      toast.error('Data de nascimento inválida. Use o formato DD/MM/AAAA.');
      return;
    }

    setAuthenticating(true);
    try {
      const { data, error } = await supabase.rpc('get_student_portal_data', {
        p_cpf: formatCpfInputValue(loginCpf),
        p_birth_date: isoBirthDate,
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
        await loadTrainingRequests(loginCpf, loginBirthDateBr);
        const sessionKey = getPortalSessionKey(scopedOwnerId);
        if (sessionKey) {
          sessionStorage.setItem(sessionKey, JSON.stringify({
            cpf: formatCpfInputValue(loginCpf),
            birthDate: loginBirthDateBr,
          }));
        }
        if (scopedOwnerId) {
          localStorage.setItem('esportiz:student-portal:last-owner-id', scopedOwnerId);
        }
        setAuthenticated(true);
      } else {
        setTrainingRequests([]);
        toast.error('Dados incorretos. CPF ou Data de Nascimento inválidos.');
      }
    } catch (err: unknown) {
      console.error('Erro de autenticação no portal:', err);
      toast.error('Ocorreu um erro ao conectar com o servidor.');
    } finally {
      setAuthenticating(false);
      setLoading(false);
    }
  }, [hasInvalidOwnerId, loadTrainingRequests, scopedOwnerId]);

  useEffect(() => {
    if (!ownerId) {
      const lastOwnerId = localStorage.getItem('esportiz:student-portal:last-owner-id');
      if (lastOwnerId && isValidUuid(lastOwnerId)) {
        setSearchParams({ ct: lastOwnerId });
        return;
      }
      setLoading(false);
      return;
    }

    if (hasInvalidOwnerId || !scopedOwnerId) {
      setLoading(false);
      return;
    }

    const sessionKey = getPortalSessionKey(scopedOwnerId);
    const savedSession = sessionKey ? sessionStorage.getItem(sessionKey) : null;

    if (!savedSession) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedSession) as { cpf?: string; birthDate?: string };

      const sessionCpfDigits = (parsed.cpf || '').replace(/\D/g, '');
      if (parsed.cpf && parsed.birthDate) {
        let isoBirthDate = '';
        let brBirthDate = '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.birthDate)) {
          isoBirthDate = parsed.birthDate;
          brBirthDate = formatDateOnlyBr(parsed.birthDate);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(parsed.birthDate)) {
          brBirthDate = parsed.birthDate;
          isoBirthDate = parseBrazilianDateToIso(parsed.birthDate) || '';
        }

        if (sessionCpfDigits.length === 11 && isoBirthDate && isTodayOrPastDate(isoBirthDate)) {
          setCpf(formatCpfInputValue(parsed.cpf));
          setBirthDate(brBirthDate);
          authenticate(parsed.cpf, brBirthDate);
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar sessão do portal:', error);
    }

    if (sessionKey) {
      sessionStorage.removeItem(sessionKey);
    }
    setLoading(false);
  }, [authenticate, hasInvalidOwnerId, ownerId, scopedOwnerId, setSearchParams]);

  useEffect(() => {
    if (hasInvalidOwnerId || !scopedOwnerId) return;

    let active = true;

    const loadBranding = async () => {
      try {
        const { data, error } = await supabase.rpc('get_student_portal_branding', {
          p_user_id: scopedOwnerId,
        });

        if (error) throw error;

        if (active && data?.success) {
          setBranding({
            school_name: data.school_name || 'Esportiz Sport',
            logo_url: data.logo_url || null,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar marca do portal:', error);
      }
    };

    loadBranding();

    return () => {
      active = false;
    };
  }, [hasInvalidOwnerId, scopedOwnerId]);

  const handleCpfChange = (val: string) => {
    setCpf(formatCpfInputValue(val));
  };

  const handleBirthDateChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
      setBirthDate(digits);
    } else if (digits.length <= 4) {
      setBirthDate(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setBirthDate(`${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`);
    }
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
    setTrainingRequests([]);
    const sessionKey = getPortalSessionKey(scopedOwnerId);
    if (sessionKey) {
      sessionStorage.removeItem(sessionKey);
    }
    setSearchParams(scopedOwnerId ? { ct: scopedOwnerId } : {});
    setCpf('');
    setBirthDate('');
  };

  const copyPixKey = (amount: number, amountStr: string) => {
    if (!paymentConfig?.pix_key) {
      toast.info('Pix ainda não configurado pela escola.');
      return;
    }

    try {
      const brCode = generatePixCopiaCola(
        paymentConfig.pix_key,
        amount,
        paymentConfig.pix_receiver || schoolName
      );
      navigator.clipboard.writeText(brCode);
      toast.success(`Pix Copia e Cola gerado e copiado! Valor: ${amountStr}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar código Pix Copia e Cola.');
    }
  };

  const handleSubmitTrainingRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!student || !scopedOwnerId) {
      toast.error('Sessão do portal inválida. Entre novamente e tente outra vez.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const isoBirthDate = parseBrazilianDateToIso(birthDate);
      if (!isoBirthDate) {
        toast.error('Data de nascimento inválida. Entre novamente no portal.');
        return;
      }

      const { data, error } = await supabase.rpc('submit_student_training_request', {
        p_cpf: cpf,
        p_birth_date: isoBirthDate,
        p_user_id: scopedOwnerId,
        p_request_type: requestType,
        p_preferred_date: requestDate || null,
        p_preferred_time: requestTime || null,
        p_message: requestMessage || null,
      });

      if (error) throw error;

      if (!data?.success) {
        toast.error(data?.error || 'Não foi possível enviar a solicitação.');
        return;
      }

      toast.success(data.message || 'Solicitação enviada para a escola.');
      setRequestType('training');
      setRequestDate('');
      setRequestTime('');
      setRequestMessage('');
      await loadTrainingRequests(cpf, birthDate);
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      toast.error('Ocorreu um erro ao enviar a solicitação.');
    } finally {
      setSubmittingRequest(false);
    }
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
            <CardTitle className="text-xl font-bold font-display text-foreground">Link inválido</CardTitle>
            <CardDescription className="text-sm">
              Este link do portal possui uma identificação inválida. Solicite um novo link para a secretaria.
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

  if (!ownerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6">
        <Card className="max-w-md w-full border-border/80 card-elevated shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
          <CardHeader className="text-center space-y-3 pt-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-1 border border-primary/15 shadow-sm animate-bounce">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-black font-display text-foreground tracking-tight">Portal do Aluno</CardTitle>
              <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase font-display">Esportiz Sport</span>
            </div>
            <CardDescription className="text-sm">
              Para acessar o portal do aluno, é necessário utilizar o link completo fornecido pela sua escola.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <div className="bg-muted/40 border border-border/60 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
              O link de acesso contém um identificador seguro da escola (ex: <code className="font-semibold text-foreground">?ct=...</code>) para garantir que você consulte suas informações com total segurança e privacidade.
            </div>

          </CardContent>
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
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 bg-background text-primary rounded-3xl flex items-center justify-center mb-1 overflow-hidden border border-primary/15 shadow-sm">
              {schoolLogoUrl ? (
                <img src={schoolLogoUrl} alt={`Logo ${schoolName}`} className="h-full w-full object-contain p-2" />
              ) : (
                <EsportizIcon size={56} />
              )}
            </div>
            <div>
              <CardTitle className="mx-auto max-w-sm text-2xl sm:text-3xl font-black font-display text-foreground tracking-tight leading-tight break-words">{schoolName}</CardTitle>
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase font-display">Portal do Aluno</span>
            </div>
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
                  placeholder="DD/MM/AAAA" 
                  maxLength={10}
                  value={birthDate}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-background text-primary rounded-2xl flex shrink-0 items-center justify-center border border-primary/15 overflow-hidden shadow-sm">
              {schoolLogoUrl ? (
                <img src={schoolLogoUrl} alt={`Logo ${schoolName}`} className="h-full w-full object-contain p-1.5" />
              ) : (
                <EsportizIcon size={34} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black font-display text-foreground leading-tight truncate">{schoolName}</h2>
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

        {/* TABS NAVEGAÇÃO */}
        <div className="flex border-b border-border/50 gap-4 mb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 px-1 transition-all",
              activeTab === 'dashboard'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Painel do Aluno
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 px-1 transition-all flex items-center gap-1.5",
              activeTab === 'contract'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ClipboardList className="h-4 w-4" /> Contrato de Adesão
            {student.signed ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                Assinado
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] font-semibold animate-pulse">
                Pendente
              </Badge>
            )}
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <Card className="border-primary/10 shadow-sm card-elevated overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Solicitar Treino/Reposição
            </CardTitle>
            <CardDescription>
              Envie uma solicitação para a escola analisar. O treino só entra na agenda após aprovação interna.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTrainingRequest} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-3 lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Tipo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={requestType === 'training' ? 'default' : 'outline'}
                        className={cn('h-10 text-xs', requestType === 'training' && 'btn-primary-gradient')}
                        onClick={() => setRequestType('training')}
                      >
                        Treino
                      </Button>
                      <Button
                        type="button"
                        variant={requestType === 'makeup' ? 'default' : 'outline'}
                        className={cn('h-10 text-xs', requestType === 'makeup' && 'btn-primary-gradient')}
                        onClick={() => setRequestType('makeup')}
                      >
                        Reposição
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Data desejada</label>
                    <Input
                      type="date"
                      min={getLocalTodayDate()}
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Horário</label>
                    <Input
                      type="time"
                      value={requestTime}
                      onChange={(e) => setRequestTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Observação</label>
                  <Textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    maxLength={500}
                    className="min-h-[82px] resize-none"
                    placeholder="Ex: gostaria de repor a falta de terça-feira, se houver vaga."
                  />
                </div>
              </div>

              <Button type="submit" className="btn-primary-gradient h-11" disabled={submittingRequest}>
                {submittingRequest ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </form>

            <div className="mt-6 border-t border-border/40 pt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Minhas solicitações</h3>
                  <p className="text-xs text-muted-foreground">Acompanhe o retorno da escola para cada pedido enviado.</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {trainingRequests.length} registro(s)
                </Badge>
              </div>

              {trainingRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  Nenhuma solicitação enviada ainda.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {trainingRequests.slice(0, 6).map((request) => {
                    const status = getRequestStatus(request.status);
                    const StatusIcon = status.Icon;
                    const preferredDate = request.preferred_date
                      ? new Date(request.preferred_date + 'T12:00:00').toLocaleDateString('pt-BR')
                      : 'Data flexível';

                    return (
                      <div key={request.id} className="rounded-xl border border-border/50 bg-background p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-sm font-bold text-foreground">{getRequestTypeLabel(request.request_type)}</span>
                            <p className="text-xs text-muted-foreground">
                              {preferredDate}{request.preferred_time ? ` às ${request.preferred_time}` : ''}
                            </p>
                          </div>
                          <Badge className={cn('text-[10px] border flex items-center gap-1', status.className)}>
                            <StatusIcon className="h-3.5 w-3.5" /> {status.label}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">{status.description}</p>

                        {request.message && (
                          <p className="text-xs bg-muted/40 border border-border/40 rounded-lg p-2 text-muted-foreground line-clamp-2">
                            {request.message}
                          </p>
                        )}

                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                          Enviada em {new Date(request.created_at).toLocaleDateString('pt-BR')}
                          {request.resolved_at ? ` · Respondida em ${new Date(request.resolved_at).toLocaleDateString('pt-BR')}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                                <span className="text-foreground capitalize font-semibold block">{getScheduleDayLabel(slot)}</span>
                                <span className="text-muted-foreground text-[11px]">{getScheduleTimeLabel(slot, g.durationMinutes || 60)}</span>
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
                                onClick={() => {
                                  const amt = p.paid ? p.amount : isPartial ? remainingToPay : p.amount;
                                  copyPixKey(amt, formatCurrency(amt));
                                }}
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
        </div>
        )}

        {activeTab === 'contract' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-border/50 shadow-md card-elevated overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-indigo-600" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-black font-display flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" /> Contrato de Prestação de Serviços Esportivos
                </CardTitle>
                <CardDescription>
                  Leia os termos do contrato e registre o seu aceite eletrônico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* O CONTRATO FORMATADO EM BOX SCROLLÁVEL */}
                <div className="bg-muted/40 border border-border/60 rounded-xl p-5 sm:p-6 max-h-[380px] overflow-y-auto font-mono text-xs sm:text-sm text-foreground/80 leading-relaxed space-y-4 whitespace-pre-line shadow-inner">
                  {getContractText()}
                </div>

                {/* STATUS DE ASSINATURA */}
                {student.signed ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-emerald-800 dark:text-emerald-400">
                    <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm uppercase tracking-wider">Assinatura Digital Confirmada</h4>
                      <p className="text-xs">
                        Contrato assinado em <strong className="font-semibold">{student.signed_at ? new Date(student.signed_at).toLocaleString('pt-BR') : ''}</strong>
                      </p>
                      <p className="text-[10px] opacity-80 font-mono">
                        Registro eletrônico armazenado em {student.signed_at
                          ? new Date(student.signed_at).toLocaleString('pt-BR')
                          : 'data não informada'}.
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1.5 border-t border-emerald-500/10 mt-1">
                        Aceite eletrônico registrado pelo sistema.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-muted/20 border border-border/40 p-4 rounded-xl">
                      <input
                        type="checkbox"
                        id="agree-contract"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-50 mt-0.5 shrink-0"
                      />
                      <label htmlFor="agree-contract" className="text-xs sm:text-sm text-muted-foreground select-none cursor-pointer leading-snug">
                        Declaro que li, compreendi e concordo integralmente com todos os termos e cláusulas descritas neste instrumento de adesão esportiva.
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10 p-4 border border-border/30 rounded-xl">
                      <div className="text-left">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Registro de auditoria</span>
                        <span className="text-xs font-semibold text-foreground">Data, navegador e conteúdo aceito serão armazenados.</span>
                      </div>
                      <Button
                        onClick={handleSignContract}
                        disabled={signing || !agreed}
                        className="w-full sm:w-auto btn-primary-gradient font-bold px-6 py-5"
                      >
                        {signing ? 'Processando Assinatura...' : 'Confirmar e Assinar Eletronicamente'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/10 border-t border-border/30 p-4 justify-center">
                <span className="text-[10px] text-muted-foreground text-center max-w-lg">
                  A assinatura eletrônica é pessoal e intransferível. A falsidade ideológica é crime previsto no Art. 299 do Código Penal Brasileiro.
                </span>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
