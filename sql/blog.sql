-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — blog / news (admin-authored posts)
-- გაუშვი schema.sql-ის შემდეგ. Supabase → SQL Editor → Run.
-- ═══════════════════════════════════════════════════════════

create table if not exists blog_posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  lang        text not null default 'ka',
  title       text not null,
  excerpt     text default '',
  cover_url   text default '',
  body_html   text not null default '',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on blog_posts (published, created_at desc);

-- keep updated_at fresh
create or replace function blog_touch_updated()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists blog_posts_touch on blog_posts;
create trigger blog_posts_touch before update on blog_posts
  for each row execute function blog_touch_updated();

-- RLS
alter table blog_posts enable row level security;

-- public (anon): only published posts, read-only
drop policy if exists bp_public_read on blog_posts;
create policy bp_public_read on blog_posts for select to anon using (published);

-- admin (authenticated): full access
drop policy if exists bp_admin_all on blog_posts;
create policy bp_admin_all on blog_posts for all to authenticated using (true) with check (true);
