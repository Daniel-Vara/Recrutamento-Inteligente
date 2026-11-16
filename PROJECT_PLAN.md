# PLANO DE PROJETO — APPLIETY (MVP)
## Plataforma Inteligente de Recrutamento e Oportunidades

Este documento estabelece o plano de arquitetura, modelagem de dados, regras de negócio e cronograma de implementação do MVP funcional da **Appliety**.

---

## 1. Arquitetura Geral da Solução

```
[ Frontend: React + TypeScript + Vite + Tailwind CSS + TanStack Query ]
                          │
                          │ Chamadas diretas autenticadas (Supabase JS Client v2)
                          ▼
[ Supabase Backend: PostgreSQL + Supabase Auth + Supabase Storage + RLS ]
  ├── Autenticação: Supabase Auth (Email / Password + Role nos metadados e profiles)
  ├── Banco Relacional: 10 tabelas relacionais em PostgreSQL com UUID, Foreign Keys, Triggers e Constraints
  ├── Regras de Acesso: Row Level Security (RLS) estrito em todas as tabelas
  ├── Lógica de Negócio de Servidor: PostgreSQL Functions / RPCs (Cálculo determinístico de compatibilidade, registro de histórico de candidaturas)
  └── Armazenamento Seguro: Supabase Storage (Bucket privado `resumes` com RLS por candidatura)
```

---

## 2. Modelagem do Banco de Dados (PostgreSQL / Supabase)

### 2.1. Tabelas Principais

1. **`profiles`**
   - `id` UUID PRIMARY KEY REFERENCES `auth.users(id)` ON DELETE CASCADE
   - `full_name` TEXT NOT NULL
   - `email` TEXT NOT NULL UNIQUE
   - `role` TEXT NOT NULL CHECK (`role` IN ('candidato', 'empresa'))
   - `city` TEXT
   - `phone` TEXT
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()

2. **`candidate_profiles`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `user_id` UUID NOT NULL UNIQUE REFERENCES `profiles(id)` ON DELETE CASCADE
   - `professional_summary` TEXT
   - `is_visible` BOOLEAN NOT NULL DEFAULT true
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()

3. **`companies`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `owner_id` UUID NOT NULL UNIQUE REFERENCES `profiles(id)` ON DELETE CASCADE
   - `name` TEXT NOT NULL
   - `description` TEXT
   - `city` TEXT NOT NULL
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()

4. **`skills`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `name` TEXT NOT NULL UNIQUE
   - `normalized_name` TEXT NOT NULL UNIQUE

5. **`candidate_skills`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `candidate_id` UUID NOT NULL REFERENCES `candidate_profiles(id)` ON DELETE CASCADE
   - `skill_id` UUID NOT NULL REFERENCES `skills(id)` ON DELETE CASCADE
   - `proficiency_level` TEXT NOT NULL CHECK (`proficiency_level` IN ('iniciante', 'basico', 'intermediario', 'avancado', 'especialista'))
   - CONSTRAINT `unique_candidate_skill` UNIQUE (`candidate_id`, `skill_id`)

6. **`resumes`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `candidate_id` UUID NOT NULL UNIQUE REFERENCES `candidate_profiles(id)` ON DELETE CASCADE
   - `storage_path` TEXT NOT NULL
   - `original_filename` TEXT NOT NULL
   - `file_size` INTEGER NOT NULL CHECK (`file_size` <= 5242880) -- 5 MB
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()

7. **`jobs`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `company_id` UUID NOT NULL REFERENCES `companies(id)` ON DELETE CASCADE
   - `title` TEXT NOT NULL
   - `description` TEXT NOT NULL
   - `city` TEXT NOT NULL
   - `area` TEXT NOT NULL
   - `work_mode` TEXT NOT NULL CHECK (`work_mode` IN ('presencial', 'hibrido', 'remoto'))
   - `employment_type` TEXT NOT NULL CHECK (`employment_type` IN ('clt', 'pj', 'estagio', 'temporario', 'freelancer'))
   - `status` TEXT NOT NULL DEFAULT 'rascunho' CHECK (`status` IN ('rascunho', 'publicada', 'encerrada', 'arquivada'))
   - `published_at` TIMESTAMPTZ
   - `expires_at` TIMESTAMPTZ
   - `created_at` TIMESTAMPTZ DEFAULT now()
   - `updated_at` TIMESTAMPTZ DEFAULT now()

