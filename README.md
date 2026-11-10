# Appliety — Plataforma Inteligente de Recrutamento e Oportunidades

> **MVP Desenvolvido do Zero com React, TypeScript, Tailwind CSS e Supabase (PostgreSQL).**  
> Interface implementada com alta fidelidade a partir do arquivo oficial do **Figma** (`ffBT6olP0h2NFqNKDINmAK`).

---

## 1. Descrição e Objetivo

A **Appliety** é uma plataforma web desenvolvida para aproximar candidatos em busca de novos caminhos profissionais a empresas que desejam contratar talentos qualificados.

O diferencial central da plataforma é o seu **sistema determinístico de compatibilidade**, que elimina a opacidade de algoritmos de caixa-preta e avalia candidatos com base em requisitos objetivos (obrigatórios e desejáveis) ponderados por pesos e níveis de domínio.

---

## 2. Tecnologias Utilizadas

### Frontend
- **React 18** com **TypeScript**
- **Vite 6** (Build tool e dev server)
- **Tailwind CSS v3** (Configurado com a paleta e tipografia oficial do Figma)
- **Space Grotesk** (Tipografia oficial da marca)
- **React Router DOM v7** (Roteamento declarativo com route guards)
- **TanStack Query v5** (Gerenciamento de cache e estado de dados)
- **Lucide React** (Ícones profissionais de interface)

### Backend & Banco de Dados
- **Supabase PostgreSQL 15+** (10 tabelas relacionais, constraints, triggers e RPCs)
- **Supabase Auth** (Cadastro, login, persistência de sessão e proteção contra alteração indevida de papel)
- **Supabase Storage** (Bucket privado `resumes` para upload e download autenticado de currículos em PDF de até 5 MB)
- **Row Level Security (RLS)** (Políticas estritas de isolamento entre candidatos e empresas)

### Qualidade e Testes
- **Vitest** (Testes unitários automatizados do motor de matching e validações de negócio)

---

## 3. Estrutura de Pastas

```
Appliety/
├── public/                 # Favicons e manifestos estáticos
├── src/
│   ├── components/
│   │   ├── shared/         # Navbar, PageHeader, NoticeBanner, ArchitecturalMotif
│   │   └── ui/             # Button, Input, Badge
│   ├── contexts/           # AuthContext (autenticação, sessão e perfis)
│   ├── layouts/            # PublicLayout, CandidateLayout, CompanyLayout
│   ├── lib/                # Inicialização do Supabase Client
│   ├── pages/
│   │   ├── candidate/      # Dashboard, Perfil, Curriculo, Candidaturas, Recomendacoes
│   │   ├── company/        # Dashboard, Perfil, Vagas, NovaVaga, CandidatosMatching, Candidaturas
│   │   └── public/         # Home, Login, Cadastro, Vagas, DetalhesVaga, RecuperarSenha
│   ├── routes/             # Configuração central de rotas com Route Guards
│   ├── services/           # Camada de API, initialData e persistência
│   ├── types/              # Definições completas de TypeScript
│   └── utils/              # Algoritmo determinístico de compatibilidade e testes
├── supabase/
│   ├── migrations/         # Migrations SQL versionadas (Schema, RLS, Matching Engine, Storage)
│   └── seed.sql            # Competências e dados iniciais
├── DESIGN_SYSTEM.md        # Especificação detalhada de tokens visuais extraídos do Figma
├── ARCHITECTURE.md         # Registro de decisões arquiteturais
├── PROJECT_PLAN.md         # Plano de execução do projeto
└── package.json
```

---

## 4. Instalação e Execução Local

### Pré-requisitos
- **Node.js** (v18 ou superior)
- **npm** (v9 ou superior)

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   *Nota: A aplicação possui fallback automático persistente em storage local, permitindo que o sistema seja testado integralmente de imediato mesmo antes da conexão com um projeto Supabase remoto.*

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:5173`.

4. **Execute os testes automatizados:**
   ```bash
   npm test
   ```

5. **Execute a compilação de produção:**
   ```bash
   npm run build
   ```

---

## 5. Configuração do Supabase (Banco de Dados e Storage)

As migrations versionadas em `supabase/migrations/` contêm todas as instruções DDL necessárias para reproduzir o banco integralmente:

1. `20261110000000_initial_schema.sql`:
   - Criação das 10 tabelas relacionais (`profiles`, `candidate_profiles`, `companies`, `skills`, `candidate_skills`, `resumes`, `jobs`, `job_requirements`, `applications`, `application_history`).
   - Triggers de `updated_at`, trigger de perfil automático (`on_auth_user_created`) e trigger de auditoria de status.
   - Constraint de unicidade para impedir duplicidade de candidaturas ativas.

2. `20261110000001_rls_policies.sql`:
   - Habilita Row Level Security em todas as entidades.
   - Regras de leitura e escrita isolando dados de candidatos e empresas.
   - Trigger que impede usuários de alterarem seu próprio papel (`role`).

3. `20261110000002_compatibility_engine.sql`:
   - Funções SQL `calculate_compatibility`, `get_candidate_matching_jobs` e `get_job_candidate_ranking`.

4. `20261110000003_storage_setup.sql`:
   - Criação do bucket privado `resumes` com limite de 5 MB e restrição para `application/pdf`.
   - Políticas RLS no storage liberando leitura apenas para o candidato e para empresas com candidaturas ativas.

---

## 6. Contas de Demonstração (MVP)

A tela de login (`/login`) oferece atalhos com 1 clique para testar os dois fluxos principais concebidos no Figma:

- **Candidata (Marina Costa):**
  - E-mail: `marina.costa@example.com`
  - Acessa painel do candidato, edição de competências, upload de currículo em PDF, candidaturas ativas e recomendações de vagas.
- **Empresa (Rafael Oliveira — ATLAS TECH):**
  - E-mail: `rafael@atlastech.example.com`
  - Acessa painel de vagas da empresa, publicação de novas vagas com requisitos e pesos, ranking de compatibilidade dos inscritos e download de currículos autorizados.

---

## 7. Critérios de Aceitação Atendidos

- [x] Cadastro e Login independentes para Candidato e Empresa
- [x] Perfil profissional com resumo e chave de visibilidade
- [x] Gerenciamento de competências com 5 níveis de domínio
- [x] Upload de currículo em PDF (máx 5 MB) em bucket privado
- [x] Cadastro da organização e gestão de vagas
- [x] Publicação, encerramento e arquivamento de oportunidades
- [x] Pesquisa pública de vagas com filtros por título, área, cidade e modalidade
- [x] Envio de candidaturas com bloqueio de duplicidade
- [x] Retirada de candidatura preservando histórico de auditoria
- [x] Sistema determinístico de compatibilidade (0% se faltar obrigatório, soma ponderada dos pesos)
- [x] Ranking de candidatos por compatibilidade para as empresas
- [x] Dashboards dinâmicos para candidato e empresa
- [x] Interface fiel aos frames do Figma com motivo arquitetural
- [x] 100% aprovado no build de produção (`vite build`) e testes automatizados (`vitest`)
