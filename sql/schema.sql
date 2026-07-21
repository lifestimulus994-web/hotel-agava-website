-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — booking system schema (Supabase)
-- გაუშვი ერთხელ: Supabase Dashboard → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- ─── TABLES ───────────────────────────────────────────────

create table if not exists room_types (
  id          serial primary key,
  slug        text unique not null,
  name        text not null,
  badge       text,
  description text,
  base_price  numeric not null check (base_price >= 0),
  total_rooms int not null check (total_rooms >= 0),
  max_guests  int not null default 2,
  bed_type    text,
  room_size   int,
  amenities   text[] default '{}',
  seasonal    boolean not null default false,
  visible     boolean not null default true,
  sort        int not null default 0
);

create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  booking_number text unique not null,
  room_type_id   int not null references room_types(id),
  check_in       date not null,
  check_out      date not null,
  guests         int not null default 2,
  guest_name     text not null,
  guest_phone    text not null,
  guest_email    text,
  comment        text,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','cancelled','completed')),
  total_price    numeric,
  source         text not null default 'website',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists bookings_range_idx on bookings (room_type_id, check_in, check_out);
create index if not exists bookings_status_idx on bookings (status);

create table if not exists blocked_dates (
  id            serial primary key,
  room_type_id  int not null references room_types(id),
  date          date not null,
  rooms_blocked int not null default 1,
  reason        text,
  unique (room_type_id, date)
);

create table if not exists price_overrides (
  id           serial primary key,
  room_type_id int not null references room_types(id),
  date         date not null,
  price        numeric not null check (price >= 0),
  unique (room_type_id, date)
);

-- booking number: AGV-2026-0001
create sequence if not exists booking_seq;

create or replace function set_booking_number()
returns trigger language plpgsql as $$
begin
  if new.booking_number is null or new.booking_number = '' then
    new.booking_number := 'AGV-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('booking_seq')::text, 4, '0');
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists bookings_number_trg on bookings;
create trigger bookings_number_trg
  before insert or update on bookings
  for each row execute function set_booking_number();

-- ─── AVAILABILITY ─────────────────────────────────────────
-- pending ჯავშანი ბლოკავს 48 საათით; confirmed — ყოველთვის.
-- დაბრუნებული available = მინიმუმი დიაპაზონის ყველა ღამეზე.

create or replace function check_availability(p_in date, p_out date)
returns table (
  room_type_id int,
  slug         text,
  available    int,
  nights       int,
  total_price  numeric
)
language plpgsql security definer set search_path = public as $$
begin
  if p_in is null or p_out is null or p_out <= p_in
     or p_in < current_date or (p_out - p_in) > 30 then
    raise exception 'invalid date range';
  end if;

  return query
  with days as (
    select d::date as day from generate_series(p_in, p_out - 1, interval '1 day') d
  ),
  per_day as (
    select rt.id as rt_id, dy.day,
      rt.total_rooms
        - coalesce((
            select count(*) from bookings b
            where b.room_type_id = rt.id
              and b.check_in <= dy.day and b.check_out > dy.day
              and (b.status = 'confirmed'
                   or (b.status = 'pending' and b.created_at > now() - interval '48 hours'))
          ), 0)
        - coalesce((
            select bd.rooms_blocked from blocked_dates bd
            where bd.room_type_id = rt.id and bd.date = dy.day
          ), 0) as free,
      coalesce((
        select po.price from price_overrides po
        where po.room_type_id = rt.id and po.date = dy.day
      ), rt.base_price) as day_price
    from room_types rt cross join days dy
    where rt.visible
  )
  select pd.rt_id, rt.slug,
         greatest(min(pd.free), 0)::int,
         (p_out - p_in)::int,
         sum(pd.day_price)
  from per_day pd join room_types rt on rt.id = pd.rt_id
  group by pd.rt_id, rt.slug;
end $$;

-- ─── CREATE BOOKING (anon-safe, re-checks availability) ───

