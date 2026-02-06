-- Policies to fix chat creation/listing under RLS

-- Chats
alter table public.chats enable row level security;

create policy "chats_select_participants" on public.chats
for select
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.chat_id = id
      and cp.user_id = auth.uid()
  )
);

create policy "chats_insert_authenticated" on public.chats
for insert
to authenticated
with check (auth.uid() is not null);

-- Chat participants
alter table public.chat_participants enable row level security;

create policy "chat_participants_select_self" on public.chat_participants
for select
using (user_id = auth.uid());

create policy "chat_participants_insert_self_or_dm" on public.chat_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.chats c
    where c.id = chat_id
      and (c.dm_user_a = auth.uid() or c.dm_user_b = auth.uid())
  )
);

create policy "chat_participants_update_self" on public.chat_participants
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Messages
alter table public.messages enable row level security;

create policy "messages_select_participants" on public.messages
for select
using (
  exists (
    select 1
    from public.chat_participants cp
    where cp.chat_id = chat_id
      and cp.user_id = auth.uid()
  )
);

create policy "messages_insert_participants" on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chat_participants cp
    where cp.chat_id = chat_id
      and cp.user_id = auth.uid()
  )
);
