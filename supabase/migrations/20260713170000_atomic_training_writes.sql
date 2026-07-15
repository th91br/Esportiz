-- Atomic training writes keep the schedule and its student assignments consistent.
-- Both RPCs run as the authenticated caller, so existing table grants and RLS remain authoritative.

CREATE OR REPLACE FUNCTION public.create_training_with_students_atomic(
    p_business_type TEXT,
    p_date DATE,
    p_time TEXT,
    p_location TEXT,
    p_notes TEXT,
    p_modality_id UUID,
    p_duration_minutes INTEGER,
    p_cancelled BOOLEAN,
    p_cancellation_reason TEXT,
    p_cancellation_notes TEXT,
    p_organization_id UUID,
    p_student_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $atomic_training_create$
DECLARE
    v_auth_organization_id UUID;
    v_owner_user_id UUID;
    v_training_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    v_auth_organization_id := public.get_auth_organization_id();

    IF p_organization_id IS DISTINCT FROM v_auth_organization_id THEN
        RAISE EXCEPTION 'Organizacao invalida para o usuario autenticado.';
    END IF;

    IF p_organization_id IS NOT NULL THEN
        IF NOT public.has_organization_role(
            p_organization_id,
            ARRAY['owner', 'manager', 'receptionist', 'instructor']
        ) THEN
            RAISE EXCEPTION 'Usuario nao autorizado a criar treinos nesta organizacao.';
        END IF;

        SELECT o.owner_user_id
        INTO v_owner_user_id
        FROM public.organizations o
        WHERE o.id = p_organization_id
          AND o.status = 'active';

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Organizacao ativa nao encontrada.';
        END IF;
    ELSE
        v_owner_user_id := auth.uid();
    END IF;

    IF p_business_type IS NULL OR p_business_type NOT IN ('sport_school', 'arena', 'other') THEN
        RAISE EXCEPTION 'Tipo de negocio invalido.';
    END IF;

    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data do treino obrigatoria.';
    END IF;

    IF p_time IS NULL OR p_time !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        RAISE EXCEPTION 'Horario do treino invalido.';
    END IF;

    IF p_location IS NULL OR btrim(p_location) = '' THEN
        RAISE EXCEPTION 'Local do treino obrigatorio.';
    END IF;

    IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 1440 THEN
        RAISE EXCEPTION 'Duracao do treino invalida.';
    END IF;

    IF p_cancelled IS NULL THEN
        RAISE EXCEPTION 'Estado de cancelamento invalido.';
    END IF;

    IF p_cancellation_reason IS NOT NULL
       AND p_cancellation_reason NOT IN ('holiday', 'weather', 'coach_absence', 'other') THEN
        RAISE EXCEPTION 'Motivo de cancelamento invalido.';
    END IF;

    IF cardinality(COALESCE(p_student_ids, ARRAY[]::UUID[])) > 1000 THEN
        RAISE EXCEPTION 'Quantidade de alunos excede o limite por treino.';
    END IF;

    IF array_position(p_student_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'Lista de alunos invalida.';
    END IF;

    IF p_modality_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.modalities m
        WHERE m.id = p_modality_id
          AND m.user_id = v_owner_user_id
          AND m.business_type = p_business_type
          AND (p_organization_id IS NULL OR m.organization_id = p_organization_id)
    ) THEN
        RAISE EXCEPTION 'Modalidade nao encontrada nesta organizacao.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT DISTINCT student_id
            FROM unnest(COALESCE(p_student_ids, ARRAY[]::UUID[])) AS requested_students(student_id)
        ) requested
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.students s
            WHERE s.id = requested.student_id
              AND s.user_id = v_owner_user_id
              AND s.business_type = p_business_type
              AND (p_organization_id IS NULL OR s.organization_id = p_organization_id)
        )
    ) THEN
        RAISE EXCEPTION 'Um ou mais alunos nao pertencem a esta organizacao.';
    END IF;

    INSERT INTO public.trainings (
        user_id,
        organization_id,
        business_type,
        date,
        time,
        location,
        notes,
        modality_id,
        duration_minutes,
        cancelled,
        cancellation_reason,
        cancellation_notes
    ) VALUES (
        v_owner_user_id,
        p_organization_id,
        p_business_type,
        p_date,
        p_time,
        p_location,
        p_notes,
        p_modality_id,
        p_duration_minutes,
        p_cancelled,
        CASE WHEN p_cancelled THEN p_cancellation_reason ELSE NULL END,
        CASE WHEN p_cancelled THEN p_cancellation_notes ELSE NULL END
    )
    RETURNING id INTO v_training_id;

    INSERT INTO public.training_students (
        training_id,
        student_id,
        user_id,
        organization_id
    )
    SELECT
        v_training_id,
        requested.student_id,
        v_owner_user_id,
        p_organization_id
    FROM (
        SELECT DISTINCT student_id
        FROM unnest(COALESCE(p_student_ids, ARRAY[]::UUID[])) AS requested_students(student_id)
    ) requested;

    RETURN v_training_id;
