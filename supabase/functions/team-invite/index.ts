import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const ALLOWED_ROLES = new Set(["manager", "receptionist", "instructor", "finance"])

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido"
}

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase()
}

function normalizeRole(role: unknown) {
  return String(role || "").trim().toLowerCase()
}

function getSiteUrl(req: Request) {
  const origin = req.headers.get("origin")
  const configuredUrl = Deno.env.get("SITE_URL")
  return configuredUrl || origin || "https://www.esportiz.com.br"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { organization_id, email: rawEmail, role: rawRole } = await req.json()
    const email = normalizeEmail(rawEmail)
    const role = normalizeRole(rawRole)

    if (!organization_id) throw new Error("Organizacao nao informada.")
    if (!email || !email.includes("@")) throw new Error("E-mail invalido.")
    if (!ALLOWED_ROLES.has(role)) throw new Error("Cargo invalido para convite.")

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Sessao nao informada.")

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) throw new Error("Sessao invalida.")

    const { data: ownerMembership, error: ownerError } = await supabaseClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("active", true)
      .maybeSingle()

    if (ownerError) throw ownerError
    if (!ownerMembership) throw new Error("Apenas o dono pode convidar membros.")

    const redirectTo = `${getSiteUrl(req).replace(/\/$/, "")}/login?mode=login`
    const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        organization_id,
        role,
      },
    })

    if (inviteError) throw inviteError

    const invitedUserId = inviteData.user?.id
    if (!invitedUserId) throw new Error("Nao foi possivel identificar o usuario convidado.")

    const { error: memberError } = await supabaseClient
      .from("organization_members")
      .upsert({
        organization_id,
        user_id: invitedUserId,
        role,
        active: true,
        invited_email: email,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "organization_id,user_id",
      })

    if (memberError) throw memberError

    return new Response(JSON.stringify({
      success: true,
      invited_email: email,
      role,
      user_id: invitedUserId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