8. **`job_requirements`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `job_id` UUID NOT NULL REFERENCES `jobs(id)` ON DELETE CASCADE
   - `skill_id` UUID NOT NULL REFERENCES `skills(id)` ON DELETE CASCADE
   - `requirement_type` TEXT NOT NULL CHECK (`requirement_type` IN ('obrigatorio', 'desejavel'))
   - `minimum_level` TEXT NOT NULL CHECK (`minimum_level` IN ('iniciante', 'basico', 'intermediario', 'avancado', 'especialista'))
   - `weight` INTEGER NOT NULL DEFAULT 1 CHECK (`weight` >= 1)
   - CONSTRAINT `unique_job_skill_requirement` UNIQUE (`job_id`, `skill_id`)

9. **`applications`**
   - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   - `job_id` UUID NOT NULL REFERENCES `jobs(id)` ON DELETE CASCADE
   - `candidate_id` UUID NOT NULL REFERENCES `candidate_profiles(id)` ON DELETE CASCADE
   - `status` TEXT NOT NULL DEFAULT 'pendente' CHECK (`status` IN ('pendente', 'em_analise', 'aprovada', 'rejeitada', 'retirada'))
   - `applied_at` TIMESTAMPTZ NOT NULL DEFAULT now()
   - `withdrawn_at` TIMESTAMPTZ
   - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
   - CONSTRAINT `unique_active_application` UNIQUE (`job_id`, `candidate_id`)

