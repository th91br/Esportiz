import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Users, Check, AlertCircle, Save, Loader2, Copy, PhoneOff } from 'lucide-react';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePayments } from '@/hooks/queries/usePayments';
import { getActiveMonthlyStudents, getInactiveStudents, getStudentsWithoutPlan } from '@/lib/studentHelpers';
import { usePlans } from '@/hooks/queries/usePlans';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { useReservations } from '@/hooks/queries/useReservations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getLocalTodayDate, toLocalDateString } from '@/lib/dateUtils';
import {
  applyCommunicationTemplate,
  buildPixDetails,
  buildWhatsAppAction,
  getFirstName,
  getDefaultCommunicationTemplate,
  type SportSchoolCommunicationEvent,
} from '@/lib/communicationContracts';

type Audience = 'all_active' | 'overdue' | 'due_7_days' | 'trial' | 'without_plan' | 'inactive' | 'payment_reminder';

const AUDIENCE_EVENT_MAP: Record<Audience, SportSchoolCommunicationEvent> = {
  all_active: 'general_announcement',
  overdue: 'payment_overdue',
  due_7_days: 'payment_due_soon',
  trial: 'trial_follow_up',
  without_plan: 'without_plan',
  inactive: 'inactive_recovery',
  payment_reminder: 'general_announcement',
};

const ARENA_AUDIENCES = new Set<Audience>(['all_active', 'inactive', 'payment_reminder']);

function getArenaAudienceTemplate(audience: Audience): string {
  if (audience === 'inactive') {
    return 'Ola {nome}, tudo bem? Aqui e da {escola}. Sentimos sua falta por aqui. Posso te ajudar a encontrar um novo horario para jogar?';
  }
  if (audience === 'payment_reminder') {
    return 'Olá {nome}, identificamos uma cobrança em aberto na {escola} no valor de R$ {valor}. Você poderia verificar por gentileza? Chave Pix: {chave_pix}';
  }

  return 'Ola {nome}, tudo bem? Aqui e da {escola}. Passando para compartilhar uma informacao importante sobre nossos horarios e reservas.';
}

