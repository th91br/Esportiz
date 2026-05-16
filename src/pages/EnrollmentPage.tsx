import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, User, Mail, FileText, Phone, Calendar, ArrowRight, ShieldCheck, Dumbbell, Clock, School } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  formatBrazilPhone,
  formatCpf,
  isTodayOrPastDate,
  isValidBrazilPhone,
  isValidCpf,
  isValidPublicEmail,
  isValidUuid,
  normalizePublicEmail,
  normalizePublicName,
} from '@/lib/publicPortalSecurity';

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface Group {
  id: string;
  name: string;
  schedule: unknown[];
  location: string;
  max_students: number | null;
  current_students: number;
}

interface EnrollmentSuccessData {
  studentId?: string;
  planName?: string;
  groupName: string;
}

export default function EnrollmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('ct');
  const hasInvalidOwnerId = ownerId !== null && !isValidUuid(ownerId);
  const scopedOwnerId = isValidUuid(ownerId) ? ownerId : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schoolName, setSchoolName] = useState('Esportiz Club');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [successData, setSuccessData] = useState<EnrollmentSuccessData | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    if (!scopedOwnerId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const { data, error } = await supabase.rpc('get_public_enrollment_data', {
          p_user_id: scopedOwnerId
        });

        if (error) throw error;

        if (data) {
          setSchoolName(data.school_name || 'Esportiz Club');
          setPlans(data.plans || []);
          setGroups(data.groups || []);
        }
      } catch (err: unknown) {
        console.error('Erro ao buscar dados de matrícula:', err);
        toast.error('Erro ao carregar dados da escola.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [scopedOwnerId]);

  // Mask CPF (999.999.999-99)
  const handleCpfChange = (val: string) => {
    setCpf(formatCpf(val));
  };

  // Mask Phone ((99) 99999-9999)
  const handlePhoneChange = (val: string) => {
    setPhone(formatBrazilPhone(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scopedOwnerId) {
      toast.error('Link de matrícula inválido ou incompleto.');
      return;
    }

    const safeName = normalizePublicName(name);
    const safeCpf = formatCpf(cpf);
    const safeEmail = normalizePublicEmail(email);
    const safePhone = formatBrazilPhone(phone);

    if (!safeName || !safeCpf || !birthDate || !safeEmail || !safePhone || !selectedPlanId) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!isValidCpf(safeCpf)) {
      toast.error('CPF invalido. Confira os numeros digitados.');
      return;
    }

    if (!isTodayOrPastDate(birthDate)) {
      toast.error('Data de nascimento invalida.');
      return;
    }

    if (!isValidPublicEmail(safeEmail)) {
      toast.error('E-mail invalido.');
      return;
    }

    if (!isValidBrazilPhone(safePhone)) {
      toast.error('Celular invalido.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_public_enrollment', {
        p_user_id: scopedOwnerId,
        p_name: safeName,
        p_cpf: safeCpf,
        p_birth_date: birthDate,
        p_email: safeEmail,
        p_phone: safePhone,
        p_plan_id: selectedPlanId,
        p_group_id: selectedGroupId || null,
      });

      if (error) throw error;

      if (data && !data.success) {
        toast.error(data.error || 'Erro ao realizar matrícula.');
        return;
      }

      toast.success('Sua matrícula foi realizada com sucesso!');
      setSuccessData({
        studentId: data.student_id,
        planName: plans.find(p => p.id === selectedPlanId)?.name,
        groupName: groups.find(g => g.id === selectedGroupId)?.name || 'Sem turma no momento',
      });
    } catch (err: unknown) {
      console.error('Erro ao submeter matrícula:', err);
      toast.error('Ocorreu um erro ao processar sua inscrição.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Carregando formulário de matrícula...</p>
      </div>
    );
  }

  if (!ownerId || hasInvalidOwnerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-border/80 card-elevated">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
              <School className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold font-display text-foreground">Link Inválido</CardTitle>
            <CardDescription className="text-sm">
              Este link de matrícula pública não possui a identificação da escola parceira. Entre em contato com a secretaria da sua escola para solicitar o link de inscrição correto.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full btn-primary-gradient" onClick={() => navigate('/')}>
              Ir para o Esportiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6">
        <Card className="max-w-lg w-full border-border/60 card-elevated shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="text-center pb-4 space-y-3">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center scale-110 shadow-inner">
              <Check className="h-8 w-8 stroke-[3px]" />
            </div>
            <CardTitle className="text-2xl font-bold font-display text-foreground mt-4">Matrícula Confirmada!</CardTitle>
            <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
              Seja muito bem-vindo(a) ao <strong className="text-foreground">{schoolName}</strong>. Suas informações acadêmicas e financeiras já estão registradas.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6">
            <div className="bg-muted/40 rounded-2xl p-4 border border-border/50 text-sm space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Estudante:</span>
                <span className="font-semibold text-foreground">{name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Curso / Plano:</span>
                <Badge variant="outline" className="font-semibold bg-primary/5 text-primary border-primary/20">
                  {successData.planName}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Turma / Horário:</span>
                <span className="font-semibold text-foreground">{successData.groupName}</span>
              </div>
            </div>

            <div className="text-center p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed">
                Você agora possui acesso exclusivo ao seu <strong>Portal do Aluno</strong> para consultar suas presenças, conteúdos e faturas!
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 p-6 pt-2">
            <Button 
              className="w-full btn-primary-gradient py-6 font-semibold"
              onClick={() => navigate(scopedOwnerId ? `/portal-aluno?ct=${scopedOwnerId}` : '/portal-aluno')}
            >
              Acessar Meu Portal do Aluno <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-display uppercase tracking-wider mb-2">
            <School className="h-3.5 w-3.5" /> Ficha de Matrícula Online
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground tracking-tight">{schoolName}</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Preencha seus dados com atenção para realizar sua pré-matrícula e obter acesso instantâneo ao portal de aulas.
          </p>
        </div>

        <Card className="border-border/60 shadow-xl overflow-hidden card-elevated">
          <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
          
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Informações do Estudante
              </CardTitle>
              <CardDescription>Insira os seus dados cadastrais obrigatórios.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required 
                    placeholder="Nome e sobrenome" 
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* CPF e Nascimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">CPF</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      placeholder="000.000.000-00" 
                      className="pl-9"
                      value={cpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      type="date" 
                      className="pl-9"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Email e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      type="email" 
                      placeholder="nome@email.com" 
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Celular (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      placeholder="(00) 00000-0000" 
                      className="pl-9"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 my-4 pt-4" />

              {/* Escolha do Plano e Turma */}
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" /> Curso e Horário
                </h3>
                <p className="text-xs text-muted-foreground">Selecione as opções acadêmicas desejadas.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Selecione o Curso / Plano</label>
                  <Select required onValueChange={setSelectedPlanId} value={selectedPlanId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="font-medium">
                          {p.name} — {formatCurrency(p.price)}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Selecione a Turma (Opcional)</label>
                  <Select onValueChange={setSelectedGroupId} value={selectedGroupId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => {
                        const isFull = g.max_students !== null && g.current_students >= g.max_students;
                        return (
                          <SelectItem 
                            key={g.id} 
                            value={g.id} 
                            disabled={isFull}
                            className="font-medium"
                          >
                            {g.name} {isFull ? '(Esgotada)' : `(${g.current_students}/${g.max_students || 'unlimited'} vagas)`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/10 border-t border-border/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[11px] text-muted-foreground text-center sm:text-left leading-normal flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" /> Ao matricular-se, sua vaga é reservada e o portal financeiro do aluno estará liberado.
              </span>
              <Button 
                type="submit" 
                className="w-full sm:w-auto btn-primary-gradient px-8 py-5 font-bold"
                disabled={submitting}
              >
                {submitting ? 'Realizando matrícula...' : 'Finalizar Matrícula'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
