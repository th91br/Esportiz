import { describe, expect, it } from 'vitest';
import {
  applyCommunicationTemplate,
  buildCommunicationMessage,
  buildCommunicationWhatsAppAction,
  buildPixDetails,
  buildWhatsAppAction,
  buildWhatsAppUrl,
  getDefaultCommunicationTemplate,
  getFirstName,
  isSupportedCommunicationEvent,
  normalizeWhatsAppPhone,
} from './communicationContracts';

describe('communicationContracts', () => {
  it('normalizes Brazilian WhatsApp phones with and without country code', () => {
    expect(normalizeWhatsAppPhone('(54) 98116-7720')).toBe('5554981167720');
    expect(normalizeWhatsAppPhone('54 3211-7788')).toBe('555432117788');
    expect(normalizeWhatsAppPhone('+55 54 98116-7720')).toBe('5554981167720');
  });

  it('rejects unsafe or incomplete phone numbers', () => {
    expect(normalizeWhatsAppPhone(null)).toBeNull();
    expect(normalizeWhatsAppPhone('123')).toBeNull();
    expect(normalizeWhatsAppPhone('0054 98116 7720')).toBeNull();
  });

  it('applies templates with safe fallbacks for missing variables', () => {
    expect(applyCommunicationTemplate('Ola {nome}, valor {valor}. {ausente}', {
      nome: 'Thiago',
      valor: 'R$ 100,00',
    })).toBe('Ola Thiago, valor R$ 100,00.');

    expect(getFirstName('  Thiago   Cassol  ')).toBe('Thiago');
    expect(getFirstName('')).toBe('Cliente');
  });

  it('builds Pix details only when a Pix key is present', () => {
    expect(buildPixDetails({})).toBe('');
    expect(buildPixDetails({
      chave_pix: 'pix@esportiz.com.br',
      beneficiario_pix: 'Esportiz',
    })).toContain('Chave Pix: pix@esportiz.com.br');
    expect(buildPixDetails({
      pix_key: '11999999999',
    })).toContain('Chave Pix: 11999999999');
  });

  it('keeps sport school and arena events separated', () => {
    expect(isSupportedCommunicationEvent('sport_school', 'general_announcement')).toBe(true);
    expect(isSupportedCommunicationEvent('sport_school', 'payment_overdue')).toBe(true);
    expect(isSupportedCommunicationEvent('sport_school', 'booking_confirmation')).toBe(false);
    expect(isSupportedCommunicationEvent('arena', 'booking_confirmation')).toBe(true);
    expect(isSupportedCommunicationEvent('arena', 'general_announcement')).toBe(false);
    expect(isSupportedCommunicationEvent('arena', 'birthday')).toBe(false);
  });

  it('returns default templates only for supported events', () => {
    expect(getDefaultCommunicationTemplate('sport_school', 'birthday')).toContain('Parabens');
    expect(getDefaultCommunicationTemplate('arena', 'payment_reminder')).toContain('{valor}');
    expect(getDefaultCommunicationTemplate('arena', 'birthday')).toBeNull();
  });

  it('keeps default templates aligned with each business type language', () => {
    expect(getDefaultCommunicationTemplate('sport_school', 'trial_follow_up')).toContain('aula experimental');
    expect(getDefaultCommunicationTemplate('sport_school', 'without_plan')).toContain('continuar treinando');
    expect(getDefaultCommunicationTemplate('arena', 'booking_confirmation')).toContain('Quadra: {quadra}');
    expect(getDefaultCommunicationTemplate('arena', 'booking_confirmation')).not.toMatch(/aula/i);
    expect(getDefaultCommunicationTemplate('arena', 'reservation_reminder')).toContain('reserva');
  });

  it('builds sport school messages with payment and portal variables', () => {
    expect(buildCommunicationMessage({
      businessType: 'sport_school',
      event: 'general_announcement',
      variables: {
        nome: 'Ana',
        escola: 'Sportiz Sport',
      },
    })).toContain('informacao importante');

    expect(buildCommunicationMessage({
      businessType: 'sport_school',
      event: 'payment_overdue',
      variables: {
        nome: 'Ana',
        escola: 'Sportiz Sport',
        valor: 'R$ 120,00',
        chave_pix: 'pix@sportiz.com.br',
      },
    })).toContain('mensalidade em aberto na Sportiz Sport');

    expect(buildCommunicationMessage({
      businessType: 'sport_school',
      event: 'student_portal_link',
      variables: {
        nome: 'Ana',
        escola: 'Sportiz Sport',
        portal_link: 'https://app.esportiz.com.br/portal-aluno?ct=tenant',
      },
    })).toContain('portal-aluno?ct=tenant');
  });

  it('builds arena messages with reservation variables and custom templates', () => {
    expect(buildCommunicationMessage({
      businessType: 'arena',
      event: 'booking_confirmation',
      variables: {
        nome: 'Joao',
        escola: 'Esportiz Arena',
        quadra: 'Quadra 1',
        data: '20/05/2026',
        hora: '19:00',
        valor: 'R$ 100,00',
      },
    })).toContain('Quadra: Quadra 1');

    expect(buildCommunicationMessage({
      businessType: 'arena',
      event: 'payment_reminder',
      customTemplate: 'Oi {nome}, falta {valor} da reserva na {escola}.',
      variables: {
        nome: 'Joao',
        escola: 'Esportiz Arena',
        valor: 'R$ 50,00',
      },
    })).toBe('Oi Joao, falta R$ 50,00 da reserva na Esportiz Arena.');
  });

  it('builds encoded WhatsApp URLs and guarded actions', () => {
    const url = buildWhatsAppUrl('5554981167720', 'Ola Ana, tudo bem?');
    expect(url).toBe('https://wa.me/5554981167720?text=Ola%20Ana%2C%20tudo%20bem%3F');

    expect(buildWhatsAppAction({ phone: '123', message: 'Ola' })).toEqual({
      ok: false,
      reason: 'invalid_phone',
    });

    expect(buildWhatsAppAction({ phone: '(54) 98116-7720', message: '   ' })).toEqual({
      ok: false,
      reason: 'empty_message',
    });
  });

  it('builds a full assisted communication action without sending anything', () => {
    const action = buildCommunicationWhatsAppAction('(54) 98116-7720', {
      businessType: 'arena',
      event: 'reservation_reminder',
      variables: {
        nome: 'Thiago',
        escola: 'Esportiz Arena',
        quadra: 'Quadra 2',
        data: '20/05/2026',
        hora: '21:00',
      },
    });

    expect(action.ok).toBe(true);
    if (action.ok) {
      expect(action.phone).toBe('5554981167720');
      expect(action.message).toContain('Quadra 2');
      expect(action.url).toContain('https://wa.me/5554981167720?text=');
    }
  });
});
