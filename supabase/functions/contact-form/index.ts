import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { name, email, phone, arenaName, reason, message } = body

    // Validate request body
    if (!name || !email || !phone || !reason || !message) {
      throw new Error("Preencha todos os campos obrigatórios (Nome, E-mail, Celular, Motivo e Mensagem).")
    }

    // Initialize Supabase Client using Service Role Key to bypass RLS safely
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Save lead in the database
    const { error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        phone,
        arena_name: arenaName || null,
        reason,
        message,
        status: "pending"
      })

    if (dbError) {
      console.error("Database Insert Error:", dbError)
      throw new Error("Erro interno ao salvar os dados no banco de dados.")
    }

    // Attempt to notify by email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (resendApiKey) {
      const emailHtml = `
        <h3>Novo Contato Recebido - Esportiz</h3>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>WhatsApp/Celular:</strong> ${phone}</p>
        <p><strong>Escola ou Arena:</strong> ${arenaName || 'Não informada'}</p>
        <p><strong>Motivo do Contato:</strong> ${reason}</p>
        <br />
        <p><strong>Mensagem:</strong></p>
        <div style="background: #f4f6f8; padding: 16px; border-radius: 8px; border: 1px solid #d1d7e0; white-space: pre-wrap;">${message}</div>
        <hr style="border: none; border-top: 1px solid #e1e7f0; margin-top: 24px;" />
        <p style="font-size: 12px; color: #5c6e8a;">Esta mensagem foi salva no banco de dados do Supabase.</p>
      `

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: "Esportiz Contato <onboarding@resend.dev>",
          to: ["esportiz@outlook.com.br"],
          subject: `Novo Lead Esportiz: ${name} (${reason})`,
          html: emailHtml
        })
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        console.error("Resend API Error details:", errorText)
      }
    } else {
      console.warn("RESEND_API_KEY not configured in Supabase. E-mail dispatch skipped.")
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido"
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
