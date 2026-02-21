alter table public.posts add column if not exists wallpaper_id text null;
alter table public.posts add column if not exists ui_theme jsonb null;

alter table public.wiki_pages add column if not exists wallpaper_id text null;
alter table public.wiki_pages add column if not exists ui_theme jsonb null;

alter table public.chats add column if not exists wallpaper_id text null;