export default function CommunicationPage() {
  const { students, loadingStudents } = useStudents();
  const { payments, loadingPayments } = usePayments();
  const { plans, loadingPlans } = usePlans();
  const { reservations, loadingReservations } = useReservations();
  const { labels } = useBusinessContext();
  const { profile, updateProfile, isUpdatingProfile } = useProfile();
  const isArena = profile?.business_type === 'arena';
  
  // Nome dinâmico do negócio com fallbacks personalizados por modalidade
  const businessName = profile?.ct_name || (
    profile?.business_type === 'sport_school' ? 'Sportiz Sport' : 'Esportiz Arena'
  );
  
  const [audience, setAudience] = useState<Audience>('all_active');
  const [messageTemplate, setMessageTemplate] = useState(getDefaultCommunicationTemplate('sport_school', 'general_announcement') || 'Ola {nome}, tudo bem? Aqui e da {escola}.');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendingStudent, setSendingStudent] = useState<{ id: string; name: string; phone: string | null } | null>(null);

  useEffect(() => {
    if (isArena && !ARENA_AUDIENCES.has(audience)) {
      setAudience('all_active');
    }
  }, [audience, isArena]);

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
        const defaultTemplate = isArena
          ? getArenaAudienceTemplate(audience)
          : getDefaultCommunicationTemplate('sport_school', AUDIENCE_EVENT_MAP[audience]);
        setMessageTemplate(defaultTemplate || 'Ola {nome}, tudo bem? Aqui e da {escola}.');
      }
    }
  }, [profile, audience, isArena]);

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

  const loading = loadingStudents || loadingPayments || loadingPlans || (isArena ? loadingReservations : false);

  // Filtro de Audiência
  const targetStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    const activeMonthly = getActiveMonthlyStudents(students, plans);
    const todayStr = getLocalTodayDate();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = toLocalDateString(sevenDaysFromNow);

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
      case 'payment_reminder': {
        // Find reservantes with pending reservations (paymentStatus === 'pending' and remainingBalance > 0)
        const pendingReservations = reservations.filter(r => r.paymentStatus === 'pending' && r.remainingBalance > 0);
        const pendingStudentIds = new Set(pendingReservations.flatMap(r => r.reservanteIds));
        return students.filter(s => pendingStudentIds.has(s.id));
      }
      default:
        return [];
    }
  }, [students, plans, payments, reservations, audience]);

  const getPendingBalanceForStudent = (studentId: string) => {
    if (!isArena) return 0;
    const pendingReservations = reservations.filter(
      r => r.paymentStatus === 'pending' && r.remainingBalance > 0 && r.reservanteIds.includes(studentId)
    );
    return pendingReservations.reduce((sum, r) => sum + r.remainingBalance, 0);
  };

  // Função para limpar o telefone
  const buildTemplateVariables = (studentId: string, studentName: string) => {
    const pendingVal = getPendingBalanceForStudent(studentId);
    return {
      nome: getFirstName(studentName),
      nome_completo: studentName,
      escola: businessName,
      chave_pix: profile?.pix_key || '',
      beneficiario_pix: profile?.pix_receiver || '',
      pix_key: profile?.pix_key || '',
      pix_receiver: profile?.pix_receiver || '',
      valor: pendingVal.toFixed(2),
    };
  };

  const buildMessageForStudent = (studentId: string, studentName: string) => {
    const templateVariables = buildTemplateVariables(studentId, studentName);
    const personalizedMessage = applyCommunicationTemplate(messageTemplate, templateVariables);

    if ((audience === 'overdue' || audience === 'due_7_days') && profile?.pix_key && !messageTemplate.includes('{chave_pix}') && !messageTemplate.includes('{pix}')) {
      return `${personalizedMessage}${buildPixDetails(templateVariables)}`;
    }

    return personalizedMessage;
  };

  const previewStudent = targetStudents[0];
  const previewMessage = previewStudent ? buildMessageForStudent(previewStudent.id, previewStudent.name) : '';

  const handleCopyPreview = () => {
    if (!previewMessage) {
      toast.error('Nenhuma mensagem disponivel para copiar.');
      return;
    }

    void navigator.clipboard.writeText(previewMessage);
    toast.success('Preview copiado com sucesso!');
  };

  const handleCopyStudentMessage = (studentId: string, studentName: string) => {
    const message = buildMessageForStudent(studentId, studentName);
    if (!message) {
      toast.error('Mensagem vazia para este contato.');
      return;
    }

    void navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada com sucesso!');
  };

  const handleSendWhatsApp = (studentId: string, studentName: string, studentPhone: string | null) => {
    setSendingStudent({ id: studentId, name: studentName, phone: studentPhone });
  };

  const handleConfirmSend = () => {
    if (!sendingStudent) return;
    const message = buildMessageForStudent(sendingStudent.id, sendingStudent.name);
    const safeAction = buildWhatsAppAction({ phone: sendingStudent.phone, message });
    if (safeAction.ok === false) {
      toast.error('Nao foi possivel montar a mensagem para WhatsApp.');
      return;
    }

    window.open(safeAction.url, '_blank');
    setSentTo(prev => {
      const next = new Set(prev);
      next.add(sendingStudent.id);
      return next;
    });
    setSendingStudent(null);
    toast.success('Mensagem redirecionada ao WhatsApp!');
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
                    {!isArena && (
                      <>
                    <SelectItem value="overdue">Inadimplentes (Mensalidade Atrasada)</SelectItem>
                    <SelectItem value="due_7_days">Vencendo nos próximos 7 dias</SelectItem>
                    <SelectItem value="trial">{labels.trainingLabel} Experimentais (Leads)</SelectItem>
                    <SelectItem value="without_plan">{labels.studentLabel} sem {labels.planLabel}</SelectItem>
                      </>
                    )}
                    {isArena && (
                      <SelectItem value="payment_reminder">Lembrete de Pagamento (Pendentes)</SelectItem>
                    )}
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

              <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-bold">Preview</Label>
                    <p className="text-xs text-muted-foreground">
                      {previewStudent ? `Exemplo para ${previewStudent.name}` : 'Selecione um publico com contatos.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleCopyPreview}
                    disabled={!previewMessage}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
                <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs leading-relaxed text-foreground border border-border/40">
                  {previewMessage || 'Nenhuma mensagem para visualizar.'}
                </pre>
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
                    const message = buildMessageForStudent(student.id, student.name);
                    const whatsappAction = buildWhatsAppAction({ phone: student.phone, message });
                    const canSend = whatsappAction.ok;
                    return (
                      <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${isSent ? 'bg-success/5 border-success/20' : canSend ? 'bg-background hover:bg-muted/30 border-border/40' : 'bg-destructive/5 border-destructive/20'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isSent ? 'bg-success/20 text-success' : canSend ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {isSent ? <Check className="h-5 w-5" /> : canSend ? <Users className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm md:text-base truncate" title={student.name}>{student.name}</p>
                            <p className={`text-xs truncate ${canSend ? 'text-muted-foreground' : 'text-destructive'}`}>
                              {student.phone ? (canSend ? student.phone : `${student.phone} - invalido`) : 'Sem telefone'}
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                          <Button
                            type="button"
                            onClick={() => handleCopyStudentMessage(student.id, student.name)}
                            variant="outline"
                            className="w-full sm:w-auto shrink-0"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                          <Button
                            onClick={() => handleSendWhatsApp(student.id, student.name, student.phone)}
                            variant={isSent ? 'outline' : 'default'}
                            className={`w-full sm:w-auto shrink-0 ${isSent ? 'text-success border-success/30 hover:bg-success/10' : ''}`}
                            disabled={!canSend}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {isSent ? 'Reenviar' : 'Enviar'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Dialog de Confirmação de Envio (Anti-Spam Preview) */}
      <Dialog open={!!sendingStudent} onOpenChange={(open) => { if (!open) setSendingStudent(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border/50 backdrop-blur-xl bg-background/95">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Confirmar Envio
            </DialogTitle>
            <DialogDescription>
              Revise os dados de envio antes de abrir o WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {sendingStudent && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Destinatário</p>
                <p className="font-semibold text-sm text-foreground">{sendingStudent.name}</p>
                <p className="text-xs text-muted-foreground">{sendingStudent.phone || 'Sem telefone'}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Mensagem Personalizada</p>
                <div className="rounded-xl border border-border/40 bg-muted/30 p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                  {buildMessageForStudent(sendingStudent.id, sendingStudent.name)}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setSendingStudent(null)} className="w-full sm:flex-1 h-11">
                  Cancelar
                </Button>
                <Button type="button" onClick={handleConfirmSend} className="w-full sm:flex-1 h-11 bg-primary text-primary-foreground font-bold shadow-md flex items-center justify-center gap-1.5 hover:bg-primary/95">
                  <MessageCircle className="h-4 w-4" />
                  Confirmar e Enviar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
