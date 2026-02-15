create or replace function public.cleanup_highlight_on_post_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.highlights
  where target_type = 'post'
    and target_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_highlight_post on public.posts;
create trigger trg_cleanup_highlight_post
after delete on public.posts
for each row execute function public.cleanup_highlight_on_post_delete();

create or replace function public.cleanup_highlight_on_wiki_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.highlights
  where target_type = 'wiki'
    and target_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_highlight_wiki on public.wiki_pages;
create trigger trg_cleanup_highlight_wiki
after delete on public.wiki_pages
for each row execute function public.cleanup_highlight_on_wiki_delete();
