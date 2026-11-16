# PLANO DE MIGRAÇÃO DE BACKEND — APPLIETY
## Migração da Arquitetura: Supabase Auth/Client → Django REST Framework + Supabase PostgreSQL

---

## 1. Auditoria do Projeto Existente

### 1.1. Estrutura de Arquivos e Frontend
O frontend do Appliety foi desenvolvido utilizando **React 18 + TypeScript + Vite + Tailwind CSS**, seguindo com fidelidade o design oficial do Figma (`ffBT6olP0h2NFqNKDINmAK`).

**Páginas mapeadas e ativas:**
1. **Públicas:**
   - `/` (`src/pages/public/Home.tsx`): Landing page com apresentação da marca, motiff arquitetural e acesso dual (Candidato / Empresa).
   - `/login` (`src/pages/public/Login.tsx`): Tela de autenticação baseada no frame *Appliety — Light architectural*, com seleção de contas demo.
   - `/cadastro` (`src/pages/public/Cadastro.tsx`): Formulário de registro com chave de alternância entre *Conta Candidato* e *Conta Empresa*.
   - `/vagas` (`src/pages/public/Vagas.tsx`): Busca consolidada de vagas com filtros dinâmicos por título, área, cidade e modalidade.
   - `/vagas/:id` (`src/pages/public/DetalhesVaga.tsx`): Detalhes completos da oportunidade e modal de envio de candidatura.
   - `/recuperar-senha` (`src/pages/public/RecuperarSenha.tsx`): Solicitação de instruções de redefinição de acesso.

2. **Candidato:**
   - `/candidato/dashboard` (`src/pages/candidate/Dashboard.tsx`): Painel com indicadores (total de candidaturas, em análise, aprovadas), candidaturas recentes e vagas recomendadas.
   - `/candidato/perfil` (`src/pages/candidate/Perfil.tsx`): Edição de dados cadastrais, resumo profissional, catálogo de competências com 5 níveis de domínio e chave de visibilidade.
   - `/candidato/curriculo` (`src/pages/candidate/Curriculo.tsx`): Upload de currículo em PDF (máx 5 MB) e download seguro autenticado.
   - `/candidato/candidaturas` (`src/pages/candidate/Candidaturas.tsx`): Listagem de candidaturas com linha do tempo de status e ação de retirada.
   - `/candidato/recomendacoes` (`src/pages/candidate/Recomendacoes.tsx`): Vagas ordenadas por compatibilidade com detalhamento de requisitos atendidos e faltantes.

3. **Empresa:**
   - `/empresa/dashboard` (`src/pages/company/Dashboard.tsx`): Indicadores corporativos (vagas publicadas, rascunhos, candidaturas recebidas).
   - `/empresa/perfil` (`src/pages/company/Perfil.tsx`): Identificação da organização, cidade e website institucional.
   - `/empresa/vagas` (`src/pages/company/Vagas.tsx`): Painel de gestão de vagas com filtros por status e ações de publicação/encerramento.
   - `/empresa/vagas/nova` e `/empresa/vagas/:id` (`src/pages/company/NovaVaga.tsx`): Criação e edição de vagas com cadastro de critérios ponderados (pesos de 1 a 10 e tipos obrigatório/desejável).
   - `/empresa/candidatos` (`src/pages/company/CandidatosMatching.tsx`): Seleção de vaga e ranking de candidatos ordenados por compatibilidade determinística (0 a 100 pontos), com download autorizado de PDF.
   - `/empresa/candidaturas` (`src/pages/company/Candidaturas.tsx`): Tabela unificada para atualização de status (Pendente, Em análise, Aprovada, Rejeitada) com auditoria.

### 1.2. Chamadas ao Supabase no Frontend
Atualmente, as chamadas residem em:
- `src/lib/supabase.ts`: Inicialização do cliente Supabase JS.
- `src/contexts/AuthContext.tsx`: Gestão de sessão, login, registro e perfil atual.
- `src/services/api.ts`: Camada que concentrava queries, mutations e fallback de persistência.

**Ação:** Substituir completamente as chamadas do cliente Supabase por uma camada de serviços HTTP estruturada consumindo a API REST do Django em `/api/v1/`.

---

## 2. Auditoria do Banco de Dados PostgreSQL (Supabase)

