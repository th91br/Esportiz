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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { organization_id, email: rawEmail, role: rawRole, action: rawAction, password, user_id } = body
    
    const action = String(rawAction || "create").trim().toLowerCase()
    
    if (!organization_id) throw new Error("Organizacao nao informada.")

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    // Verify caller session
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Sessao nao informada.")

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) throw new Error("Sessao invalida.")

    // Verify caller is owner of the organization
    const { data: ownerMembership, error: ownerError } = await supabaseClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .eq("active", true)
      .maybeSingle()

    if (ownerError) throw ownerError
    if (!ownerMembership) throw new Error("Apenas o dono da organizacao pode gerenciar a equipe.")

    if (action === "create") {
      const email = normalizeEmail(rawEmail)
      const role = normalizeRole(rawRole)

      if (!email || !email.includes("@")) throw new Error("E-mail invalido.")
      if (!ALLOWED_ROLES.has(role)) throw new Error("Cargo invalido para a equipe.")
      
      const passwordStr = String(password || "").trim()
      if (passwordStr.length < 6) {
        throw new Error("A senha provisoria deve conter no minimo 6 caracteres.")
      }

      // Fetch owner profile to copy settings to the employee profile
      const { data: organization, error: organizationError } = await supabaseClient
        .from("organizations")
        .select("id, owner_user_id, name")
        .eq("id", organization_id)
        .maybeSingle()

      if (organizationError) throw organizationError
      if (!organization?.owner_user_id) throw new Error("Organizacao nao encontrada.")

      const { data: ownerProfile, error: ownerProfileError } = await supabaseClient
        .from("profiles")
        .select(`
          ct_name,
          logo_url,
          primary_color,
          secondary_color,
          business_type,
          pix_key,
          pix_receiver,
          niche_settings
        `)
        .eq("user_id", organization.owner_user_id)
        .maybeSingle()

      if (ownerProfileError) throw ownerProfileError

      // Create user directly in Supabase Auth
      const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
        email,
        password: passwordStr,
        email_confirm: true,
        user_metadata: {
          organization_id,
          role,
        },
      })

      if (userError) throw userError

      const invitedUserId = userData.user?.id
      if (!invitedUserId) throw new Error("Nao foi possivel identificar o usuario criado.")

      // Link user to the organization
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

      // Create profile copying owner's branding
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .upsert({
          user_id: invitedUserId,
          organization_id,
          ct_name: ownerProfile?.ct_name || organization.name || "Esportiz",
          logo_url: ownerProfile?.logo_url || null,
          primary_color: ownerProfile?.primary_color || null,
          secondary_color: ownerProfile?.secondary_color || null,
          business_type: ownerProfile?.business_type === "arena" ? "arena" : "sport_school",
          onboarding_completed: true,
          pix_key: ownerProfile?.pix_key || null,
          pix_receiver: ownerProfile?.pix_receiver || null,
          niche_settings: ownerProfile?.niche_settings || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        })

      if (profileError) throw profileError

      return new Response(JSON.stringify({
        success: true,
        invited_email: email,
        role,
        user_id: invitedUserId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })

    } else if (action === "delete") {
      if (!user_id) throw new Error("ID do usuario a ser excluido nao informado.")
      if (user_id === user.id) throw new Error("Voce nao pode excluir a si mesmo.")

      // Verify if the target user is actually a member of this organization
      const { data: targetMembership, error: targetError } = await supabaseClient
        .from("organization_members")
        .select("id, role")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .maybeSingle()

      if (targetError) throw targetError
      if (!targetMembership) throw new Error("O usuario informado nao pertence a esta organizacao.")
      if (targetMembership.role === "owner") throw new Error("Nao e possivel excluir o proprietario da organizacao.")

      // Delete the user from Supabase Auth (cascades to profiles and organization_members)
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user_id)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({
        success: true,
        message: "Membro de equipe excluido com sucesso do sistema.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })

    } else {
      throw new Error("Acao invalida.")
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
