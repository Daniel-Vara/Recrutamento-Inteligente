# Appliety — Plataforma Inteligente de Recrutamento e Oportunidades

> **Trabalho de Conclusão de Curso (TCC) — Desenvolvimento de Sistemas | SENAI Morvan Figueiredo**  
> **Arquitetura Full-Stack:** Frontend React 18 + TypeScript + Tailwind CSS | Backend Django 6 + Django REST Framework + SimpleJWT | PostgreSQL / SQLite.  
> Interface implementada com alta fidelidade a partir do arquivo oficial do **Figma** (`ffBT6olP0h2NFqNKDINmAK`).

---

## 1. Descrição e Objetivo

A **Appliety** é uma plataforma que conecta empresas e candidatos, permitindo que empresas publiquem vagas com requisitos objetivos, candidatos se candidatem a oportunidades, e ambos recebam recomendações inteligentes através de um motor de matching determinístico e auditável.

### Diferenciais da Solução:
- **Motor Determinístico de Compatibilidade:** Elimina a opacidade de caixas-pretas. A compatibilidade é calculada com base na intersecção entre competências do candidato e requisitos da vaga, considerando níveis de proficiência (1 a 5), pesos (1 a 10) e bloqueio obrigatório.
- **Isolamento e Segurança Estrita:** Proteção de rotas, isolamento de papéis (Candidato, Empresa, Administrador) e acesso restrito aos currículos apenas a empresas com candidaturas ativas.
- **Trilha de Auditoria:** Registro de histórico de todas as transições de status de candidaturas.
- **REST API Completa e Documentada:** Endpoints padronizados com autenticação JWT e documentação Swagger/OpenAPI interativa.

---

## 2. Tecnologias Utilizadas

### Frontend
- **React 18** com **TypeScript**
- **Vite 6** (Build tool de alta performance)
- **Tailwind CSS v3** (Tokens oficiais, motivo arquitetural e tipografia Space Grotesk)
- **React Router DOM v7** (Roteamento declarativo com route guards)
- **TanStack Query v5** & **React Hook Form** / **Zod**
- **Lucide React** (Ícones modernos)

### Backend
- **Python 3.13+** & **Django 6.1**
- **Django REST Framework (DRF)**
- **SimpleJWT** (Autenticação JWT com access token e refresh token com blacklist)
- **django-cors-headers** & **django-filter**
- **drf-spectacular** (Documentação interativa OpenAPI 3.0, Swagger UI e ReDoc)
- **PostgreSQL** (com suporte automático a SQLite para avaliação local sem configuração)

### Testes e Qualidade
- **Vitest** (Testes unitários automatizados do frontend e motor de matching)
- **Django Test Runner** (18 testes automatizados cobrindo autenticação, perfis, vagas, candidaturas e matching)

---

## 3. Estrutura do Repositório

```
Recrutamento-Inteligente/
├── backend/                        # Backend Django REST Framework
│   ├── core/                       # Configurações centrais, URLs, settings e exceções
│   ├── accounts/                   # Usuário customizado, JWT, login, registro, permissões
│   │   └── management/commands/    # Comando `seed_db` para carga inicial
│   ├── candidates/                 # Perfil do candidato, competências e currículo PDF
│   ├── companies/                  # Perfil corporativo da empresa e candidatos visíveis
│   ├── jobs/                       # Vagas, requisitos com pesos e busca pública
│   ├── applications/               # Candidaturas, bloqueio de duplicidade e auditoria
│   └── recommendations/            # Motor determinístico de matching e dashboards
├── src/                            # Frontend React 18 + TypeScript
│   ├── components/                 # Componentes reutilizáveis (UI e Shared)
│   ├── contexts/                   # AuthContext (sessão JWT com fallback transparente)
│   ├── layouts/                    # Layouts Público, Candidato e Empresa
│   ├── pages/                      # Telas públicas, do candidato e da empresa
│   ├── routes/                     # Definição e proteção de rotas
│   ├── services/                   # Clientes HTTP, apiClient e serviços desacoplados
│   ├── types/                      # Definições completas TypeScript
│   └── utils/                      # Algoritmo de matching e testes
├── supabase/                       # Migrations SQL versionadas de referência
├── package.json                    # Scripts e dependências do frontend
└── README.md                       # Guia de instalação e documentação
```

---

## 4. Instalação e Execução Local