O schema relacional definido no banco Supabase possui as seguintes 10 tabelas e constraints:

1. **`profiles`**: `id` UUID PK, `full_name`, `email` UNIQUE, `role` ('candidato' | 'empresa'), `city`, `phone`, `created_at`, `updated_at`.
2. **`candidate_profiles`**: `id` UUID PK, `user_id` FK -> `profiles.id` (1:1), `professional_summary`, `is_visible`, `created_at`, `updated_at`.
3. **`companies`**: `id` UUID PK, `owner_id` FK -> `profiles.id` (1:1), `name`, `description`, `city`, `website`, `created_at`, `updated_at`.
4. **`skills`**: `id` UUID PK, `name` UNIQUE, `normalized_name` UNIQUE, `created_at`.
5. **`candidate_skills`**: `id` UUID PK, `candidate_id` FK -> `candidate_profiles.id`, `skill_id` FK -> `skills.id`, `proficiency_level` ('iniciante'..'especialista'), UNIQUE (`candidate_id`, `skill_id`).
6. **`resumes`**: `id` UUID PK, `candidate_id` FK -> `candidate_profiles.id` (1:1), `storage_path`, `original_filename`, `file_size` (CHECK <= 5MB), `created_at`, `updated_at`.
7. **`jobs`**: `id` UUID PK, `company_id` FK -> `companies.id`, `title`, `description`, `city`, `area`, `work_mode` ('presencial' | 'hibrido' | 'remoto'), `employment_type` ('clt'..'freelancer'), `status` ('rascunho' | 'publicada' | 'encerrada' | 'arquivada'), `published_at`, `expires_at`, `created_at`, `updated_at`.
8. **`job_requirements`**: `id` UUID PK, `job_id` FK -> `jobs.id`, `skill_id` FK -> `skills.id`, `requirement_type` ('obrigatorio' | 'desejavel'), `minimum_level`, `weight` (1..10), UNIQUE (`job_id`, `skill_id`).
9. **`applications`**: `id` UUID PK, `job_id` FK -> `jobs.id`, `candidate_id` FK -> `candidate_profiles.id`, `status` ('pendente'..'retirada'), `applied_at`, `withdrawn_at`, `updated_at`, UNIQUE (`job_id`, `candidate_id`) WHERE status != 'retirada'.
10. **`application_history`**: `id` UUID PK, `application_id` FK -> `applications.id`, `previous_status`, `new_status`, `changed_by` FK -> `profiles.id`, `created_at`.

---

## 3. Arquitetura da Nova Solução (Backend Django + DRF)

```
[ Frontend: React + TypeScript ]
       │
       │ Chamadas HTTP REST (/api/v1/...) com cabeçalho 'Authorization: Bearer <JWT>'
       ▼
[ Backend: Django 6.1 + Django REST Framework + SimpleJWT ]
       ├── accounts: Custom User model, registro, login JWT, me, password reset
       ├── candidates: CandidateProfile, CandidateSkill, Resume (upload PDF restrito a 5MB e download controlado)
       ├── companies: Company model, perfil corporativo, permissões de dono
       ├── jobs: Job, JobRequirement, filtros, busca, status (publicada, rascunho, encerrada)
       ├── applications: Application, ApplicationHistory com trigger/signal de auditoria, bloqueio de duplicidade
       └── recommendations: Engine determinístico de matching (pesos, níveis mínimos, bloqueio por obrigatório)
       │
       │ Conexão direta PostgreSQL (via psycopg)
       ▼
[ Banco de Dados: Supabase PostgreSQL ]
```

---

## 4. Plano de Execução da Migração

### Passo 1 — Estrutura e Configuração do Django
- Inicializar o projeto Django em `backend/core/`.
- Configurar `backend/settings.py` com `python-dotenv`, `psycopg`, `rest_framework`, `rest_framework_simplejwt`, `corsheaders`, `drf_spectacular`.
- Configurar autenticação customizada (`AUTH_USER_MODEL = 'accounts.User'`).
- Conexão configurada para `DATABASE_URL` do Supabase PostgreSQL com suporte a fallback de desenvolvimento e testes.

