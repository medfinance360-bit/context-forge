-- context_packages: tabela isolada, RLS por user_id
-- Roda no SQL Editor do Supabase (mesmo projeto do justprompt)

create table if not exists public.context_packages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  raw_input      text not null,
  intent_json    jsonb,
  package_json   jsonb,
  validation_json jsonb,
  target_platform text not null default 'gpt',
  task_type      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Índices
create index on public.context_packages (user_id, created_at desc);

-- RLS
alter table public.context_packages enable row level security;

create policy "Users see own packages"
  on public.context_packages for select
  using (auth.uid() = user_id);

create policy "Users insert own packages"
  on public.context_packages for insert
  with check (auth.uid() = user_id);

create policy "Users update own packages"
  on public.context_packages for update
  using (auth.uid() = user_id);

create policy "Users delete own packages"
  on public.context_packages for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger context_packages_updated_at
  before update on public.context_packages
  for each row execute function public.set_updated_at();

-- Pastas e favoritos: executar também migration-folders.sql no mesmo projeto.
