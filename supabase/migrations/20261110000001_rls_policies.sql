-- ==============================================================================
-- APPLIETY MVP — POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- Migration: 20261110000001_rls_policies.sql
-- ==============================================================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- FUNÇÃO AUXILIAR: Protege alteração de role no profiles
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Não é permitido alterar o papel do usuário.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_change();

-- ------------------------------------------------------------------------------
-- 2. POLÍTICAS: PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Perfis são visíveis para usuários autenticados"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuário pode atualizar apenas seu próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS: CANDIDATE_PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Candidato pode visualizar e gerenciar seu perfil"
ON public.candidate_profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Empresas podem consultar perfis visíveis ou candidatos inscritos"
ON public.candidate_profiles FOR SELECT
TO authenticated
USING (
    is_visible = true
    OR id IN (
        SELECT app.candidate_id 
        FROM public.applications app
        JOIN public.jobs j ON j.id = app.job_id
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS: COMPANIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Empresas são públicas para consulta de vagas"
ON public.companies FOR SELECT
TO public
USING (true);

CREATE POLICY "Proprietário pode gerenciar sua própria empresa"
ON public.companies FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS: SKILLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Skills são visíveis para todos"
ON public.skills FOR SELECT
TO public
USING (true);

CREATE POLICY "Usuários autenticados podem cadastrar novas skills"
ON public.skills FOR INSERT
TO authenticated
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS: CANDIDATE_SKILLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Candidato gerencia suas próprias competências"
ON public.candidate_skills FOR ALL
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Competências de candidatos visíveis são consultáveis"
ON public.candidate_skills FOR SELECT
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE is_visible = true
    )
    OR candidate_id IN (
        SELECT app.candidate_id 
        FROM public.applications app
        JOIN public.jobs j ON j.id = app.job_id
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS: RESUMES
-- ------------------------------------------------------------------------------
CREATE POLICY "Candidato gerencia seu próprio currículo"
ON public.resumes FOR ALL
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Empresa pode consultar currículo apenas de candidatos inscritos em suas vagas"
ON public.resumes FOR SELECT
TO authenticated
USING (
    candidate_id IN (
        SELECT app.candidate_id 
        FROM public.applications app
        JOIN public.jobs j ON j.id = app.job_id
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS: JOBS
-- ------------------------------------------------------------------------------
CREATE POLICY "Vagas publicadas e válidas são públicas"
ON public.jobs FOR SELECT
TO public
USING (
    status = 'publicada' 
    AND (expires_at IS NULL OR expires_at >= NOW())
);

CREATE POLICY "Empresa pode visualizar todas as suas vagas em qualquer status"
ON public.jobs FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "Empresa pode criar, editar e excluir suas próprias vagas"
ON public.jobs FOR ALL
TO authenticated
USING (
    company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    company_id IN (
        SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 9. POLÍTICAS: JOB_REQUIREMENTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Requisitos de vagas publicadas são públicos"
ON public.job_requirements FOR SELECT
TO public
USING (
    job_id IN (
        SELECT id FROM public.jobs 
        WHERE status = 'publicada' AND (expires_at IS NULL OR expires_at >= NOW())
    )
);

CREATE POLICY "Empresa pode gerenciar requisitos de suas vagas"
ON public.job_requirements FOR ALL
TO authenticated
USING (
    job_id IN (
        SELECT j.id FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
)
WITH CHECK (
    job_id IN (
        SELECT j.id FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 10. POLÍTICAS: APPLICATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Candidato pode visualizar suas próprias candidaturas"
ON public.applications FOR SELECT
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Empresa pode visualizar candidaturas recebidas em suas vagas"
ON public.applications FOR SELECT
TO authenticated
USING (
    job_id IN (
        SELECT j.id FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
);

CREATE POLICY "Candidato pode enviar candidatura em vaga publicada e válida"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
    AND job_id IN (
        SELECT id FROM public.jobs 
        WHERE status = 'publicada' AND (expires_at IS NULL OR expires_at >= NOW())
    )
);

CREATE POLICY "Candidato pode retirar sua candidatura"
ON public.applications FOR UPDATE
TO authenticated
USING (
    candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    status = 'retirada'
);

CREATE POLICY "Empresa pode atualizar status das candidaturas de suas vagas"
ON public.applications FOR UPDATE
TO authenticated
USING (
    job_id IN (
        SELECT j.id FROM public.jobs j
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
)
WITH CHECK (
    status IN ('pendente', 'em_analise', 'aprovada', 'rejeitada')
);

-- ------------------------------------------------------------------------------
-- 11. POLÍTICAS: APPLICATION_HISTORY
-- ------------------------------------------------------------------------------
CREATE POLICY "Candidatos e empresas podem consultar histórico de suas candidaturas"
ON public.application_history FOR SELECT
TO authenticated
USING (
    application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.candidate_profiles cp ON cp.id = a.candidate_id
        WHERE cp.user_id = auth.uid()
    )
    OR application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        JOIN public.companies c ON c.id = j.company_id
        WHERE c.owner_id = auth.uid()
    )
);
