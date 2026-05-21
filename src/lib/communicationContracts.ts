import { normalizeDigits } from './publicPortalSecurity';

export type CommunicationBusinessType = 'sport_school' | 'arena';

export type SportSchoolCommunicationEvent =
  | 'general_announcement'
  | 'payment_overdue'
  | 'payment_due_soon'
  | 'birthday'
  | 'trial_follow_up'
  | 'inactive_recovery'
  | 'without_plan'
  | 'student_portal_link'
  | 'class_reminder';

export type ArenaCommunicationEvent =
  | 'booking_confirmation'
  | 'payment_reminder'
  | 'booking_link'
  | 'reservation_reminder'
  | 'reservation_cancelled'
  | 'post_game_rebook';

export type CommunicationEvent = SportSchoolCommunicationEvent | ArenaCommunicationEvent;

export type TemplateVariables = Record<string, string | number | null | undefined>;

export interface CommunicationTemplateInput {
  businessType: CommunicationBusinessType;
  event: CommunicationEvent;
  variables?: TemplateVariables;
  customTemplate?: string | null;
}

export interface WhatsAppActionInput {
  phone: string | null | undefined;
  message: string | null | undefined;
}

export type WhatsAppActionResult =
  | {
      ok: true;
      phone: string;
      message: string;
      url: string;
    }
  | {
      ok: false;
      reason: 'invalid_phone' | 'empty_message';
    };

const SPORT_SCHOOL_EVENTS = new Set<CommunicationEvent>([
  'general_announcement',
  'payment_overdue',
  'payment_due_soon',
  'birthday',
  'trial_follow_up',
  'inactive_recovery',
  'without_plan',
  'student_portal_link',
  'class_reminder',
]);

const ARENA_EVENTS = new Set<CommunicationEvent>([
  'booking_confirmation',
  'payment_reminder',
  'booking_link',
  'reservation_reminder',
  'reservation_cancelled',
  'post_game_rebook',
]);

const DEFAULT_TEMPLATES: Record<CommunicationBusinessType, Record<string, string>> = {
  sport_school: {
    general_announcement: 'Ola {nome}, tudo bem? Aqui e da {escola}. Passando para compartilhar uma informacao importante com voce.',
    payment_overdue: 'Ola {nome}, tudo bem? Identificamos uma mensalidade em aberto na {escola}. Valor: {valor}.{pix}\n\nQuando puder, nos envie o comprovante para mantermos seu plano em dia. Obrigado!',
    payment_due_soon: 'Ola {nome}, tudo bem? Sua mensalidade na {escola} vence nos proximos dias. Valor: {valor}.{pix}\n\nQualquer duvida, estamos a disposicao.',
    birthday: 'Parabens, {nome}! Feliz aniversario. A equipe da {escola} deseja um dia especial, com muita saude e boas conquistas.',
    trial_follow_up: 'Ola {nome}, tudo bem? Aqui e da {escola}. Queremos saber como foi sua aula experimental e se podemos te ajudar a escolher o melhor plano.',
    inactive_recovery: 'Ola {nome}, tudo bem? Sentimos sua falta na {escola}. Quando quiser retomar os treinos, podemos te ajudar a encontrar um horario ideal.',
    without_plan: 'Ola {nome}, tudo bem? Vimos que voce ainda esta sem plano ativo na {escola}. Podemos te ajudar a escolher a melhor opcao para continuar treinando.',
    student_portal_link: 'Ola {nome}, tudo bem? Segue seu acesso ao Portal do Aluno da {escola}: {portal_link}',
    class_reminder: 'Ola {nome}, tudo bem? Passando para lembrar do seu treino na {escola}: {data} as {hora}.',
  },
  arena: {
    booking_confirmation: 'Ola {nome}! Sua reserva esta confirmada na {escola}.\n\nQuadra: {quadra}\nData: {data}\nHorario: {hora}\nValor: {valor}.{pix}\n\nAguardamos voce. Bom jogo!',
    payment_reminder: 'Ola {nome}, tudo bem? Passando para lembrar do acerto da sua reserva na {escola}. Valor: {valor}.{pix}\n\nSe ja realizou o pagamento, pode nos enviar o comprovante por aqui. Obrigado!',
    booking_link: 'Ola {nome}, tudo bem? Segue o link de agendamento online da {escola}: {booking_link}',
    reservation_reminder: 'Ola {nome}, tudo bem? Lembrete da sua reserva na {escola}: {data} as {hora}, na {quadra}.',
    reservation_cancelled: 'Ola {nome}, sua reserva na {escola} em {data} as {hora} foi cancelada. Qualquer duvida, estamos a disposicao.',
    post_game_rebook: 'Ola {nome}, obrigado por jogar na {escola}. Para reservar seu proximo horario, use este link: {booking_link}',
  },
};

function getVariableValue(variables: TemplateVariables, key: string): string {
  const value = variables[key];
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeTemplateText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = normalizeDigits(phone);
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  return null;
}

export function isSupportedCommunicationEvent(
  businessType: CommunicationBusinessType,
  event: CommunicationEvent,
): boolean {
  return businessType === 'arena' ? ARENA_EVENTS.has(event) : SPORT_SCHOOL_EVENTS.has(event);
}

export function getFirstName(name: string | null | undefined): string {
  const normalizedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  return normalizedName.split(' ')[0] || 'Cliente';
}

export function buildPixDetails(variables: TemplateVariables = {}): string {
  const pixKey = getVariableValue(variables, 'chave_pix') || getVariableValue(variables, 'pix_key');
  const pixReceiver = getVariableValue(variables, 'beneficiario_pix') || getVariableValue(variables, 'pix_receiver');

  if (!pixKey) return '';

  return `\n\nDados para pagamento via Pix:\nChave Pix: ${pixKey}${pixReceiver ? `\nBeneficiario: ${pixReceiver}` : ''}`;
}

export function applyCommunicationTemplate(template: string, variables: TemplateVariables = {}): string {
  const safeVariables = {
    ...variables,
    nome: variables.nome ?? getFirstName(getVariableValue(variables, 'nome_completo')),
    pix: variables.pix ?? buildPixDetails(variables),
  };

  return template
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => getVariableValue(safeVariables, key))
    .trim();
}

export function getDefaultCommunicationTemplate(
  businessType: CommunicationBusinessType,
  event: CommunicationEvent,
): string | null {
  if (!isSupportedCommunicationEvent(businessType, event)) return null;
  return DEFAULT_TEMPLATES[businessType][event] || null;
}

export function buildCommunicationMessage(input: CommunicationTemplateInput): string {
  const template = normalizeTemplateText(input.customTemplate)
    || getDefaultCommunicationTemplate(input.businessType, input.event)
    || '';

  if (!template) return '';

  return applyCommunicationTemplate(template, input.variables);
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppAction(input: WhatsAppActionInput): WhatsAppActionResult {
  const phone = normalizeWhatsAppPhone(input.phone);
  if (!phone) return { ok: false, reason: 'invalid_phone' };

  const message = normalizeTemplateText(input.message);
  if (!message) return { ok: false, reason: 'empty_message' };

  return {
    ok: true,
    phone,
    message,
    url: buildWhatsAppUrl(phone, message),
  };
}

export function buildCommunicationWhatsAppAction(
  phone: string | null | undefined,
  templateInput: CommunicationTemplateInput,
): WhatsAppActionResult {
  return buildWhatsAppAction({
    phone,
    message: buildCommunicationMessage(templateInput),
  });
}
