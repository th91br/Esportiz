import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getAllowedRedirectUris() {
  return new Set([
    Deno.env.get('GOOGLE_REDIRECT_URI') ?? '',
    'https://www.esportiz.com.br/configuracoes',
    'https://esportiz.com.br/configuracoes',
    'http://localhost:8080/configuracoes',
    'http://localhost:5173/configuracoes',
    'http://127.0.0.1:5173/configuracoes',
  ].filter(Boolean))
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, user_id, redirect_uri: requestedRedirectUri } = await req.json()
    if (!code) throw new Error('No code provided')
    if (!user_id) throw new Error('No user_id provided')

    // Initialize Supabase Client with service role for admin tasks
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error('Invalid token')
    if (user.id !== user_id) throw new Error('Unauthorized: user_id mismatch')

    const client_id = Deno.env.get('GOOGLE_CLIENT_ID')
    const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirect_uri = typeof requestedRedirectUri === 'string' && requestedRedirectUri.length > 0
      ? requestedRedirectUri
      : Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:8080/configuracoes'

    if (!client_id || !client_secret) {
      throw new Error('Google configuration missing')
    }

    if (!getAllowedRedirectUris().has(redirect_uri)) {
      throw new Error('Redirect URI nao autorizada')
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: client_id!,
        client_secret: client_secret!,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      console.error('Google Token Error:', tokens)
      throw new Error(tokens.error_description || tokens.error)
    }

    // Update profile with tokens
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
