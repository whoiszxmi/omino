-- Public chats RPC helpers

create or replace function public.list_public_chats()
returns table (
  id uuid,
  title text,
  last_message_at timestamptz,
  last_message_text text
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.title, c.last_message_at, c.last_message_text
  from public.chats c
  where c.type = 'public'
  order by c.last_message_at desc nulls last;
$$;

create or replace function public.create_public_chat(p_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_chat_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.chats (title, type, dm_key, dm_user_a, dm_user_b)
  values (trim(p_title), 'public', null, null, null)
  returning id into v_chat_id;

  insert into public.chat_participants (chat_id, user_id, role)
  values (v_chat_id, v_user_id, 'owner')
  on conflict (chat_id, user_id) do update set role = excluded.role;

  return v_chat_id;
end;
$$;

create or replace function public.join_public_chat(p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_type text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select c.type into v_type
  from public.chats c
  where c.id = p_chat_id;

  if v_type is distinct from 'public' then
    raise exception 'chat is not public';
  end if;

  insert into public.chat_participants (chat_id, user_id, role)
  values (p_chat_id, v_user_id, 'member')
  on conflict (chat_id, user_id) do nothing;
end;
$$;
