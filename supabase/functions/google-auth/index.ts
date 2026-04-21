import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, user_id } = await req.json()

    if (!code) throw new Error('No code provided')
    if (!user_id) throw new Error('No user_id provided')

    const client_id = Deno.env.get('GOOGLE_CLIENT_ID')
    const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirect_uri = Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:8080/configuracoes'

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

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
