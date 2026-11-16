# DECISÕES ARQUITETURAIS — APPLIETY

Este documento detalha as decisões técnicas, estruturais e de segurança adotadas na concepção e implementação do **Appliety MVP**.

---

## 1. Stack e Separação de Responsabilidades

| Camada | Tecnologia | Justificativa |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript | Ecossistema maduro, forte tipagem estática e suporte extensivo à componentização modular. |
| **Build & Bundler** | Vite 6 | Inicialização instantânea em desenvolvimento, compilação de produção com tree-shaking e suporte nativo a ESM. |
| **Estilização** | Tailwind CSS v3 | Configuração de tokens visuais extraídos do Figma (`Space Grotesk`, `#0b5aa8`, `#f2f8ff`, `#b8d8ff`). |
| **Roteamento** | React Router DOM v7 | Gestão declarativa de rotas públicas e rotas protegidas com guards baseados no papel (`role`). |
| **Backend & Dados** | Supabase (PostgreSQL 15+) | Autenticação integrada, banco relacional com RLS, Storage privado e triggers de auditoria. |
| **Testes Automatizados** | Vitest | Testes unitários do algoritmo determinístico de compatibilidade e das regras de integridade do negócio. |

---

## 2. Decisão: Sistema Determinístico de Compatibilidade

### Contexto
A plataforma tem por objetivo conectar candidatos a vagas de forma confiável e transparente, sem a opacidade de "modelos caixa-preta" de IA generativa ou machine learning estocástico.

### Decisão
Implementamos uma fórmula determinística ponderada:
$$\text{Compatibilidade} = \left(\frac{\sum \text{Pesos dos Requisitos Atendidos}}{\sum \text{Pesos de Todos os Requisitos}}\right) \times 100$$

Regras inegociáveis:
1. **Requisitos Obrigatórios Ausentes:** Caso o candidato não atinja o nível mínimo de qualquer competência definida como `obrigatorio`, a vaga é classificada como **incompatível** e seu score é definido como `0%`.
2. **Requisitos Desejáveis:** Contribuem proporcionalmente com seu peso para elevar a pontuação entre 0 e 100%.
3. **Escala de Proficiência:** Mapeada ordenadamente: `iniciante (1) < basico (2) < intermediario (3) < avancado (4) < especialista (5)`.
4. **Vagas Sem Requisitos:** Possuem score indefinido (`null`), indicando ausência de critérios restritivos.
5. **Implementação Dupla com Paridade:** A lógica foi implementada em função SQL no PostgreSQL (`calculate_compatibility` e `get_job_candidate_ranking`) e em TypeScript (`src/utils/compatibility.ts`), validada por 5 casos de teste unitários.

---

## 3. Decisão: Modelo de Dados e Integridade Relacional

### Modelagem
- **`profiles`:** Conectada a `auth.users(id)` via Foreign Key com `ON DELETE CASCADE`. Contém os metadados cadastrais (`full_name`, `email`, `role`, `city`, `phone`).
- **Trigger `trg_prevent_role_change`:** Impede que um usuário altere seu próprio papel (`candidato` para `empresa` ou vice-versa) através de requisições de cliente.
- **`candidate_profiles` e `companies`:** Extensões específicas de cada papel, garantindo que campos exclusivos não poluam a tabela base.
- **Proteção contra Duplicidade:** Constraint de índice único condicional:
  ```sql
  CREATE UNIQUE INDEX idx_unique_active_application 
  ON public.applications (job_id, candidate_id) 
  WHERE status != 'retirada';
  ```
  Isso impede que um candidato envie duas candidaturas simultâneas para a mesma vaga, mas permite nova candidatura caso tenha retirado uma inscrição prévia.
- **Trilha de Auditoria Automática:** Trigger `record_application_status_change` dispara a cada atualização em `applications.status`, inserindo registro imutável em `application_history`.

---

## 4. Decisão: Isolamento de Dados e Row Level Security (RLS)

1. **Proteção de Vagas:** Empresas só podem editar, publicar ou encerrar vagas vinculadas ao seu `owner_id`. Vagas em rascunho nunca são visíveis na pesquisa pública.
2. **Isolamento de Candidaturas:** Uma empresa só tem acesso às candidaturas direcionadas às suas próprias oportunidades.
3. **Bucket Privado de Currículos (`resumes`):**
   - Não há links públicos (`public = false`).
   - Leitura autorizada exclusivamente para:
     a) O candidato proprietário do documento;
     b) A empresa responsável por uma vaga na qual o candidato possui candidatura ativa.

---

## 5. Decisão: Fidelidade Visual ao Figma (Design System)

Todas as cores, espaçamentos, tipografia e componentes seguem à risca o arquivo oficial do Figma (`ffBT6olP0h2NFqNKDINmAK`):
- Tipografia: **Space Grotesk** em todos os títulos, botões e labels.
- Cor da Marca: `#0b5aa8`.
- Cores de Superfície: `#f2f8ff` (fundo principal), `#f8fbff` (cartões e campos), `#e5f0fd` (banners informativos e KPIs).
- Bordas Estruturais: `#b8d8ff` (1px) com botões em cantos nítidos (`rounded-[2px]`).
- Motivo Arquitetural: Componente `ArchitecturalMotif` ("Caminhos abertos") reproduzido com precisão geométrica em SVG/CSS.
