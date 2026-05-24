create table if not exists public.family_trees (
  id text primary key,
  name text not null default 'Silsilah Keluarga Utama',
  members jsonb not null default '[]'::jsonb,
  relations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.family_trees enable row level security;

drop policy if exists "Allow public read family trees" on public.family_trees;
drop policy if exists "Allow public write family trees" on public.family_trees;

create policy "Allow public read family trees"
on public.family_trees
for select
to anon
using (true);

create policy "Allow public write family trees"
on public.family_trees
for all
to anon
using (true)
with check (true);
