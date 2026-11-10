-- ==============================================================================
-- APPLIETY MVP — SISTEMA DETERMINÍSTICO DE COMPATIBILIDADE (MATCHING ENGINE)
-- Migration: 20261110000002_compatibility_engine.sql
-- ==============================================================================

-- 1. Converte nível textual em valor numérico para comparação
CREATE OR REPLACE FUNCTION public.level_to_int(p_level TEXT)
RETURNS INT IMMUTABLE AS $$
BEGIN
    RETURN CASE LOWER(p_level)
        WHEN 'iniciante' THEN 1
        WHEN 'basico' THEN 2
        WHEN 'intermediario' THEN 3
        WHEN 'avancado' THEN 4
        WHEN 'especialista' THEN 5
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. FUNÇÃO: calculate_compatibility
-- Retorna JSON com score, se é compatível, requisitos atendidos e faltantes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_compatibility(
    p_candidate_id UUID,
    p_job_id UUID
)
RETURNS JSONB STABLE AS $$
DECLARE
    v_total_weight NUMERIC := 0;
    v_met_weight NUMERIC := 0;
    v_has_mandatory_fail BOOLEAN := false;
    v_total_requirements INT := 0;
    v_score NUMERIC := NULL;
    v_is_compatible BOOLEAN := false;
    v_rec RECORD;
BEGIN
    -- Itera sobre todos os requisitos da vaga
    FOR v_rec IN (
        SELECT 
            jr.id AS requirement_id,
            jr.skill_id,
            s.name AS skill_name,
            jr.requirement_type,
            jr.minimum_level,
            jr.weight,
            cs.proficiency_level AS candidate_level,
            (cs.id IS NOT NULL AND public.level_to_int(cs.proficiency_level) >= public.level_to_int(jr.minimum_level)) AS is_met
        FROM public.job_requirements jr
        JOIN public.skills s ON s.id = jr.skill_id
        LEFT JOIN public.candidate_skills cs 
            ON cs.skill_id = jr.skill_id AND cs.candidate_id = p_candidate_id
        WHERE jr.job_id = p_job_id
    ) LOOP
        v_total_requirements := v_total_requirements + 1;
        v_total_weight := v_total_weight + v_rec.weight;

        IF v_rec.is_met THEN
            v_met_weight := v_met_weight + v_rec.weight;
        ELSE
            IF v_rec.requirement_type = 'obrigatorio' THEN
                v_has_mandatory_fail := true;
            END IF;
        END IF;
    END LOOP;

    -- Vagas sem requisitos possuem compatibilidade indefinida
    IF v_total_requirements = 0 OR v_total_weight = 0 THEN
        RETURN jsonb_build_object(
            'score', NULL,
            'is_compatible', true,
            'has_mandatory_fail', false,
            'total_requirements', 0,
            'met_weight', 0,
            'total_weight', 0,
            'reason', 'Vaga sem requisitos definidos'
        );
    END IF;

    -- Se falhou em requisito obrigatório, score é 0 e não compatível
    IF v_has_mandatory_fail THEN
        v_score := 0;
        v_is_compatible := false;
    ELSE
        v_score := ROUND((v_met_weight / v_total_weight) * 100, 1);
        v_is_compatible := true;
    END IF;

    RETURN jsonb_build_object(
        'score', v_score,
        'is_compatible', v_is_compatible,
        'has_mandatory_fail', v_has_mandatory_fail,
        'total_requirements', v_total_requirements,
        'met_weight', v_met_weight,
        'total_weight', v_total_weight
    );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_candidate_matching_jobs
-- Retorna vagas ordenadas por compatibilidade para o candidato autenticado
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_candidate_matching_jobs(p_candidate_id UUID)
RETURNS TABLE (
    job_id UUID,
    job_title TEXT,
    company_id UUID,
    company_name TEXT,
    city TEXT,
    work_mode TEXT,
    employment_type TEXT,
    published_at TIMESTAMPTZ,
    score NUMERIC,
    is_compatible BOOLEAN,
    has_mandatory_fail BOOLEAN,
    total_requirements INT,
    applied BOOLEAN
) STABLE AS $$
BEGIN
    RETURN QUERY
    WITH calculated_jobs AS (
        SELECT 
            j.id AS c_job_id,
            j.title AS c_title,
            c.id AS c_company_id,
            c.name AS c_company_name,
            j.city AS c_city,
            j.work_mode AS c_work_mode,
            j.employment_type AS c_employment_type,
            j.published_at AS c_published_at,
            (public.calculate_compatibility(p_candidate_id, j.id)->>'score')::NUMERIC AS c_score,
            (public.calculate_compatibility(p_candidate_id, j.id)->>'is_compatible')::BOOLEAN AS c_is_compatible,
            (public.calculate_compatibility(p_candidate_id, j.id)->>'has_mandatory_fail')::BOOLEAN AS c_has_mandatory_fail,
            (public.calculate_compatibility(p_candidate_id, j.id)->>'total_requirements')::INT AS c_total_req,
            EXISTS(
                SELECT 1 FROM public.applications app 
                WHERE app.job_id = j.id 
                  AND app.candidate_id = p_candidate_id 
                  AND app.status != 'retirada'
            ) AS c_applied
        FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
        WHERE j.status = 'publicada'
          AND (j.expires_at IS NULL OR j.expires_at >= NOW())
    )
    SELECT 
        c_job_id,
        c_title,
        c_company_id,
        c_company_name,
        c_city,
        c_work_mode,
        c_employment_type,
        c_published_at,
        c_score,
        c_is_compatible,
        c_has_mandatory_fail,
        c_total_req,
        c_applied
    FROM calculated_jobs
    ORDER BY 
        c_is_compatible DESC,
        c_score DESC NULLS LAST,
        c_published_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. RPC: get_job_candidate_ranking
-- Retorna candidatos classificados por compatibilidade para uma vaga da empresa
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_job_candidate_ranking(p_job_id UUID)
RETURNS TABLE (
    candidate_id UUID,
    candidate_user_id UUID,
    full_name TEXT,
    email TEXT,
    city TEXT,
    professional_summary TEXT,
    score NUMERIC,
    is_compatible BOOLEAN,
    has_mandatory_fail BOOLEAN,
    application_id UUID,
    application_status TEXT,
    applied_at TIMESTAMPTZ,
    resume_storage_path TEXT,
    resume_filename TEXT
) STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id AS candidate_id,
        cp.user_id AS candidate_user_id,
        p.full_name,
        p.email,
        p.city,
        cp.professional_summary,
        (public.calculate_compatibility(cp.id, p_job_id)->>'score')::NUMERIC AS score,
        (public.calculate_compatibility(cp.id, p_job_id)->>'is_compatible')::BOOLEAN AS is_compatible,
        (public.calculate_compatibility(cp.id, p_job_id)->>'has_mandatory_fail')::BOOLEAN AS has_mandatory_fail,
        app.id AS application_id,
        app.status AS application_status,
        app.applied_at,
        r.storage_path AS resume_storage_path,
        r.original_filename AS resume_filename
    FROM public.applications app
    JOIN public.candidate_profiles cp ON cp.id = app.candidate_id
    JOIN public.profiles p ON p.id = cp.user_id
    LEFT JOIN public.resumes r ON r.candidate_id = cp.id
    WHERE app.job_id = p_job_id
      AND app.status != 'retirada'
    ORDER BY 
        is_compatible DESC,
        score DESC NULLS LAST,
        app.applied_at ASC;
END;
$$ LANGUAGE plpgsql;