10. **`application_history`**
    - `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
    - `application_id` UUID NOT NULL REFERENCES `applications(id)` ON DELETE CASCADE
    - `previous_status` TEXT
    - `new_status` TEXT NOT NULL
    - `changed_by` UUID NOT NULL REFERENCES `profiles(id)`
    - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

---

## 3. Sistema de Compatibilidade (Deterministic Matching Engine)

### 3.1. Escala de Níveis de Domínio
Os níveis de proficiência seguem uma ordem numérica estrita para comparação:
- `iniciante`: valor `1`
- `basico`: valor `2`
- `intermediario`: valor `3`
- `avancado`: valor `4`
- `especialista`: valor `5`

### 3.2. Regras de Atendimento de Requisito
Um requisito é considerado **atendido** se:
1. O candidato possui a competência associada (`candidate_skills.skill_id = job_requirements.skill_id`); E
2. O nível de proficiência do candidato é **maior ou igual** ao nível mínimo exigido (`level_to_int(candidate_level) >= level_to_int(minimum_level)`).

### 3.3. Regras de Compatibilidade Geral
- **Requisitos Obrigatórios Ausentes:** Se houver qualquer requisito com `requirement_type = 'obrigatorio'` que **não** seja atendido pelo candidato, o score de compatibilidade é definido como `0%` (não compatível).
- **Vagas Sem Requisitos:** Caso uma vaga não possua nenhum requisito cadastrado, a compatibilidade é considerada indefinida (`null`).
- **Fórmula de Cálculo:**
  $$\text{Compatibilidade} = \left(\frac{\sum \text{Peso dos Requisitos Atendidos}}{\sum \text{Peso Total de Todos os Requisitos}}\right) \times 100$$
- **Requisitos Desejáveis:** Requisitos com `requirement_type = 'desejavel'` não bloqueiam a vaga caso ausentes, mas somam seu respectivo peso ao numerador quando atendidos.

A função SQL `calculate_compatibility(p_candidate_id UUID, p_job_id UUID)` e RPCs como `get_candidate_matching_jobs` e `get_job_candidate_ranking` calculam os scores de forma determinística e segura no banco de dados.

---

## 4. Políticas de Segurança (Row Level Security - RLS)

Todas as tabelas terão RLS ativado (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).

1. **`profiles`:**
   - Leitura pública dos perfis básicos necessários.
   - Escrita (UPDATE): apenas o próprio usuário (`auth.uid() = id`).
   - O campo `role` não pode ser alterado via UPDATE pelo usuário comum (controlado por trigger / política).

2. **`candidate_profiles`:**
   - Leitura: o próprio candidato pode ler tudo. Empresas podem visualizar perfis com `is_visible = true` ou perfis de candidatos inscritos em suas vagas.
   - Escrita (INSERT/UPDATE): apenas o próprio usuário (`auth.uid() = user_id`).

3. **`companies`:**
   - Leitura pública para exibir detalhes da empresa nas vagas.
   - Escrita (INSERT/UPDATE): apenas o responsável (`auth.uid() = owner_id`).

4. **`candidate_skills`:**
   - Escrita (ALL): apenas o próprio candidato através de seu `candidate_profile`.
   - Leitura: permitida para visualização de perfil ou de candidaturas.

5. **`resumes`:**
   - Leitura: o próprio candidato; empresas cujas vagas o candidato se candidatou.
   - Escrita (ALL): apenas o próprio candidato.

6. **`jobs`:**
   - Leitura: qualquer usuário (incluindo anônimo) pode visualizar vagas com `status = 'publicada'` e `expires_at >= now()`. A empresa dona pode visualizar todas as suas vagas em qualquer status.
   - Escrita (INSERT/UPDATE/DELETE): apenas a empresa dona (`owner_id = auth.uid()`).

7. **`applications`:**
   - Inserção (Candidatura): apenas candidatos autenticados em vagas publicadas válidas.
   - Leitura: o candidato dono da candidatura ou a empresa dona da vaga correspondente.
   - Atualização:
     - O candidato pode apenas alterar status para `retirada`.
     - A empresa pode alterar o status de suas próprias vagas (`pendente`, `em_analise`, `aprovada`, `rejeitada`).

8. **`application_history`:**
   - Inserção automatizada via trigger no PostgreSQL ao atualizar `applications.status`.
   - Leitura: candidato dono e empresa dona.

9. **Supabase Storage (`resumes` bucket):**
   - Bucket privado (`public = false`).
   - Download apenas via URLs assinadas geradas sob demanda após conferência de permissões via RLS.

---

## 5. Estrutura de Pastas do Frontend

```
src/
├── components/
│   ├── ui/               # Componentes de base (Button, Input, Select, Badge, Card, etc.)
│   ├── shared/           # Componentes compartilhados (Navbar, ArchitecturalMotif, PageHeader, NoticeBanner)
│   ├── candidate/        # Componentes do fluxo do candidato (ApplicationCard, SkillSelector, ResumeUpload)
│   └── company/          # Componentes do fluxo da empresa (JobCard, CandidateRankingCard, RequirementForm)
├── pages/
│   ├── public/           # Home/Landing, Login, Cadastro, Busca de Vagas, Detalhes da Vaga, Recuperar Senha
│   ├── candidate/        # Dashboard, Perfil, Currículo, Minhas Candidaturas, Vagas Recomendadas
│   └── company/          # Dashboard, Perfil Empresa, Vagas Empresa, Nova Vaga, Detalhes Vaga, Candidatos/Matching
├── layouts/              # PublicLayout, CandidateLayout, CompanyLayout
├── routes/               # Configuração do React Router com Route Guards por Role
├── hooks/                # useAuth, useJobs, useApplications, useCandidateProfile, useCompanyProfile
├── services/             # Clientes Supabase, queries e mutations
├── contexts/             # AuthContext (sessão, perfil ativo, permissões)
├── schemas/              # Schemas Zod de validação de formulários
├── types/                # Definições TypeScript do banco e entidades
└── lib/                  # Inicialização do Supabase, formatadores, helpers
```

---

## 6. Etapas e Cronograma de Execução

- [x] **ETAPA 1 — Análise e Planejamento**: Concluída. Análise profunda das telas do Figma via MCP, definição de tokens em `DESIGN_SYSTEM.md` e plano detalhado em `PROJECT_PLAN.md`.
- [ ] **ETAPA 2 — Configuração do Ambiente**: Inicialização do projeto Vite + React + TypeScript, instalação e configuração do Tailwind CSS, ícones Lucide, React Router DOM, TanStack Query, Zod e React Hook Form.
- [ ] **ETAPA 3 — Modelagem do Banco e Migrations**: Criação das migrations SQL completas do Supabase, definições de RLS, triggers de histórico, funções RPC de compatibilidade e scripts de seed.
- [ ] **ETAPA 4 — Autenticação e Gestão de Sessão**: Implementação do `AuthContext`, telas de Login, Cadastro com escolha de perfil (Candidato / Empresa), Recuperação de Senha e Guards de rotas protegidas.
- [ ] **ETAPA 5 — Funcionalidades de Negócio**: Perfil profissional com competências e níveis, upload de currículo em PDF com bucket privado, gestão de vagas (rascunho, publicação, requisitos com pesos), busca consolidada com filtros, candidaturas com proteção contra duplicidade e cálculo determinístico de compatibilidade.
- [ ] **ETAPA 6 — Construção da Interface com Alta Fidelidade ao Figma**: Construção pixel-conscious de todas as páginas conforme os frames analisados no Figma (paleta `#0b5aa8`, `#f2f8ff`, `#b8d8ff`, tipografia Space Grotesk, motivos arquiteturais e cards).
- [ ] **ETAPA 7 — Validação, Testes e Documentação**: Verificação de tipos TypeScript, compilação de produção (`vite build`), testes automatizados das regras de negócio (compatibilidade, validações, isolamento de empresas e candidatos) e elaboração do `README.md` final.
