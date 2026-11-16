# DESIGN SYSTEM — APPLIETY

Este documento define as diretrizes visuais e os tokens de design extraídos diretamente do arquivo oficial do Figma do projeto **Appliety** (`ffBT6olP0h2NFqNKDINmAK`).

---

## 1. Fundamentos e Filosofia Visual

A identidade visual da Appliety é fundamentada em uma estética **arquitetural, limpa, estruturada e profissional**, denominada no Figma como *"Light architectural"*. 

Elementos característicos:
- Bordas visíveis, finas e precisas (`1px solid #b8d8ff`).
- Cantos nítidos com arredondamentos sutis (`rounded-[2px]` a `rounded-[4px]`) em formulários e botões, contrastando com badges em formato de pílula (`rounded-[999px]`).
- Motivos gráficos conceituais denominados *"Caminhos abertos"* e *"Estrutura arquitetônica"*, formados por linhas geométricas entrelaçadas.
- Slogans editoriais em caixa alta com tracking espaçado: *"SEU TALENTO. NOVOS CAMINHOS."* e *"OPORTUNIDADES E TALENTOS CONECTADOS."*.

---

## 2. Paleta de Cores (Color Tokens)

| Token | Código Hex | Uso Principal |
| :--- | :--- | :--- |
| `primary` | `#0b5aa8` | Cor principal da marca, títulos, botões primários, ícones ativos, bordas de destaque e estados selecionados |
| `primary-hover` | `#094a8b` | Estado hover para botões e links primários |
| `accent-blue` | `#0076ff` | Links interativos e destaques secundários |
| `border-light` | `#b8d8ff` | Bordas estruturais, separadores de tabela, inputs e cartões |
| `border-medium` | `#5ea8ff` | Bordas de foco, acento arquitetural e indicadores ativos |
| `bg-page` | `#f2f8ff` | Fundo geral da aplicação e páginas autenticadas |
| `bg-page-alt` | `#f3f7fb` | Fundo secundário alternativo / splash |
| `bg-card` | `#f8fbff` | Fundo de cartões, campos de entrada e componentes neutros |
| `bg-notice` | `#e5f0fd` | Banners de aviso, caixas de destaque de perfil e métricas de KPI |
| `text-primary` | `#0b5aa8` | Títulos, rótulos de campos e cabeçalhos |
| `text-muted` | `#5f7288` | Textos descritivos, metadados, dicas de ajuda e legendas |
| `text-light` | `#f7faff` / `#ffffff` | Texto em botões primários e elementos com fundo contrastante |
| `success` | `#0e7039` | Indicadores de sucesso, candidaturas aprovadas |
| `warning` | `#b45309` | Alertas, requisitos desejáveis e estados pendentes |
| `danger` | `#c53030` | Ações destrutivas, erros de validação e candidaturas rejeitadas |

---

## 3. Tipografia

A fonte tipográfica oficial e exclusiva do projeto é a **Space Grotesk** (com fallbacks limpos para fontes sans-serif do sistema).

### Escala Tipográfica:
- **Display Brand:** `140px` (Desktop Splash / Cadastro) — `leading-[1.05] tracking-[-8px]`
- **Display Heading:** `56px` — `leading-[1.1] tracking-[-1.8px]` (Medium)
- **Title H1:** `34px - 40px` — `leading-tight tracking-[-1.5px]` (Medium / Bold)
- **Title H2:** `24px - 26px` — `leading-snug tracking-[-0.7px]` (Medium)
- **Title H3:** `18px - 20px` — `leading-normal` (Medium)
- **Body Large:** `16px` — `leading-[1.55]` (Regular / Medium)
- **Body Regular:** `14px - 15px` — `leading-[1.55]` (Regular / Medium)
- **Caption / Meta:** `12px - 13px` — `leading-normal` (Regular / Medium)
- **Eyebrow / Overline:** `12px` — `tracking-[1.3px] uppercase` (Medium)

---

## 4. Componentes Base e Padrões de Interface

