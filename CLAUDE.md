# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint
npm run preview   # Serve the production build locally
```

There are no automated tests. There is no test runner configured.

## Architecture Overview

**context-forge** is a React SPA that lets users describe a raw prompt request, choose a target platform, and run a multi-stage AI pipeline (via Supabase Edge Functions) that produces a structured "context package" ready to be pasted into an LLM. Finished packages are saved to Supabase and browsable in the Vault.

### Frontend structure

```
src/
  pages/         Landing, Auth, Forge (main workspace), Vault (saved packages)
  hooks/         usePipeline (pipeline orchestrator), useAuth, useVaultPackages, useVaultFolders
  context/       AuthProvider + auth-context (Supabase session)
  lib/           contract.ts (canonical Zod schemas), formatters.ts, strategies.ts
  integrations/supabase/  client.ts, contextPackages.ts
  components/    AppShell (layout + Navbar), ProtectedRoute, plus feature components
  components/ui/ Primitive shadcn/ui-style components (button, card, badge, input, etc.)
```

Routes defined in `src/App.tsx`:
- `/` — public landing
- `/auth` — email/password login & signup
- `/forge`, `/vault` — authenticated, wrapped in `ProtectedRoute` > `AppShell`

### Pipeline — the core product flow

Orchestrated entirely in `src/hooks/usePipeline.ts`. Three sequential POST calls to Supabase Edge Functions, with a refinement loop:

```
infer-intent (gpt-4o-mini)
  → build-context (gpt-4o)
    → validate-context (gpt-4o)
      → if gap_score < 0.9 and attempts < MAX_ATTEMPTS (2):
          → build-context again with previous_gaps
            → validate-context again
  → insert to context_packages table
```

Pipeline phases: `idle` → `inferring_intent` → `building_context` → `validating` → `refining` → `done` | `error`

Edge function URLs: `${VITE_SUPABASE_URL}/functions/v1/{infer-intent|build-context|validate-context}`

Auth headers for every edge function call: `Authorization: Bearer <access_token>` + `apikey: <anon key>`.

**Critical DB insert detail:** `usePipeline.ts` uses local callback variables (`intent`, `contextPackage`, `lastValidation`) — not `state.*` — when inserting to avoid stale closures.

### Canonical Zod contract (`src/lib/contract.ts`)

This file is the single source of truth for all data shapes crossing the client ↔ edge function boundary. Key exports:

- `Platform` / `PLATFORMS` — `gpt | claude | cursor | system-prompt | agente`
- `TaskType` / `TASK_TYPES` — `REASONING | EXTRACTION | AGENT | CODE`
- `IntentSchema` — output of `infer-intent`
- `ContextPackageSchema` — output of `build-context`
- `ValidationSchema` — output of `validate-context` (`gap_score`, `gaps`, `decision`)
- `PipelineEventSchema` — discriminated union for the event drawer in the UI
- `GAP_THRESHOLDS` — `ACCEPT: 0.9`, `REFINE_PARTIAL: 0.5`

When changing any of these schemas, update both the client code and the corresponding edge function prompt/parsing logic.

### Edge Functions (`supabase/functions/`)

Deno runtime. Each function is a single `index.ts`. Currently using OpenAI (`OPENAI_API_KEY`); `ANTHROPIC_API_KEY` is the intended long-term key. All functions include `validate-context`'s structural penalties (applied in code, not by the LLM):
- `retrieval.docs` empty → −0.4
- `steps < 2` → −0.2
- generic filler phrases → −0.25

### Output formatters (`src/lib/formatters.ts`)

`formatForPlatform(pkg, platform)` converts a `ContextPackage` to platform-native text:
- `claude` → XML tags (`<system>`, `<context>`, `<contract>`)
- `gpt` → Markdown sections
- `cursor` → `.cursorrules` format
- `system-prompt` → plain text
- `agente` → ReAct (Thought/Action/Observation)

### Task strategies (`src/lib/strategies.ts`)

`STRATEGIES` maps each `TaskType` to a `system_hint` string injected into `system_immutable` by `build-context`. The `build-context` edge function reads this to set the reasoning/execution style.

## Environment Setup

```bash
cp .env.example .env.local
```

Required env vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

Edge function secrets (set via Supabase Dashboard → Edge Functions → Secrets):
- `OPENAI_API_KEY` — currently active
- `ANTHROPIC_API_KEY` — for when switching back to Claude

Database: run `migration.sql` in the Supabase SQL Editor to create `context_packages`. Run `migration-folders.sql` for folder support in the Vault.

## Design System

**Dark mode only** — the app has no light mode. `class="dark"` is always set on `<html>`.

Tailwind CSS 4 is configured via `@tailwindcss/vite` (not `postcss`). Tokens live as HSL CSS variables in `src/index.css` and are exposed through `@theme inline`.

**Color rules:**
- Never use `text-white`, `bg-black`, or raw hex values
- Always use semantic tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, etc.
- Task-type colors: `--task-reasoning` (blue), `--task-extraction` (purple), `--task-agent` (orange), `--task-code` (green)
- Gap score colors: `--success` (≥0.9), `--warning` (0.5–0.9), `--destructive` (<0.5)

**Typography:** Inter is the only font. Use `--font-sans`. Letter-spacing `-0.01em` on headings.

**Never hardcode strings in JSX** — the app uses a `useTranslation()` Context API (`src/lib/i18n.tsx`) with PT + EN support and `localStorage` persistence.

## CI/CD

`.github/workflows/deploy-functions.yml` deploys all three edge functions automatically when a push to `main` touches `supabase/functions/**`. Required GitHub Secrets: `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`.

## Known Technical Debt

1. `contract.ts` schemas use `z.string()` without specificity checks — generic placeholder values can pass Zod validation and only fail at `validate-context`.
2. Hybrid `task_type` inputs (e.g., REASONING + EXTRACTION combined) are forced into one category, leading to suboptimal `STRATEGY_MAP` selection.
3. No diminishing-returns detection in the refinement loop — a 0.82 → 0.83 improvement still triggers a full `build-context` cycle.
