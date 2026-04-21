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
    const { user_id } = await req.json()
    if (!user_id) throw new Error('No user_id provided')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get tokens from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('google_access_token, google_refresh_token')
      .eq('user_id', user_id)
      .single()

    if (profileError || !profile?.google_access_token) {
      throw new Error('Google connection not found or tokens missing')
    }

    // 2. Fetch events from Google Calendar (last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString()
    
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${thirtyDaysAgo}&maxResults=100`,
      {
        headers: { 'Authorization': `Bearer ${profile.google_access_token}` }
      }
    )

    if (!calendarResponse.ok) {
      const errorData = await calendarResponse.json()
      console.error('Google API Error:', errorData)
      throw new Error(`Google API returned ${calendarResponse.status}: ${errorData.error?.message || 'Unknown error'}`)
    }

    const calendarData = await calendarResponse.json()
    const events = calendarData.items || []

    // 3. Extract unique attendees (excluding the user themselves)
    const attendeesMap = new Map()
    events.forEach((event: any) => {
      if (event.attendees) {
        event.attendees.forEach((attendee: any) => {
          if (attendee.email && !attendee.self) {
            attendeesMap.set(attendee.email, {
              name: attendee.displayName || attendee.email.split('@')[0],
              email: attendee.email
            })
          }
        })
      }
    })

    const newStudentsCount = 0
    const syncedStudents = Array.from(attendeesMap.values())

    // 4. Upsert students into database
    for (const studentData of syncedStudents) {
      // Check if student already exists
      const { data: existing } = await supabaseClient
        .from('students')
        .select('id')
        .eq('user_id', user_id)
        .eq('email', studentData.email)
        .maybeSingle()

      if (!existing) {
        await supabaseClient.from('students').insert({
          user_id: user_id,
          name: studentData.name,
          email: studentData.email,
          phone: '', // Google Calendar might not have phone
          level: 'iniciante',
          active: true,
          join_date: new Date().toISOString().split('T')[0]
        })
      }
    }

    return new Response(JSON.stringify({ success: true, count: syncedStudents.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Sync Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
