-- ==============================================================================
-- APPLIETY MVP — CONFIGURAÇÃO DO SUPABASE STORAGE (BUCKET PRIVADO RESUMES)
-- Migration: 20261110000003_storage_setup.sql
-- ==============================================================================

-- 1. Criação do bucket privado para currículos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,
    5242880, -- 5 MB
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf']::text[];

-- ------------------------------------------------------------------------------
-- 2. POLÍTICAS DE ACESSO AO STORAGE (storage.objects)
-- O caminho do arquivo segue a convenção: {candidate_id}/{filename}.pdf
-- ou {user_id}/{filename}.pdf
-- ------------------------------------------------------------------------------

-- Candidato pode fazer upload do seu próprio currículo
CREATE POLICY "Candidato pode enviar seu currículo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resumes'
    AND (
        -- Permite quando o primeiro segmento do path é o user_id do auth
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.candidate_profiles WHERE user_id = auth.uid()
        )
    )
);

-- Candidato pode atualizar / substituir seu próprio currículo
CREATE POLICY "Candidato pode atualizar seu currículo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'resumes'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.candidate_profiles WHERE user_id = auth.uid()
        )
    )
);

-- Candidato pode deletar seu próprio currículo
CREATE POLICY "Candidato pode deletar seu currículo"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'resumes'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.candidate_profiles WHERE user_id = auth.uid()
        )
    )
);

-- Leitura de currículo:
-- 1. Candidato pode ler o seu próprio
-- 2. Empresa pode ler APENAS se o candidato estiver inscrito em uma vaga dela
CREATE POLICY "Acesso autenticado e autorizado ao currículo"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes'
    AND (
        -- Próprio candidato
        (storage.foldername(name))[1] = auth.uid()::text
        OR (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.candidate_profiles WHERE user_id = auth.uid()
        )
        -- Empresa com candidatura ativa do candidato
        OR EXISTS (
            SELECT 1 
            FROM public.resumes r
            JOIN public.applications app ON app.candidate_id = r.candidate_id
            JOIN public.jobs j ON j.id = app.job_id
            JOIN public.companies c ON c.id = j.company_id
            WHERE r.storage_path = storage.objects.name
              AND c.owner_id = auth.uid()
              AND app.status != 'retirada'
        )
    )
);