### Passo 2 — Criação dos Módulos Django
1. **`backend/accounts`**:
   - Model `User` (herda de `AbstractUser`, UUID PK, campos `email`, `role`, `full_name`, `city`, `phone`).
   - Serializers e endpoints JWT:
     - `POST /api/v1/auth/register/`
     - `POST /api/v1/auth/login/` (gera access + refresh token + dados do perfil)
     - `POST /api/v1/auth/refresh/`
     - `GET /api/v1/auth/me/`
     - `POST /api/v1/auth/password-reset/`
2. **`backend/candidates`**:
   - Models: `CandidateProfile`, `Skill`, `CandidateSkill`, `Resume`.
   - Endpoints:
     - `GET /api/v1/candidates/profile/`, `PUT /api/v1/candidates/profile/`
     - `GET /api/v1/candidates/skills/`, `POST /api/v1/candidates/skills/`, `DELETE /api/v1/candidates/skills/<id>/`
     - `POST /api/v1/candidates/resume/` (validação de PDF <= 5MB)
     - `GET /api/v1/candidates/resume/download/` (download privado restrito ao candidato ou empresas com candidatura ativa)
3. **`backend/companies`**:
   - Model: `Company`.
   - Endpoints:
     - `GET /api/v1/companies/profile/`, `PUT /api/v1/companies/profile/`
     - `GET /api/v1/companies/candidates/`
4. **`backend/jobs`**:
   - Models: `Job`, `JobRequirement`.
   - Endpoints:
     - `GET /api/v1/jobs/` (pesquisa pública, filtros por título, área, cidade, modalidade, ocultando rascunhos)
     - `GET /api/v1/jobs/<id>/`
     - `GET /api/v1/jobs/my-jobs/` (vagas da empresa logada)
     - `POST /api/v1/jobs/`, `PUT /api/v1/jobs/<id>/`, `PATCH /api/v1/jobs/<id>/`
     - `GET /api/v1/skills/`, `POST /api/v1/skills/`
5. **`backend/applications`**:
   - Models: `Application`, `ApplicationHistory`.
   - Regras: Impedir duplicidade de candidatura ativa (`unique_together` ou constraint), registrar histórico de auditoria automaticamente.
   - Endpoints:
     - `GET /api/v1/applications/` (candidaturas do candidato)
     - `POST /api/v1/applications/` (candidatura em vaga publicada)
     - `POST /api/v1/applications/<id>/withdraw/` (retirar candidatura)
     - `PATCH /api/v1/applications/<id>/status/` (empresa altera status: 'em_analise', 'aprovada', 'rejeitada')
     - `GET /api/v1/companies/applications/` (candidaturas recebidas pelas vagas da empresa)
     - `GET /api/v1/companies/jobs/<job_id>/candidates/` (ranking de candidatos por vaga)
6. **`backend/recommendations`**:
   - Serviço determinístico de compatibilidade em Python:
     - Fórmula: `Score = (Pesos Atendidos / Peso Total) * 100`
     - Se faltar obrigatório: incompatível (`score = 0`).
     - Respeito à chave `is_visible` do candidato.
   - Endpoints:
     - `GET /api/v1/recommendations/` (vagas recomendadas para o candidato)
     - `GET /api/v1/dashboards/candidate/` e `GET /api/v1/dashboards/company/` (KPIs em tempo real)

### Passo 3 — Migração da Camada de Serviços do Frontend
- Atualizar `.env` e `.env.example` para `VITE_API_URL=http://localhost:8000/api/v1`.
- Criar cliente HTTP com interceptores de token JWT em `src/services/apiClient.ts`.
- Modularizar os serviços:
  - `src/services/auth.service.ts`
  - `src/services/candidates.service.ts`
  - `src/services/companies.service.ts`
  - `src/services/jobs.service.ts`
  - `src/services/applications.service.ts`
- Atualizar `src/contexts/AuthContext.tsx` e `src/services/api.ts` para conectar perfeitamente aos endpoints do Django.
- Manter suporte a fallback transparente para garantir que a aplicação continue 100% testável e executável em qualquer ambiente.

### Passo 4 — Testes e Validação
- `python manage.py check`
- Execução de testes de integração no Django (`python manage.py test`)
- Execução do build do React (`npm run build`)
- Execução dos testes unitários do frontend (`npm test`)
- Atualização do `README.md`
