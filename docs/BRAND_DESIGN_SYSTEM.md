# prompt.do — Brand & Design System
> Version 1.0 · May 2026 · Internal reference

*A Vault for prompts. Built for professionals.*

---

## 1. Sobre a marca

**Missão:** Tornar prompts ativos reutilizáveis — salvos, organizados, versionados e prontos para evoluir junto com o profissional.

**Posicionamento:** O Vault definitivo de prompts. Nem editor de texto, nem chat — uma camada estável entre o profissional e os modelos.

**Referências estéticas:** Linear · Raycast · Vercel

---

## 2. Tom de voz

Profissional, claro e direto. Sem jargão corporativo, sem entusiasmo artificial.

**Faça:**
- "Prompt salvo." — confirma sem comemorar
- "Faça login para gerar prompts." — instrução clara
- "Cancel anytime." — promessa curta, verdadeira

**Não faça:**
- "Uhuu! Seu prompt incrível foi salvo com sucesso! 🎉"
- "Oops! Algo deu errado :(" — sem contexto não ajuda ninguém

---

## 3. Logo & wordmark

- Ícone: 32×32px desktop / 28×28px mobile, `border-radius: 8px`
- Wordmark: Inter 500, `tracking: -0.01em`, **sempre lowercase**
- Composição mínima: 24px de altura

**Proibido:** CamelCase, sombras, gradientes, ícone sozinho sem contexto.

---

## 4. Paleta de cores

> Dark mode exclusivo. Nunca use HEX direto — sempre tokens HSL.

| Token | HSL | HEX | Uso |
|---|---|---|---|
| `background` | 0 0% 4% | `#0a0a0a` | Fundo global |
| `card / popover` | 0 0% 6% | `#0f0f0f` | Cards, dialogs |
| `foreground` | 0 0% 95% | `#F2F2F2` | Texto primário |
| `muted-foreground` | 0 0% 60% | `#999999` | Texto secundário |
| `border / input` | 0 0% 14% | `#232323` | Linhas, inputs |
| `ring` | 0 0% 23% | `#3A3A3A` | Foco visual |
| `accent / muted` | 0 0% 10% | `#1A1A1A` | Hover, badges |
| `primary` | 0 0% 95% | `#F2F2F2` | Botão CTA |
| `destructive` | 0 62% 50% | `#D03333` | Erros, delete |

**Regra de ouro:** Nunca `text-white`, `bg-black`. Use sempre tokens semânticos.

---

## 5. Tipografia

Inter é a única família tipográfica oficial.

| Estilo | Tamanho | Peso | Uso |
|---|---|---|---|
| Display | 24–32px | 300 | Títulos de página, hero |
| Heading | 16–20px | 500 | Cabeçalhos de seção e cards |
| Body | 14px | 400 | Texto base, descrições |
| Label / UI | 12px | 500 | Toggles, abas |
| Caption / Meta | 11px | 500 | Badges, timestamps |

- Letter-spacing `-0.01em` em headings
- Line-height `1.5` em body, `1.2` em headings
- `-webkit-font-smoothing: antialiased` sempre
- `text-size-adjust: 100%` para iOS

---

## 6. Forma, raio e espaço

**Border radius** (base `--radius: 1rem / 16px`):
- `lg` = 16px — cards, dialogs, inputs grandes
- `md` = 14px — botões médios
- `sm` = 12px — badges, toggles
- `rounded-2xl` — superfícies premium

**Container:** `max-w-5xl` · `px-3` mobile / `px-6` desktop

**Navbar:** `h-14` mobile / `h-16` desktop · `sticky top-0` · `backdrop-blur-xl bg-background/80`

---

## 7. Componentes principais

### Botões

| Variante | Aparência | Uso |
|---|---|---|
| `default` | `bg-foreground / text-background` | Ação primária (Salvar, Forjar) |
| `outline` | `border / hover:bg-accent` | Ações secundárias |
| `ghost` | `hover:bg-accent` | Ícones em cards |
| `destructive` | `bg-destructive` | Confirmação de delete |

### Cards (VaultPackageCard)
- `rounded-2xl border-border/40 hover:border-border`
- `bg-card/50` padrão, `bg-card` no hover
- Ações: `opacity-0 group-hover:opacity-100`
- Color stripe lateral 3px por `task_type`
- Tags: `bg-accent/50 text-muted-foreground/80`

### Badges
- REASONING: azul | EXTRACTION: roxo | AGENT: laranja | CODE: verde
- gap_score: verde ≥0.9 | amarelo 0.5–0.9 | vermelho <0.5
- Tamanho 11px, padding 0.5rem

### Diálogos
- `rounded-2xl bg-card`
- Overlay: `backdrop-blur-sm bg-background/80`
- Footer: botões alinhados à direita

---

## 8. Padrões de UX

- Optimistic UI em delete, favorite e move
- `staleTime: 30s` no QueryClient
- `beforeunload` guard em forms com mudanças não salvas
- Toasts via `sonner` — sucesso curto, erro com contexto
- Autenticados na landing → redirect para `/forge`
- Features de IA sem session → banner + botão desabilitado

---

## 9. Internacionalização

- Context API em `src/lib/i18n.tsx` com `useTranslation()`
- Auto-detect `navigator.language`, fallback EN
- Persistência em `localStorage`
- `t("chave")` — nunca strings literais em JSX
- Adicionar PT + EN na mesma PR

---

## 10. Mobile & PWA

- Mobile-first; breakpoint `sm (640px)`
- Viewport mínimo: 360px
- `manifest.json`: `display: standalone`, `theme: #0a0a0a`
- Service Worker: **nunca interceptar `/auth`**
- Safe-areas: `env(safe-area-inset-*)`
- `color-scheme: dark` no html

---

## 11. Antipadrões

- ❌ `text-[#fff]`, `bg-black` — use tokens
- ❌ Fontes diferentes de Inter
- ❌ Modo claro / `prefers-color-scheme: light`
- ❌ Strings hardcoded em JSX
- ❌ Buscar dados dentro de cards (use props)
- ❌ Edge function sem session válida