END;
$atomic_training_create$;

CREATE OR REPLACE FUNCTION public.update_training_with_students_atomic(
    p_training_id UUID,
    p_updates JSONB,
    p_student_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $atomic_training_update$
DECLARE
    v_training public.trainings%ROWTYPE;
    v_updates JSONB := COALESCE(p_updates, '{}'::JSONB);
    v_modality_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_training_id IS NULL THEN
        RAISE EXCEPTION 'Treino invalido.';
    END IF;

    IF jsonb_typeof(v_updates) <> 'object' THEN
        RAISE EXCEPTION 'Atualizacoes do treino invalidas.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(v_updates) AS update_keys(key)
        WHERE update_keys.key <> ALL (ARRAY[
            'date',
            'time',
            'location',
            'notes',
            'modality_id',
            'duration_minutes',
            'cancelled',
            'cancellation_reason',
            'cancellation_notes'
        ]::TEXT[])
    ) THEN
        RAISE EXCEPTION 'Campo de atualizacao do treino nao permitido.';
    END IF;

    SELECT *
    INTO v_training
    FROM public.trainings
    WHERE id = p_training_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Treino nao encontrado ou acesso negado.';
    END IF;

    IF v_training.organization_id IS NOT NULL THEN
        IF NOT public.has_organization_role(
            v_training.organization_id,
            ARRAY['owner', 'manager', 'receptionist', 'instructor']
        ) THEN
            RAISE EXCEPTION 'Usuario nao autorizado a atualizar este treino.';
        END IF;
    ELSIF v_training.user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Usuario nao autorizado a atualizar este treino.';
    END IF;

    IF v_updates ? 'date'
       AND (jsonb_typeof(v_updates -> 'date') <> 'string' OR v_updates ->> 'date' IS NULL) THEN
        RAISE EXCEPTION 'Data do treino invalida.';
    END IF;

    IF v_updates ? 'time'
       AND (
           jsonb_typeof(v_updates -> 'time') <> 'string'
           OR (v_updates ->> 'time') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
       ) THEN
        RAISE EXCEPTION 'Horario do treino invalido.';
    END IF;

    IF v_updates ? 'location'
       AND (
           jsonb_typeof(v_updates -> 'location') <> 'string'
           OR btrim(v_updates ->> 'location') = ''
       ) THEN
        RAISE EXCEPTION 'Local do treino invalido.';
    END IF;

    IF v_updates ? 'notes'
       AND jsonb_typeof(v_updates -> 'notes') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION 'Observacoes do treino invalidas.';
    END IF;

    IF v_updates ? 'duration_minutes'
       AND (
           jsonb_typeof(v_updates -> 'duration_minutes') <> 'number'
           OR (v_updates ->> 'duration_minutes')::INTEGER < 1
           OR (v_updates ->> 'duration_minutes')::INTEGER > 1440
       ) THEN
        RAISE EXCEPTION 'Duracao do treino invalida.';
    END IF;

    IF v_updates ? 'cancelled'
       AND jsonb_typeof(v_updates -> 'cancelled') <> 'boolean' THEN
        RAISE EXCEPTION 'Estado de cancelamento invalido.';
    END IF;

    IF v_updates ? 'cancellation_reason'
       AND (
           jsonb_typeof(v_updates -> 'cancellation_reason') NOT IN ('string', 'null')
           OR COALESCE(v_updates ->> 'cancellation_reason', '') NOT IN (
               '', 'holiday', 'weather', 'coach_absence', 'other'
           )
       ) THEN
        RAISE EXCEPTION 'Motivo de cancelamento invalido.';
    END IF;

    IF v_updates ? 'cancellation_notes'
       AND jsonb_typeof(v_updates -> 'cancellation_notes') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION 'Observacoes de cancelamento invalidas.';
    END IF;

    IF v_updates ? 'modality_id'
       AND jsonb_typeof(v_updates -> 'modality_id') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION 'Modalidade invalida.';
    END IF;

    v_modality_id := CASE
        WHEN v_updates ? 'modality_id' THEN (v_updates ->> 'modality_id')::UUID
        ELSE v_training.modality_id
    END;

    IF v_updates ? 'modality_id'
       AND v_modality_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.modalities m
           WHERE m.id = v_modality_id
             AND m.user_id = v_training.user_id
             AND m.business_type = v_training.business_type
             AND (
                 v_training.organization_id IS NULL
                 OR m.organization_id = v_training.organization_id
             )
       ) THEN
        RAISE EXCEPTION 'Modalidade nao encontrada nesta organizacao.';
    END IF;

    IF p_student_ids IS NOT NULL THEN
        IF cardinality(p_student_ids) > 1000 THEN
            RAISE EXCEPTION 'Quantidade de alunos excede o limite por treino.';
        END IF;

        IF array_position(p_student_ids, NULL) IS NOT NULL THEN
            RAISE EXCEPTION 'Lista de alunos invalida.';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM (
                SELECT DISTINCT student_id
                FROM unnest(p_student_ids) AS requested_students(student_id)
            ) requested
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.students s
                WHERE s.id = requested.student_id
                  AND s.user_id = v_training.user_id
                  AND s.business_type = v_training.business_type
                  AND (
                      v_training.organization_id IS NULL
                      OR s.organization_id = v_training.organization_id
                  )
            )
        ) THEN
            RAISE EXCEPTION 'Um ou mais alunos nao pertencem a esta organizacao.';
        END IF;
    END IF;

    IF v_updates <> '{}'::JSONB THEN
        UPDATE public.trainings
        SET
            date = CASE
                WHEN v_updates ? 'date' THEN (v_updates ->> 'date')::DATE
                ELSE date
            END,
            time = CASE
                WHEN v_updates ? 'time' THEN v_updates ->> 'time'
                ELSE time
            END,
            location = CASE
                WHEN v_updates ? 'location' THEN v_updates ->> 'location'
                ELSE location
            END,
            notes = CASE
                WHEN v_updates ? 'notes' THEN v_updates ->> 'notes'
                ELSE notes
            END,
            modality_id = v_modality_id,
            duration_minutes = CASE
                WHEN v_updates ? 'duration_minutes' THEN (v_updates ->> 'duration_minutes')::INTEGER
                ELSE duration_minutes
            END,
            cancelled = CASE
                WHEN v_updates ? 'cancelled' THEN (v_updates ->> 'cancelled')::BOOLEAN
                ELSE cancelled
            END,
            cancellation_reason = CASE
                WHEN v_updates ? 'cancellation_reason' THEN NULLIF(v_updates ->> 'cancellation_reason', '')
                WHEN v_updates ? 'cancelled' AND NOT (v_updates ->> 'cancelled')::BOOLEAN THEN NULL
                ELSE cancellation_reason
            END,
            cancellation_notes = CASE
                WHEN v_updates ? 'cancellation_notes' THEN v_updates ->> 'cancellation_notes'
                WHEN v_updates ? 'cancelled' AND NOT (v_updates ->> 'cancelled')::BOOLEAN THEN NULL
                ELSE cancellation_notes
            END
        WHERE id = p_training_id;
    END IF;

    IF p_student_ids IS NOT NULL THEN
        DELETE FROM public.training_students
        WHERE training_id = p_training_id;

        INSERT INTO public.training_students (
            training_id,
            student_id,
            user_id,
            organization_id
        )
        SELECT
            p_training_id,
            requested.student_id,
            v_training.user_id,
            v_training.organization_id
        FROM (
            SELECT DISTINCT student_id
            FROM unnest(p_student_ids) AS requested_students(student_id)
        ) requested;
    END IF;

    RETURN p_training_id;
END;
$atomic_training_update$;

REVOKE ALL ON FUNCTION public.create_training_with_students_atomic(
    TEXT, DATE, TEXT, TEXT, TEXT, UUID, INTEGER, BOOLEAN, TEXT, TEXT, UUID, UUID[]
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_training_with_students_atomic(UUID, JSONB, UUID[])
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_training_with_students_atomic(
    TEXT, DATE, TEXT, TEXT, TEXT, UUID, INTEGER, BOOLEAN, TEXT, TEXT, UUID, UUID[]
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_training_with_students_atomic(UUID, JSONB, UUID[])
TO authenticated;

NOTIFY pgrst, 'reload schema';
