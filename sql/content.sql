-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — site images (client-editable photos) + storage
-- გაუშვი ერთხელ: Supabase Dashboard → SQL Editor → paste → Run
-- (schema.sql-ის შემდეგ)
-- ═══════════════════════════════════════════════════════════

-- ─── SITE IMAGES TABLE ───────────────────────────────────────
-- section მნიშვნელობები:
--   about              — „ჩვენს შესახებ“ ფოტოები
--   rooms              — ოთახების ზოლი მთავარ გვერდზე
--   gallery_breakfast  — გალერეა → საუზმე
--   gallery_hotel      — გალერეა → სასტუმრო
--   room:<slug>        — კონკრეტული ოთახის ბარათის ფოტოები (მაგ. room:lux)

create table if not exists site_images (
  id         bigserial primary key,
  section    text not null,
  url        text not null,
  alt        text default '',
  caption    text default '',
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists site_images_section_idx on site_images (section, sort);

alter table site_images enable row level security;

-- საიტი (anon): მხოლოდ წაკითხვა
drop policy if exists si_public_read on site_images;
create policy si_public_read on site_images for select to anon using (true);

-- ადმინი (authenticated): სრული წვდომა
drop policy if exists si_admin_all on site_images;
create policy si_admin_all on site_images for all to authenticated using (true) with check (true);

-- ─── STORAGE BUCKET (public read) ────────────────────────────
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "site_photos_read"   on storage.objects;
create policy "site_photos_read"   on storage.objects for select
  to anon, authenticated using (bucket_id = 'site-photos');

drop policy if exists "site_photos_insert" on storage.objects;
create policy "site_photos_insert" on storage.objects for insert
  to authenticated with check (bucket_id = 'site-photos');

drop policy if exists "site_photos_update" on storage.objects;
create policy "site_photos_update" on storage.objects for update
  to authenticated using (bucket_id = 'site-photos');

drop policy if exists "site_photos_delete" on storage.objects;
create policy "site_photos_delete" on storage.objects for delete
  to authenticated using (bucket_id = 'site-photos');

-- ─── NEW ROOM: ლუქსი ჯაკუზით (bookable) ──────────────────────
insert into room_types (slug, name, badge, base_price, total_rooms, max_guests, bed_type, room_size, amenities, seasonal, sort)
values
  ('jacuzzi-suite', 'ლუქსი ჯაკუზით', 'ლუქსი', 300, 1, 2, '1 დიდი ორმაგი საწოლი', 30,
   '{"Wi-Fi","TV","კონდიციონერი","ჯაკუზი","აბაზანა","ქალაქის ხედი"}', false, 8)
on conflict (slug) do nothing;

-- ─── SEED site_images (მიმდინარე ფოტოები, რომ ადმინში გამოჩნდეს) ─
-- ცარიელ ბაზაზე ერთხელ ჩაისახება; on conflict დამცავი ჩვენ არ გვჭირდება
-- რადგან seed-ს ვუშვებთ მხოლოდ თუ ცხრილი ცარიელია.
insert into site_images (section, url, alt, caption, sort)
select v.section, v.url, v.alt, v.caption, v.sort
from (values
  -- ჩვენს შესახებ
  ('about', 'assets/exterior-2.jpg', 'სასტუმრო აგავას ნათელი ლობი', '', 0),
  ('about', 'assets/exterior-1.jpg', 'სასტუმრო აგავას შენობა ღამით', '', 1),
  -- ოთახების ზოლი
  ('rooms', 'assets/room-jacuzzi-1.jpg', 'ოთახის ლუქსური ინტერიერი', '', 0),
  ('rooms', 'assets/room-lux-2.jpg', 'ლუქსი ცის ჭერით', '', 1),
  ('rooms', 'assets/room-standard-2.jpg', 'სტანდარტული ოთახი', '', 2),
  -- გალერეა — საუზმე
  ('gallery_breakfast', 'assets/room-lux-2.jpg', 'საუზმე', 'საუზმე', 0),
  -- გალერეა — სასტუმრო
  ('gallery_hotel', 'assets/room-superlux-2.jpg', 'ლუქსი', 'სასტუმრო', 0),
  ('gallery_hotel', 'assets/exterior-1.jpg', 'სასტუმრო', 'ჩვენი შენობა', 1),
  -- ოთახის ბარათები
  ('room:standard', 'assets/room-standard-2.jpg', 'სტანდარტული ოთახი', '', 0),
  ('room:standard', 'assets/room-standard-3.jpg', 'სტანდარტული ოთახი', '', 1),
  ('room:standard', 'assets/room-standard-4.jpg', 'სტანდარტული ოთახი', '', 2),
  ('room:standard', 'assets/room-standard-5.jpg', 'სტანდარტული ოთახი', '', 3),
  ('room:standard', 'assets/room-standard-1.jpg', 'სტანდარტული ოთახი', '', 4),
  ('room:lux', 'assets/room-lux-1.jpg', 'ლუქსი', '', 0),
  ('room:lux', 'assets/room-lux-2.jpg', 'ლუქსი', '', 1),
  ('room:lux', 'assets/room-lux-3.jpg', 'ლუქსი', '', 2),
  ('room:lux', 'assets/room-lux-4.jpg', 'ლუქსი', '', 3),
  ('room:superlux', 'assets/room-superlux-1.jpg', 'სუპერლუქსი', '', 0),
  ('room:superlux', 'assets/room-superlux-2.jpg', 'სუპერლუქსი', '', 1),
  ('room:superlux', 'assets/room-superlux-3.jpg', 'სუპერლუქსი', '', 2),
  ('room:family3', 'assets/room-family3-2.jpg', 'საოჯახო ოთახი', '', 0),
  ('room:family3', 'assets/room-family3-3.jpg', 'საოჯახო ოთახი', '', 1),
  ('room:family3', 'assets/room-family3-4.jpg', 'საოჯახო ოთახი', '', 2),
  ('room:family3', 'assets/room-family3-1.jpg', 'საოჯახო ოთახი', '', 3),
  ('room:family4', 'assets/room-family4-1.jpg', 'საოჯახო ოთახი', '', 0),
  ('room:twobedlux', 'assets/room-twobedlux-1.jpg', 'ორ ოთახიანი ლუქსი', '', 0),
  ('room:twobedlux', 'assets/room-twobedlux-2.jpg', 'ორ ოთახიანი ლუქსი', '', 1),
  ('room:twobedlux', 'assets/room-twobedlux-3.jpg', 'ორ ოთახიანი ლუქსი', '', 2),
  ('room:twobedlux', 'assets/room-twobedlux-4.jpg', 'ორ ოთახიანი ლუქსი', '', 3),
  ('room:jacuzzi-suite', 'assets/room-jacuzzi-suite-1.jpg', 'ლუქსი ჯაკუზით', '', 0),
  ('room:jacuzzi-suite', 'assets/room-jacuzzi-suite-2.jpg', 'ლუქსი ჯაკუზით', '', 1),
  ('room:jacuzzi-suite', 'assets/room-jacuzzi-suite-3.jpg', 'ლუქსი ჯაკუზით', '', 2),
  ('room:jacuzzi', 'assets/room-jacuzzi-3.jpg', 'სუპერ ლუქსი ჯაკუზით', '', 0),
  ('room:jacuzzi', 'assets/room-jacuzzi-1.jpg', 'სუპერ ლუქსი ჯაკუზით', '', 1),
  ('room:jacuzzi', 'assets/room-jacuzzi-2.jpg', 'სუპერ ლუქსი ჯაკუზით', '', 2),
  ('room:jacuzzi', 'assets/room-jacuzzi-4.jpg', 'სუპერ ლუქსი ჯაკუზით', '', 3)
) as v(section, url, alt, caption, sort)
where not exists (select 1 from site_images);
