# Context Forge

App web para **forjar pacotes de contexto de alto nível** para LLMs. O utilizador descreve um pedido bruto, escolhe a plataforma-alvo, e o pipeline no Supabase produz um pacote estruturado, valida com **gap score** e refina em loop até atingir qualidade de produção.

## Requisitos

- Node 20+
- Projeto [Supabase](https://supabase.com) com tabelas `context_packages` (`migration.sql` no SQL Editor)
- Conta OpenAI (temporário) ou Anthropic com créditos ativos

## Configuração

```bash
cp .env.example .env.local
```

Edite `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

No Supabase → Edge Functions → Secrets, configure:
- `OPENAI_API_KEY` (ativo) **ou** `ANTHROPIC_API_KEY` (quando migrar de volta ao Claude)

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Deploy

Edge Functions são deployadas automaticamente via GitHub Actions ao fazer push em `main` com alterações em `supabase/functions/**`.

Requisitos para o CI funcionar:
- Secret `SUPABASE_ACCESS_TOKEN` no GitHub
- Secret `SUPABASE_PROJECT_REF` no GitHub (ref do projeto Supabase, sem espaços)

## Documentação de engenharia

Ver [`docs/ENGINEERING.md`](docs/ENGINEERING.md).

## Licença

Ver `LICENSE`.