create or replace function create_booking(
  p_room_type_id int,
  p_in date,
  p_out date,
  p_guests int,
  p_name text,
  p_phone text,
  p_email text default null,
  p_comment text default null
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_avail record;
  v_rt room_types%rowtype;
  v_booking bookings%rowtype;
begin
  select * into v_rt from room_types where id = p_room_type_id and visible;
  if not found then raise exception 'room type not found'; end if;

  if p_guests < 1 or p_guests > v_rt.max_guests then
    raise exception 'invalid guest count';
  end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 120 then
    raise exception 'invalid name';
  end if;
  if length(trim(coalesce(p_phone,''))) < 6 or length(p_phone) > 30 then
    raise exception 'invalid phone';
  end if;

  select * into v_avail from check_availability(p_in, p_out) ca
  where ca.room_type_id = p_room_type_id;

  if v_avail.available < 1 then
    raise exception 'no availability';
  end if;

  insert into bookings (booking_number, room_type_id, check_in, check_out, guests,
                        guest_name, guest_phone, guest_email, comment, total_price, source)
  values ('', p_room_type_id, p_in, p_out, p_guests,
          trim(p_name), trim(p_phone), nullif(trim(coalesce(p_email,'')), ''),
          nullif(trim(coalesce(p_comment,'')), ''), v_avail.total_price, 'website')
  returning * into v_booking;

  return json_build_object(
    'booking_number', v_booking.booking_number,
    'total_price',    v_booking.total_price,
    'nights',         v_avail.nights,
    'room_name',      v_rt.name
  );
end $$;

-- ─── RLS ──────────────────────────────────────────────────

alter table room_types      enable row level security;
alter table bookings        enable row level security;
alter table blocked_dates   enable row level security;
alter table price_overrides enable row level security;

-- საიტი (anon): მხოლოდ ხილული ოთახების წაკითხვა
drop policy if exists rt_public_read on room_types;
create policy rt_public_read on room_types for select to anon using (visible);

-- ადმინი (authenticated): სრული წვდომა ყველაფერზე
drop policy if exists rt_admin_all on room_types;
create policy rt_admin_all on room_types for all to authenticated using (true) with check (true);

drop policy if exists bk_admin_all on bookings;
create policy bk_admin_all on bookings for all to authenticated using (true) with check (true);

drop policy if exists bd_admin_all on blocked_dates;
create policy bd_admin_all on blocked_dates for all to authenticated using (true) with check (true);

drop policy if exists po_admin_all on price_overrides;
create policy po_admin_all on price_overrides for all to authenticated using (true) with check (true);

-- anon-ს bookings-ზე პირდაპირი წვდომა არ აქვს — მხოლოდ RPC-ით
revoke all on bookings from anon;
grant execute on function check_availability(date, date) to anon, authenticated;
grant execute on function create_booking(int, date, date, int, text, text, text, text) to anon, authenticated;

-- ─── SEED: 7 ოთახის ტიპი ─────────────────────────────────

insert into room_types (slug, name, badge, base_price, total_rooms, max_guests, bed_type, room_size, amenities, seasonal, sort)
values
  ('standard',  'სტანდარტული ოთახი — 2 სტუმარზე', 'სტანდარტი',   120, 7, 2, '1 საწოლი',            22, '{"Wi-Fi","TV","კონდიციონერი","აბაზანა"}', false, 1),
  ('lux',       'ლუქსი — 2 სტუმარზე',              'ლუქსი',       120, 5, 2, '1 King საწოლი',       28, '{"Wi-Fi","TV","კონდიციონერი","მაცივარი","აბაზანა"}', false, 2),
  ('superlux',  'სუპერლუქსი — 2 სტუმარზე',         'სუპერლუქსი',  120, 1, 2, '1 King საწოლი',       36, '{"Wi-Fi","TV","კონდიციონერი","მაცივარი","აბაზანა","ცის ჭერი"}', false, 3),
  ('family3',   'საოჯახო ოთახი — 3 სტუმარზე',      'საოჯახო',     150, 3, 3, '2 საწოლი',            32, '{"Wi-Fi","TV","კონდიციონერი","მაცივარი","აბაზანა"}', false, 4),
  ('family4',   'საოჯახო ოთახი — 4 სტუმარზე',      'საოჯახო',     200, 2, 4, '2 საწოლი',            38, '{"Wi-Fi","TV","კონდიციონერი","მაცივარი","აბაზანა"}', false, 5),
  ('twobedlux', 'ორ ოთახიანი ლუქსი — 5 სტუმარზე',   'ლუქსი',       200, 1, 4, '2 ოთახი, 3 საწოლი',   45, '{"Wi-Fi","TV","კონდიციონერი","მაცივარი","აბაზანა","ცის ჭერი"}', false, 6),
  ('jacuzzi',   'სუპერ ლუქსი ჯაკუზით',             'VIP ლუქსი',   300, 1, 2, '1 King საწოლი',       40, '{"Wi-Fi","TV","კონდიციონერი","მაცივარი","ჯაკუზი","ცის ჭერი"}', true, 7)
on conflict (slug) do nothing;
