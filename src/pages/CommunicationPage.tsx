import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Users, Check, AlertCircle, Save, Loader2 } from 'lucide-react';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePayments } from '@/hooks/queries/usePayments';
import { getActiveMonthlyStudents, getInactiveStudents, getStudentsWithoutPlan } from '@/lib/studentHelpers';
import { usePlans } from '@/hooks/queries/usePlans';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { toast } from 'sonner';

type Audience = 'all_active' | 'overdue' | 'due_7_days' | 'trial' | 'without_plan' | 'inactive';

export default function CommunicationPage() {
  const { students, loadingStudents } = useStudents();
  const { payments, loadingPayments } = usePayments();
  const { plans, loadingPlans } = usePlans();
  const { labels } = useBusinessContext();
  const { profile, updateProfile, isUpdatingProfile } = useProfile();
  
  // Nome dinâmico do negócio com fallbacks personalizados por modalidade
  const businessName = profile?.ct_name || (
    profile?.business_type === 'sport_school' ? 'Sportiz Sport' :
    profile?.business_type === 'other' ? 'Esportiz Club' : 'Esportiz Arena'
  );
  
  const [audience, setAudience] = useState<Audience>('all_active');
  const [messageTemplate, setMessageTemplate] = useState(`Olá {nome}, tudo bem? Aqui é da {escola}! 😊`);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // Load audience-specific custom template on profile or audience change
  useEffect(() => {
    if (profile) {
      const activeNicheType = profile.business_type || 'sport_school';
      const templates = profile.niche_settings?.[activeNicheType]?.templates || {};
      const templateKey = `mass_${audience}` as keyof typeof templates;
      const customTemplate = templates[templateKey];
      
      if (customTemplate) {
        setMessageTemplate(customTemplate);
      } else {
        // High quality default fallback per audience & niche type
        const isClub = activeNicheType === 'other';

        const fallbacks: Record<Audience, string> = {
          all_active: `Olá {nome}, tudo bem? Aqui é da {escola}! 😊`,
          overdue: `Olá {nome}, tudo bem? Passando para lembrar do acerto da sua mensalidade na {escola}. 🙏`,
          due_7_days: `Olá {nome}, tudo bem? Lembrete amigável de que sua mensalidade na {escola} vence nos próximos dias. 😊`,
          trial: isClub
            ? `Olá {nome}, tudo bem? Aqui é da {escola}! Passando para saber o que achou da sua aula experimental? 📝✨`
            : `Olá {nome}, tudo bem? Aqui é da {escola}! Passando para saber o que achou do seu treino experimental? 🎾🔥`,
          without_plan: `Olá {nome}, tudo bem? Notamos que você está sem plano ativo na {escola}. Vamos escolher um? 🚀`,
          inactive: isClub
            ? `Olá {nome}, tudo bem? Estamos com saudades de você aqui na {escola}! Que tal voltar a estudar conosco? 📚🎓`
            : `Olá {nome}, tudo bem? Estamos com saudades de você aqui na {escola}! Que tal voltar a treinar conosco? 🏆`
        };
        setMessageTemplate(fallbacks[audience] || `Olá {nome}, tudo bem? Aqui é da {escola}! 😊`);
      }
    }
  }, [profile, audience]);

  const handleSaveTemplate = async () => {
    if (!profile) return;
    const activeNicheType = profile.business_type || 'sport_school';
    const templateKey = `mass_${audience}`;
    
    const currentNicheSettings = profile.niche_settings || {};
    const updatedNicheSettings = {
      ...currentNicheSettings,
      [activeNicheType]: {
        ...(currentNicheSettings[activeNicheType] || {}),
        templates: {
          ...(currentNicheSettings[activeNicheType]?.templates || {}),
          [templateKey]: messageTemplate
        }
      }
    };

    try {
      await updateProfile({
        niche_settings: updatedNicheSettings
      });
      toast.success('Modelo de mensagem salvo como padrão para este público!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar o modelo de mensagem.');
    }
  };

  const loading = loadingStudents || loadingPayments || loadingPlans;

  // Filtro de Audiência
  const targetStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    const activeMonthly = getActiveMonthlyStudents(students, plans);
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    switch (audience) {
      case 'all_active':
        return students.filter(s => s.active && !s.isTrial);
      case 'inactive':
        return getInactiveStudents(students);
      case 'trial':
        return students.filter(s => s.active && s.isTrial);
      case 'without_plan':
        return getStudentsWithoutPlan(students);
      case 'overdue': {
        // Encontrar alunos com pagamentos atrasados (vencidos e não pagos)
        const overduePayments = payments.filter(p => !p.paid && p.dueDate < todayStr);
        const overdueStudentIds = new Set(overduePayments.map(p => p.studentId));
        return students.filter(s => overdueStudentIds.has(s.id));
      }
      case 'due_7_days': {
        // Encontrar alunos com pagamentos vencendo nos próximos 7 dias
        const duePayments = payments.filter(p => !p.paid && p.dueDate >= todayStr && p.dueDate <= sevenDaysStr);
        const dueStudentIds = new Set(duePayments.map(p => p.studentId));
        return students.filter(s => dueStudentIds.has(s.id));
      }
      default:
        return [];
    }
  }, [students, plans, payments, audience]);

  // Função para limpar o telefone
  const formatPhoneForWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return null;
    // Assume DDI 55 (Brasil) if not present and has 10-11 digits
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  };

  const handleSendWhatsApp = (studentId: string, studentName: string, studentPhone: string | null) => {
    if (!studentPhone) {
      toast.error(`O(A) ${labels.studentLabelSingular.toLowerCase()} ${studentName} não possui um telefone cadastrado.`);
      return;
    }

    const whatsappPhone = formatPhoneForWhatsApp(studentPhone);
    if (!whatsappPhone) {
      toast.error(`Número de telefone inválido para o(a) ${labels.studentLabelSingular.toLowerCase()} ${studentName}.`);
      return;
    }

    // Variáveis dinâmicas
    const firstName = studentName.split(' ')[0];
    const personalizedMessage = messageTemplate
      .replace(/{nome}/g, firstName)
      .replace(/{nome_completo}/g, studentName)
      .replace(/{escola}/g, businessName)
      .replace(/{chave_pix}/g, profile?.pix_key || '')
      .replace(/{beneficiario_pix}/g, profile?.pix_receiver || '');

    let finalMessage = personalizedMessage;
    if ((audience === 'overdue' || audience === 'due_7_days') && profile?.pix_key && !messageTemplate.includes('{chave_pix}')) {
      finalMessage += `\n\n📌 *Dados para pagamento via Pix:*\n🔑 *Chave Pix:* ${profile.pix_key}${profile.pix_receiver ? `\n👤 *Beneficiário:* ${profile.pix_receiver}` : ''}`;
    }

    const encodedMessage = encodeURIComponent(finalMessage);

    const url = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');

    // Marcar como enviado localmente na sessão
    setSentTo(prev => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 md:py-8 space-y-6">
        <div>
          <h1 className="section-title text-2xl md:text-3xl flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" /> Comunicação em Massa
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie campanhas e dispare mensagens personalizadas via WhatsApp para seus(as) {labels.studentLabel.toLowerCase()}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de Configuração */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-interactive p-6 space-y-4 border-primary/20">
              <div className="space-y-2">
                <Label className="text-base font-bold">1. Público-Alvo</Label>
                <p className="text-sm text-muted-foreground mb-3">Selecione o grupo de {labels.studentLabel.toLowerCase()} que receberá a mensagem.</p>
                <Select value={audience} onValueChange={(val) => setAudience(val as Audience)} disabled={loading}>
                  <SelectTrigger className="w-full bg-background border-border/50">
                    <SelectValue placeholder="Selecione o público" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_active">Todos(as) os(as) {labels.studentLabel} (Ativos)</SelectItem>
                    <SelectItem value="overdue">Inadimplentes (Mensalidade Atrasada)</SelectItem>
                    <SelectItem value="due_7_days">Vencendo nos próximos 7 dias</SelectItem>
                    <SelectItem value="trial">{labels.trainingLabel} Experimentais (Leads)</SelectItem>
                    <SelectItem value="without_plan">{labels.studentLabel} sem {labels.planLabel}</SelectItem>
                    <SelectItem value="inactive">{labels.studentLabel} Inativos(as) (Recuperação)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-4">
                <Label className="text-base font-bold">2. Mensagem</Label>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  Variáveis: <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{nome}`}</code> para o nome do {labels.studentLabelSingular.toLowerCase()}, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{escola}`}</code> para o negócio, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{chave_pix}`}</code> para a chave Pix e <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{beneficiario_pix}`}</code> para o recebedor do Pix.
                </p>
                <Textarea 
                  className="min-h-[150px] resize-none bg-background border-border/50" 
                  placeholder="Escreva sua mensagem aqui..."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                />
                <Button 
                  onClick={handleSaveTemplate}
                  disabled={isUpdatingProfile}
                  variant="outline"
                  className="w-full mt-2 border-primary/20 hover:bg-primary/5 text-primary font-semibold flex items-center justify-center gap-2"
                >
                  {isUpdatingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 text-primary" />
                  )}
                  Salvar Modelo como Padrão
                </Button>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex gap-3 mt-4">
                <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Para evitar bloqueios pelo WhatsApp (Anti-Spam), você precisará clicar em "Enviar" {labels.studentLabelSingular.toLowerCase()} por {labels.studentLabelSingular.toLowerCase()}. A mensagem já será preenchida automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Lista de Alunos */}
          <div className="lg:col-span-2">
            <div className="card-elevated p-6 min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
                <div>
                  <h2 className="text-lg font-bold font-display">Lista de Disparo</h2>
                  <p className="text-sm text-muted-foreground">{targetStudents.length} {targetStudents.length !== 1 ? labels.studentLabel.toLowerCase() : labels.studentLabelSingular.toLowerCase()} encontrado(s)</p>
                </div>
                <div className="bg-muted px-3 py-1.5 rounded-full flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{sentTo.size} / {targetStudents.length} enviados</span>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : targetStudents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-xl border border-dashed border-border/50">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">Nenhum(a) {labels.studentLabelSingular.toLowerCase()} encontrado(a)</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-2">
                    Não existem {labels.studentLabel.toLowerCase()} correspondentes a este filtro no momento. Tente selecionar outro público-alvo.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {targetStudents.map(student => {
                    const isSent = sentTo.has(student.id);
                    return (
                      <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${isSent ? 'bg-success/5 border-success/20' : 'bg-background hover:bg-muted/30 border-border/40'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                            {isSent ? <Check className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm md:text-base truncate" title={student.name}>{student.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{student.phone || 'Sem telefone'}</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleSendWhatsApp(student.id, student.name, student.phone)}
                          variant={isSent ? 'outline' : 'default'}
                          className={`w-full sm:w-auto shrink-0 ${isSent ? 'text-success border-success/30 hover:bg-success/10' : ''}`}
                          disabled={!student.phone}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {isSent ? 'Reenviar' : 'Enviar WhatsApp'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
