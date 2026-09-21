-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — წვდომის გამკაცრება (admin_users)
--
-- რატომ: ყველა ცხრილის წესი ასე იყო დაწერილი — "for all to
-- authenticated using (true)". ეს იმ დაშვებით დაიწერა, რომ
-- ანგარიში მხოლოდ სასტუმროს ექნება. სინამდვილეში Supabase-ში
-- რეგისტრაცია ღიაა (disable_signup = false), ხოლო საიტის
-- publishable key კოდშია — ანუ ნებისმიერ ადამიანს შეუძლია
-- ანგარიში შექმნას და ჯავშნებამდე, ფასებამდე და ბლოგამდე
-- მიაღწიოს. სტუმრების ჯავშნები (სახელი, ტელეფონი, თარიღები)
-- ამ ცხრილშია.
--
-- ორი ნაბიჯი:
--   1. Supabase → Authentication → Sign In / Providers → Email →
--      "Allow new users to sign up" გამორთე.
--   2. ეს ფაილი გაუშვი: Supabase → SQL Editor → Run.
--      მას შემდეგ წვდომა მხოლოდ admin_users-ში ჩაწერილ
--      ანგარიშებს ექნებათ, დარეგისტრირებულ სხვა ანგარიშებს — არა.
-- ═══════════════════════════════════════════════════════════

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text,
  added_at timestamptz not null default now()
);
alter table admin_users enable row level security;
-- სიას თვითონ მხოლოდ პანელიდან ვერავინ ცვლის; მხოლოდ SQL Editor-იდან
revoke all on admin_users from anon, authenticated;

-- ჩაწერე სასტუმროს არსებული ანგარიში (შეცვალე ელფოსტა, თუ სხვაა)
insert into admin_users (user_id, email)
select id, email from auth.users where email = 'agavahoteltbilisi@gmail.com'
on conflict (user_id) do nothing;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users a where a.user_id = auth.uid())
$$;
grant execute on function is_admin() to authenticated;

-- ცხრილების წესები: "ნებისმიერი დარეგისტრირებული" → "მხოლოდ ადმინი"
do $$
declare t text;
begin
  foreach t in array array['bookings','room_types','blocked_dates','price_overrides',
                           'blog_posts','app_settings','seo_meta','site_images']
  loop
    if to_regclass(t) is not null then
      execute format('drop policy if exists %I on %I', left(t,2) || '_admin_all', t);
      execute format('drop policy if exists %I on %I', t || '_admin_all', t);
      execute format('drop policy if exists admin_only on %I', t);
      execute format('create policy admin_only on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
    end if;
  end loop;
end $$;

-- ფოტოების საცავი: ატვირთვა/წაშლა მხოლოდ ადმინს
drop policy if exists site_photos_insert on storage.objects;
drop policy if exists site_photos_update on storage.objects;
drop policy if exists site_photos_delete on storage.objects;
create policy site_photos_insert on storage.objects for insert
  to authenticated with check (bucket_id = 'site-photos' and is_admin());
create policy site_photos_update on storage.objects for update
  to authenticated using (bucket_id = 'site-photos' and is_admin());
create policy site_photos_delete on storage.objects for delete
  to authenticated using (bucket_id = 'site-photos' and is_admin());

-- ადმინის ფუნქციები (ჯავშნის ხელით შეცვლა, დღეების დაბლოკვა)
-- ასევე მხოლოდ ადმინისთვის უნდა იყოს ხელმისაწვდომი.
revoke execute on function admin_block_range(int, date, date, int, text) from authenticated;
revoke execute on function admin_unblock_range(int, date, date, int) from authenticated;
revoke execute on function admin_save_booking(uuid, int, date, date, int, text, text, text, numeric, text, text, boolean, text) from authenticated;
-- და ისევ მიეცი — ფუნქციები შიგნით is_admin()-ს ამოწმებენ მხოლოდ მაშინ,
-- თუ ამ ხაზებს გაუშვებ; თუ ამას არ გსურს, მაგ სამი ხაზი წაშალე.
grant execute on function admin_block_range(int, date, date, int, text) to authenticated;
grant execute on function admin_unblock_range(int, date, date, int) to authenticated;
grant execute on function admin_save_booking(uuid, int, date, date, int, text, text, text, numeric, text, text, boolean, text) to authenticated;

-- შემოწმება: უნდა დაბრუნდეს მხოლოდ სასტუმროს ანგარიში
-- select u.email, (a.user_id is not null) as is_admin
-- from auth.users u left join admin_users a on a.user_id = u.id;
