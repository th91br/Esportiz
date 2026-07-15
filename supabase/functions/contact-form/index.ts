import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  CONTACT_FORM_MAX_BODY_BYTES,
  escapeHtml,
  parseContactFormInput,
  resolveAllowedOrigin,
} from './contactFormSecurity.ts'

const getCorsHeaders = (allowedOrigin: string | null) => ({
  ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
})

const jsonResponse = (body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  })

serve(async (req) => {
  const requestOrigin = req.headers.get('origin')
  const allowedOrigin = resolveAllowedOrigin(
    requestOrigin,
    Deno.env.get('CONTACT_FORM_ALLOWED_ORIGINS'),
  )
  const corsHeaders = getCorsHeaders(allowedOrigin)

  if (requestOrigin && !allowedOrigin) {
    return jsonResponse({ error: 'Origem não autorizada.' }, 403, corsHeaders)
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, corsHeaders)
  }

  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > CONTACT_FORM_MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Formulário excede o tamanho permitido.' }, 413, corsHeaders)
    }

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > CONTACT_FORM_MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Formulário excede o tamanho permitido.' }, 413, corsHeaders)
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return jsonResponse({ error: 'Dados do formulário inválidos.' }, 400, corsHeaders)
    }

    const parsed = parseContactFormInput(body)
    if (!parsed.success) {
      return jsonResponse({ error: parsed.error }, 422, corsHeaders)
    }
    if (parsed.isSpam) {
      return jsonResponse({ success: true }, 200, corsHeaders)
    }

    const { name, email, phone, arenaName, reason, message } = parsed.data
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('contact-form configuration_missing')
      return jsonResponse({ error: 'Serviço temporariamente indisponível.' }, 503, corsHeaders)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        phone,
        arena_name: arenaName,
        reason,
        message,
        status: "pending",
      })

    if (dbError) {
      console.error('contact-form database_insert_failed', { code: dbError.code })
      return jsonResponse({ error: 'Não foi possível enviar a mensagem agora.' }, 500, corsHeaders)
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (resendApiKey) {
      const safeName = escapeHtml(name)
      const safeEmail = escapeHtml(email)
      const safePhone = escapeHtml(phone)
      const safeArenaName = escapeHtml(arenaName ?? 'Não informada')
      const safeReason = escapeHtml(reason)
      const safeMessage = escapeHtml(message)
      const emailHtml = `
        <h3>Novo Contato Recebido - Esportiz</h3>
        <p><strong>Nome:</strong> ${safeName}</p>
        <p><strong>E-mail:</strong> ${safeEmail}</p>
        <p><strong>WhatsApp/Celular:</strong> ${safePhone}</p>
        <p><strong>Escola ou Arena:</strong> ${safeArenaName}</p>
        <p><strong>Motivo do Contato:</strong> ${safeReason}</p>
        <br />
        <p><strong>Mensagem:</strong></p>
        <div style="background: #f4f6f8; padding: 16px; border-radius: 8px; border: 1px solid #d1d7e0; white-space: pre-wrap;">${safeMessage}</div>
        <hr style="border: none; border-top: 1px solid #e1e7f0; margin-top: 24px;" />
        <p style="font-size: 12px; color: #5c6e8a;">Esta mensagem foi salva no banco de dados do Supabase.</p>
      `

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Esportiz Contato <onboarding@resend.dev>",
          to: ["esportiz@outlook.com.br"],
          subject: `Novo Lead Esportiz: ${name} (${reason})`,
          html: emailHtml,
        }),
      })

      if (!resendResponse.ok) {
        console.error('contact-form email_dispatch_failed', { status: resendResponse.status })
      }
    } else {
      console.warn('contact-form email_dispatch_skipped')
    }

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch {
    console.error('contact-form unexpected_failure')
    return jsonResponse({ error: 'Não foi possível enviar a mensagem agora.' }, 500, corsHeaders)
  }
})
