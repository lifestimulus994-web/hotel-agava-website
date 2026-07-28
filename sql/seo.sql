-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — per-page SEO overrides (admin "SEO" module)
-- RankMath-lite: edit title / description / OG / robots per page.
-- გაუშვი schema.sql-ის შემდეგ. Supabase → SQL Editor → Run.
-- ═══════════════════════════════════════════════════════════

create table if not exists seo_meta (
  path           text primary key,           -- e.g. '/', '/rooms/lux/', '/blog/'
  title          text default '',
  description    text default '',
  og_image       text default '',
  robots         text default 'index, follow',
  focus_keyword  text default '',
  updated_at     timestamptz not null default now()
);

create or replace function seo_touch_updated()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists seo_meta_touch on seo_meta;
create trigger seo_meta_touch before update on seo_meta
  for each row execute function seo_touch_updated();

-- RLS
alter table seo_meta enable row level security;

-- public (anon): read-only (client applies overrides to <head> at runtime)
drop policy if exists seo_public_read on seo_meta;
create policy seo_public_read on seo_meta for select to anon using (true);

-- admin (authenticated): full access
drop policy if exists seo_admin_all on seo_meta;
create policy seo_admin_all on seo_meta for all to authenticated using (true) with check (true);