### Pré-requisitos
- **Node.js** (v18+) e **npm**
- **Python** (v3.12+) com gerenciador de ambiente (ex: `uv`, `venv` ou Python local)

---

### Passo 1 — Configurar e Iniciar o Backend (Django)

1. **Acesse a pasta do backend:**
   ```bash
   cd backend
   ```

2. **Crie e ative o ambiente virtual:**
   ```bash
   # Com uv (recomendado):
   uv venv .venv --python 3.13
   .venv\Scripts\activate      # No Windows
   # ou: source .venv/bin/activate  # No Linux/Mac

   # Ou com venv padrão do Python:
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Aplique as migrações do banco de dados:**
   ```bash
   python manage.py migrate
   ```

5. **Carregue os dados iniciais de demonstração (Seed):**
   ```bash
   python manage.py seed_db
   ```
   > Este comando cria automaticamente o administrador, a empresa demo (ATLAS TECH), a candidata demo (Marina Costa), competências e vagas com requisitos ponderados.

6. **Inicie o servidor backend:**
   ```bash
   python manage.py runserver
   ```
   - API ativa em: `http://localhost:8000/api/v1/`
   - Documentação Swagger UI: `http://localhost:8000/api/docs/`
   - Documentação ReDoc: `http://localhost:8000/api/redoc/`
   - Painel Django Admin: `http://localhost:8000/admin/`

---

### Passo 2 — Configurar e Iniciar o Frontend (React)

1. **Na raiz do projeto, instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:5173`.

---

## 5. Execução dos Testes Automatizados

### Testes do Backend (Django):
```bash
python backend/manage.py test accounts candidates companies jobs applications recommendations
```
> Executa 18 testes automatizados cobrindo autenticação JWT, permissões por papel, criação de vagas com requisitos ponderados, bloqueio de candidaturas duplicadas, histórico de auditoria e cálculo determinístico de compatibilidade.

### Testes do Frontend (Vitest):
```bash
npm test
```
> Executa 13 testes unitários cobrindo o algoritmo determinístico de compatibilidade, regras de atendimento de requisitos obrigatórios e desejáveis, e camada de serviços.

### Compilação de Produção do Frontend:
```bash
npm run build
```

---

## 6. Contas de Demonstração (Acesso Rápido)

Na tela de login (`/login`), há botões de 1 clique para acesso rápido de demonstração:

| Papel | Nome | E-mail | Senha | Acesso e Recursos |
|---|---|---|---|---|
| **Candidato** | Marina Costa | `marina.costa@example.com` | `demo123456` | Painel do candidato, edição de competências com 5 níveis, upload de currículo em PDF, visualização de candidaturas e vagas recomendadas por compatibilidade. |
| **Empresa** | Rafael Oliveira (ATLAS TECH) | `rafael@atlastech.example.com` | `demo123456` | Painel corporativo, criação e edição de vagas com critérios ponderados (pesos 1 a 10), ranking de compatibilidade de inscritos e atualização de status de candidaturas. |
| **Administrador** | Administrador | `admin@appliety.local` | `admin123` | Acesso completo ao painel administrativo Django (`/admin/`). |

---

## 7. Requisitos Oficiais Atendidos

- [x] **A. Autenticação e Gestão de Usuários:** Cadastro, Login JWT, papéis (candidato, empresa, admin), controle de acesso e perfil.
- [x] **B. Empresas e Vagas:** Cadastro corporativo, publicação de vagas com descrição, área, cidade, modalidade e requisitos ponderados (obrigatórios e desejáveis).
- [x] **C. Candidaturas:** Busca e filtros de vagas, candidatura com bloqueio estrito de duplicidade ativa, histórico de status e retirada autorizada.
- [x] **D. Motor Determinístico de Matching:** Comparação objetiva entre competências e requisitos, notas percentuais de 0 a 100%, bloqueio automático caso falte obrigatório e detalhamento do cálculo.
- [x] **E. Relatórios e Estatísticas:** Dashboards com indicadores de vagas ativas, candidaturas, status de seleção e áreas mais procuradas.
- [x] **F. REST API:** Endpoints documentados com drf-spectacular (Swagger UI interativo), validações e paginação.
- [x] **G. Interface e UX:** Design responsivo fiel ao Figma, paleta oficial, motivos arquiteturais e feedback visual em todas as ações.
