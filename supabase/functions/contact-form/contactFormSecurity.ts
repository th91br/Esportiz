export const CONTACT_FORM_MAX_BODY_BYTES = 16_384

const CONTACT_REASONS = new Set(['demo', 'plans', 'support', 'partnership', 'other'])

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://esportiz.com.br',
  'https://www.esportiz.com.br',
  'https://app.esportiz.com.br',
  'http://localhost:5173',
  'http://localhost:8080',
])

export interface ContactFormInput {
  name: string
  email: string
  phone: string
  arenaName: string | null
  reason: string
  message: string
}

export type ContactFormParseResult =
  | { success: true; data: ContactFormInput; isSpam: boolean }
  | { success: false; error: string }

const replaceControlCharacters = (value: string, replacement: string, preserveLineBreaks = false) =>
  Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    const isPreservedLineBreak = preserveLineBreaks && code === 10
    return (code < 32 || code === 127) && !isPreservedLineBreak ? replacement : character
  }).join('')

const normalizeSingleLine = (value: unknown, maxLength: number) =>
  typeof value === 'string'
    ? replaceControlCharacters(value, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''

const normalizeMessage = (value: unknown) =>
  typeof value === 'string'
    ? replaceControlCharacters(value.replace(/\r\n?/g, '\n'), '', true).trim().slice(0, 2_000)
    : ''

export function parseContactFormInput(value: unknown, now = Date.now()): ContactFormParseResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { success: false, error: 'Dados do formulário inválidos.' }
  }

  const body = value as Record<string, unknown>
  const honeypot = normalizeSingleLine(body.website, 200)
  const startedAt = typeof body.formStartedAt === 'number' ? body.formStartedAt : null
  const isSubmittedTooQuickly = startedAt !== null && Number.isFinite(startedAt) && now - startedAt < 1_500

  if (honeypot || isSubmittedTooQuickly) {
    return {
      success: true,
      isSpam: true,
      data: { name: '', email: '', phone: '', arenaName: null, reason: '', message: '' },
    }
  }

  const name = normalizeSingleLine(body.name, 120)
  const email = normalizeSingleLine(body.email, 254).toLowerCase()
  const phone = normalizeSingleLine(body.phone, 30)
  const arenaName = normalizeSingleLine(body.arenaName, 160)
  const reason = normalizeSingleLine(body.reason, 40)
  const message = normalizeMessage(body.message)

  if (!name || !email || !phone || !reason || !message) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { success: false, error: 'Informe um e-mail válido.' }
  }

  const phoneDigits = phone.replace(/\D/g, '')
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { success: false, error: 'Informe um celular válido com DDD.' }
  }

  if (!CONTACT_REASONS.has(reason)) {
    return { success: false, error: 'Selecione um motivo de contato válido.' }
  }

  if (message.length < 10) {
    return { success: false, error: 'A mensagem deve ter pelo menos 10 caracteres.' }
  }

  return {
    success: true,
    isSpam: false,
    data: { name, email, phone, arenaName: arenaName || null, reason, message },
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)
}

export function resolveAllowedOrigin(origin: string | null, configuredOrigins?: string): string | null {
  if (!origin) return null

  const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS)
  configuredOrigins
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => allowedOrigins.add(item))

  return allowedOrigins.has(origin) ? origin : null
}