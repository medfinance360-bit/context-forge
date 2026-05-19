# Context Forge

App web (Vite + React) para forjar pacotes de contexto e guardá-los no **Cofre**, com pastas e favoritos.

## Requisitos

- Node 20+
- Projeto [Supabase](https://supabase.com) com tabelas de `context_packages` e pastas (`migration.sql` + `migration-folders.sql` no SQL Editor)

## Configuração

```bash
cp .env.example .env.local
```

Edite `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Licença

Ver `LICENSE`.