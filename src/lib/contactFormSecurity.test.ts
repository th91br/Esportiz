import { describe, expect, it } from 'vitest';
import {
  CONTACT_FORM_MAX_BODY_BYTES,
  escapeHtml,
  parseContactFormInput,
  resolveAllowedOrigin,
} from '../../supabase/functions/contact-form/contactFormSecurity';

const validInput = {
  name: '  Maria   Silva  ',
  email: ' MARIA@EXAMPLE.COM ',
  phone: '(11) 99999-8888',
  arenaName: ' Arena Central ',
  reason: 'demo',
  message: ' Gostaria de conhecer a plataforma. ',
};

describe('contact form security', () => {
  it('normalizes a valid public submission', () => {
    expect(parseContactFormInput(validInput)).toEqual({
      success: true,
      isSpam: false,
      data: {
        name: 'Maria Silva',
        email: 'maria@example.com',
        phone: '(11) 99999-8888',
        arenaName: 'Arena Central',
        reason: 'demo',
        message: 'Gostaria de conhecer a plataforma.',
      },
    });
  });

  it('rejects invalid contact data without accepting arbitrary reasons', () => {
    expect(parseContactFormInput({ ...validInput, email: 'not-an-email' })).toMatchObject({ success: false });
    expect(parseContactFormInput({ ...validInput, phone: '1234' })).toMatchObject({ success: false });
    expect(parseContactFormInput({ ...validInput, reason: 'admin' })).toMatchObject({ success: false });
    expect(parseContactFormInput({ ...validInput, message: 'curta' })).toMatchObject({ success: false });
  });

  it('silently identifies honeypot and implausibly fast submissions as spam', () => {
    expect(parseContactFormInput({ ...validInput, website: 'spam.example' })).toMatchObject({ success: true, isSpam: true });
    expect(parseContactFormInput({ ...validInput, formStartedAt: 9_500 }, 10_000)).toMatchObject({ success: true, isSpam: true });
  });

  it('escapes all HTML-significant characters used in notification emails', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'quoted'`))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#039;quoted&#039;');
  });

  it('allows only explicit production, development, or configured origins', () => {
    expect(resolveAllowedOrigin('https://esportiz.com.br')).toBe('https://esportiz.com.br');
    expect(resolveAllowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');
    expect(resolveAllowedOrigin('https://preview.example', 'https://preview.example')).toBe('https://preview.example');
    expect(resolveAllowedOrigin('https://attacker.example')).toBeNull();
    expect(CONTACT_FORM_MAX_BODY_BYTES).toBe(16_384);
  });
});