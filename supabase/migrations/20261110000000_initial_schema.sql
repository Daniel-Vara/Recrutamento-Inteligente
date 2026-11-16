-- ==============================================================================
-- APPLIETY MVP — SCHEMA INICIAL POSTGRESQL (SUPABASE)
-- Migration: 20261110000000_initial_schema.sql
-- ==============================================================================

-- Habilita extensão de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Perfis vinculados a auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('candidato', 'empresa')),
    city TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 2. CANDIDATE_PROFILES (Perfil estendido do candidato)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_summary TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_candidate_profiles_updated_at
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. COMPANIES (Organizações cadastradas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    city TEXT NOT NULL,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. SKILLS (Catálogo padronizado de competências)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CANDIDATE_SKILLS (Competências do candidato com nível de domínio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('iniciante', 'basico', 'intermediario', 'avancado', 'especialista')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_candidate_skill UNIQUE (candidate_id, skill_id)
);

CREATE TRIGGER update_candidate_skills_updated_at
BEFORE UPDATE ON public.candidate_skills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. RESUMES (Metadados dos currículos em PDF armazenados no Supabase Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL UNIQUE REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- máx 5MB
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_resumes_updated_at
BEFORE UPDATE ON public.resumes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. JOBS (Vagas publicadas ou rascunhos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT NOT NULL,
    work_mode TEXT NOT NULL CHECK (work_mode IN ('presencial', 'hibrido', 'remoto')),
    employment_type TEXT NOT NULL CHECK (employment_type IN ('clt', 'pj', 'estagio', 'temporario', 'freelancer')),
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicada', 'encerrada', 'arquivada')),
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_expires ON public.jobs(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_area ON public.jobs(area);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON public.jobs(city);

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. JOB_REQUIREMENTS (Critérios e requisitos de matching da vaga)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('obrigatorio', 'desejavel')),
    minimum_level TEXT NOT NULL CHECK (minimum_level IN ('iniciante', 'basico', 'intermediario', 'avancado', 'especialista')),
    weight INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_job_skill_requirement UNIQUE (job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_requirements_job_id ON public.job_requirements(job_id);

-- ------------------------------------------------------------------------------
-- 9. APPLICATIONS (Candidaturas submetidas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'aprovada', 'rejeitada', 'retirada')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint para impedir múltiplas candidaturas ativas para a mesma vaga
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_application 
ON public.applications (job_id, candidate_id) 
WHERE status != 'retirada';

CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 10. APPLICATION_HISTORY (Registro de auditoria de alterações de status)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_history_app_id ON public.application_history(application_id);

-- ------------------------------------------------------------------------------
-- 11. TRIGGER PARA HISTÓRICO AUTOMÁTICO DE CANDIDATURAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by UUID;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        v_changed_by := auth.uid();
        -- Fallback seguro para auditoria caso executado em contexto de serviço
        IF v_changed_by IS NULL THEN
            SELECT user_id INTO v_changed_by FROM public.candidate_profiles WHERE id = NEW.candidate_id;
        END IF;

        INSERT INTO public.application_history (
            application_id,
            previous_status,
            new_status,
            changed_by,
            created_at
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(v_changed_by, NEW.candidate_id),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_record_application_status_change
AFTER UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION record_application_status_change();

-- ------------------------------------------------------------------------------
-- 12. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL (auth.users -> profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_full_name TEXT;
    user_city TEXT;
    user_phone TEXT;
    company_name TEXT;
    company_city TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'candidato');
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
    user_city := NEW.raw_user_meta_data->>'city';
    user_phone := NEW.raw_user_meta_data->>'phone';
    company_name := NEW.raw_user_meta_data->>'company_name';
    company_city := COALESCE(NEW.raw_user_meta_data->>'company_city', user_city, 'São Paulo');

    -- Insere perfil base
    INSERT INTO public.profiles (id, full_name, email, role, city, phone)
    VALUES (NEW.id, user_full_name, NEW.email, user_role, user_city, user_phone)
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        city = COALESCE(EXCLUDED.city, public.profiles.city),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

    -- Se for candidato, inicializa candidate_profiles
    IF user_role = 'candidato' THEN
        INSERT INTO public.candidate_profiles (user_id, is_visible)
        VALUES (NEW.id, true)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Se for empresa, inicializa companies
    IF user_role = 'empresa' THEN
        INSERT INTO public.companies (owner_id, name, city)
        VALUES (NEW.id, COALESCE(company_name, user_full_name), company_city)
        ON CONFLICT (owner_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
