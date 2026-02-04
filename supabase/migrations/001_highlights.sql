create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('profile', 'community')),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'wiki')),
  target_id uuid not null,
  title text,
  cover_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (scope, user_id, target_type, target_id)
);

alter table public.highlights enable row level security;

create policy "Highlights select community or own profile"
on public.highlights
for select
to authenticated
using (
  scope = 'community'
  or (scope = 'profile' and user_id = auth.uid())
);

create policy "Highlights insert own"
on public.highlights
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Highlights update own"
on public.highlights
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Highlights delete own"
on public.highlights
for delete
to authenticated
using (user_id = auth.uid());
