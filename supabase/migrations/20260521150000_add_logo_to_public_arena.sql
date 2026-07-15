-- Migration: Add logo_url support to public arena data query
-- Date: 2026-05-21

CREATE OR REPLACE FUNCTION public.get_public_arena_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_arena_name TEXT;
    v_logo_url TEXT;
    v_niche_settings JSONB;
    v_courts JSON;
    v_reservations JSON;
    v_result JSON;
BEGIN
    -- Get arena details including settings
    SELECT 
        niche_settings,
        ct_name,
        logo_url
    INTO 
        v_niche_settings,
        v_arena_name,
        v_logo_url
    FROM public.profiles 
    WHERE user_id = p_user_id;

    -- Extract from niche settings for 'arena' if available
    IF v_niche_settings IS NOT NULL AND v_niche_settings ? 'arena' THEN
        IF (v_niche_settings->'arena'->>'ct_name') IS NOT NULL THEN
            v_arena_name := v_niche_settings->'arena'->>'ct_name';
        END IF;
        IF (v_niche_settings->'arena'->>'logo_url') IS NOT NULL THEN
            v_logo_url := v_niche_settings->'arena'->>'logo_url';
        END IF;
    END IF;

    -- Final fallbacks
    v_arena_name := COALESCE(v_arena_name, 'Esportiz Arena');

    -- Query courts belonging to this user (modalities with business_type = 'arena')
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'name', name,
        'color', color,
        'metadata', metadata
    )), '[]'::JSON) INTO v_courts
    FROM public.modalities
    WHERE user_id = p_user_id AND business_type = 'arena';

    -- Query active reservations (trainings) to block busy slots on public front
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'date', date,
        'time', time,
        'courtId', modality_id,
        'durationMinutes', duration_minutes,
        'status', COALESCE((metadata::jsonb->>'status'), 'confirmed')
    )), '[]'::JSON) INTO v_reservations
    FROM public.trainings
    WHERE user_id = p_user_id AND business_type = 'arena' AND date >= CURRENT_DATE - INTERVAL '2 days';

    SELECT JSON_BUILD_OBJECT(
        'arena_name', v_arena_name,
        'logo_url', v_logo_url,
        'courts', v_courts,
        'reservations', v_reservations
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_arena_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_arena_data(UUID) TO anon, authenticated;
