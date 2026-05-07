-- Pastas no cofre + favoritos. Executar no SQL Editor do Supabase após migration.sql.
-- Encaminha pacotes para pastas (folder_id); cofre principal = folder_id IS NULL.

create table if not exists public.vault_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_folders_user_created_idx
  on public.vault_folders (user_id, created_at desc);

alter table public.vault_folders enable row level security;

drop policy if exists "Users see own vault folders" on public.vault_folders;
create policy "Users see own vault folders"
  on public.vault_folders for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own vault folders" on public.vault_folders;
create policy "Users insert own vault folders"
  on public.vault_folders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own vault folders" on public.vault_folders;
create policy "Users update own vault folders"
  on public.vault_folders for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own vault folders" on public.vault_folders;
create policy "Users delete own vault folders"
  on public.vault_folders for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vault_folders_updated_at on public.vault_folders;
create trigger vault_folders_updated_at
  before update on public.vault_folders
  for each row execute function public.set_updated_at();

alter table public.context_packages
  add column if not exists folder_id uuid references public.vault_folders(id) on delete set null;

alter table public.context_packages
  add column if not exists is_favorite boolean not null default false;

create index if not exists context_packages_user_folder_idx
  on public.context_packages (user_id, folder_id);

create index if not exists context_packages_user_favorite_idx
  on public.context_packages (user_id, is_favorite desc, created_at desc);
