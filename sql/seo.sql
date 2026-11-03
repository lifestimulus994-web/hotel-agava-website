-- Requires sql/security.sql (public.is_admin).
-- Public page metadata; only existing hotel administrators can change it.
begin;
create table if not exists public.seo_meta (
  path text primary key,
  title text default '',
  description text default '',
  og_image text default '',
  robots text default 'index, follow',
  focus_keyword text default '',
  updated_at timestamptz not null default now()
);
alter table public.seo_meta enable row level security;
create or replace function public.seo_touch_updated()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at := now(); return new; end $$;
create or replace trigger seo_meta_touch before update on public.seo_meta
  for each row execute function public.seo_touch_updated();
drop policy if exists seo_public_read on public.seo_meta;
create policy seo_public_read on public.seo_meta for select to anon using(true);
drop policy if exists seo_admin_all on public.seo_meta;
create policy seo_admin_all on public.seo_meta for all to authenticated
  using(public.is_admin()) with check(public.is_admin());
grant select on public.seo_meta to anon;
grant select,insert,update,delete on public.seo_meta to authenticated;
notify pgrst,'reload schema';
commit;
