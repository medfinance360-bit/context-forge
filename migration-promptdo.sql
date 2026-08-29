-- promptdo — schema completo
-- Roda no SQL Editor do Supabase (projeto promptdo)
-- Executa tudo de uma vez.

-- ─── Pastas ────────────────────────────────────────────────────────────────────
create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_user_created_idx on public.folders (user_id, created_at desc);

alter table public.folders enable row level security;
create policy "folders_select" on public.folders for select using (auth.uid() = user_id);
create policy "folders_insert" on public.folders for insert with check (auth.uid() = user_id);
create policy "folders_update" on public.folders for update using (auth.uid() = user_id);
create policy "folders_delete" on public.folders for delete using (auth.uid() = user_id);

-- ─── Prompts ───────────────────────────────────────────────────────────────────
create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  tags        text[] not null default '{}',
  color       text not null default 'none'
                check (color in ('none','blue','green','yellow','red','purple')),
  folder_id   uuid references public.folders(id) on delete set null,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists prompts_user_created_idx   on public.prompts (user_id, created_at desc);
create index if not exists prompts_user_folder_idx    on public.prompts (user_id, folder_id);
create index if not exists prompts_user_favorite_idx  on public.prompts (user_id, is_favorite desc, created_at desc);

alter table public.prompts enable row level security;
create policy "prompts_select" on public.prompts for select using (auth.uid() = user_id);
create policy "prompts_insert" on public.prompts for insert with check (auth.uid() = user_id);
create policy "prompts_update" on public.prompts for update using (auth.uid() = user_id);
create policy "prompts_delete" on public.prompts for delete using (auth.uid() = user_id);

-- ─── Auto-update updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger prompts_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();