### 4.1. Botões
- **Botão Primário:**
  - Fundo: `#0b5aa8`, Texto: `#ffffff`, Borda: `1px solid #0b5aa8`.
  - Altura: `52px` (telas internas) a `64px` (login/splash).
  - Raio de borda: `rounded-[2px]`.
  - Tipografia: `Space Grotesk Bold 15px`.
  - Ícone de direção: seta `↗` à direita.
- **Botão Secundário / Outline:**
  - Fundo: `#f8fbff`, Texto: `#0b5aa8`, Borda: `1px solid #0b5aa8` ou `#b8d8ff`.
  - Altura: `52px` / `44px`.
- **Botão Sutil / Ghost:**
  - Fundo transparente, Texto: `#0b5aa8`, sublinhado sutil ao hover.

### 4.2. Campos de Formulário (Inputs, Selects, Textareas)
- Fundo: `#f8fbff`.
- Borda: `1px solid #b8d8ff`. Foco: `border-[#5ea8ff] ring-1 ring-[#5ea8ff]`.
- Raio de borda: `rounded-[4px]`.
- Altura padrão de input: `50px` (conteúdo interno `px-[16px] py-[12px]`).
- Label: `Space Grotesk Medium 14px text-[#0b5aa8]`, com asterisco `*` nos campos obrigatórios.
- Helper text: `Space Grotesk Regular 12px text-[#5f7288]`.

### 4.3. Badges e Indicadores de Status
- Badges Pill: `bg-[#f8fbff] border border-[#b8d8ff] rounded-[999px] px-[12px] py-[6px] text-[#0b5aa8] text-[12px] font-medium`.
- Status da Candidatura:
  - **Pendente:** Pill com acento suave neutro/azul.
  - **Em análise:** Pill com acento azul claro `#b8d8ff`.
  - **Aprovada:** Pill com acento verde suave.
  - **Rejeitada:** Pill com acento cinza/vermelho suave.

### 4.4. Navbar e Navegação Superior
- Altura: `88px`.
- Borda inferior: `border-b border-[#b8d8ff]`.
- Logo à esquerda: `Appliety` em `Space Grotesk Medium 34px tracking-[-1.8px] text-[#0b5aa8]`.
- Links de navegação com indicador ativo: sublinhado de `2px` em `#0b5aa8` colado na borda inferior da barra.
- Menu de conta do usuário à direita: botão compacto `h-[44px] rounded-[2px] border border-[#0b5aa8]` com nome e chevron `⌄`.

### 4.5. Cartões e Painéis de Indicadores
- **Card de Métrica (KPI):**
  - Fundo: `#e5f0fd` ou `#f8fbff`.
  - Borda: `1px solid #b8d8ff`.
  - Padding: `24px`.
  - Número de destaque: `Space Grotesk Medium 40px text-[#0b5aa8]`.
  - Legenda: `Space Grotesk Regular 14px text-[#5f7288]`.
- **Banner de Informação / Alerta:**
  - Fundo: `#e5f0fd`, Borda: `1px solid #b8d8ff`, Ícone: `✓` ou `ℹ`, Padding: `20px`.
  - Título em `Space Grotesk Medium 15px text-[#0b5aa8]` e descrição em `Space Grotesk Regular 13px text-[#5f7288]`.

---

## 5. Elemento Decorativo: "Caminhos Abertos" (Architectural Motif)

O componente gráfico de assinatura visual da Appliety consiste em 3 caixas verticais concêntricas desenhadas apenas com bordas superiores, esquerdas e direitas:
```tsx
export function ArchitecturalMotif({ className = "" }: { className?: string }) {
  return (
    <div className={`h-[100px] overflow-clip relative shrink-0 w-[152px] ${className}`}>
      <div className="absolute border-[#5ea8ff] border-l border-r border-t h-[70px] left-[54.72px] top-[30px] w-[42.56px]" />
      <div className="absolute border-[#b8d8ff] border-l border-r border-t h-[85px] left-[27.36px] top-[15px] w-[97.28px]" />
      <div className="absolute border-[#b8d8ff] border-l border-r border-t h-[100px] left-0 top-0 w-[152px]" />
    </div>
  );
}
```
