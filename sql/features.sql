-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — room numbers + breakfast (add-on) + settings
-- გაუშვი schema.sql-ისა და content.sql-ის შემდეგ.
-- ═══════════════════════════════════════════════════════════

-- ─── ROOM NUMBERS (physical rooms per type; admin-only) ──────
alter table room_types add column if not exists room_numbers text[] not null default '{}';

-- ─── BOOKINGS: breakfast flag + assigned room number ─────────
alter table bookings add column if not exists breakfast boolean not null default false;
alter table bookings add column if not exists room_no    text;

-- ─── SETTINGS (breakfast price + menu) ───────────────────────
create table if not exists app_settings (
  key   text primary key,
  value text
);
alter table app_settings enable row level security;

drop policy if exists as_public_read on app_settings;
create policy as_public_read on app_settings for select to anon using (true);

drop policy if exists as_admin_all on app_settings;
create policy as_admin_all on app_settings for all to authenticated using (true) with check (true);

insert into app_settings (key, value) values
  ('breakfast_price', '30'),
  ('breakfast_menu',  'ომლეტი • ხაჭაპური • ახალი ბოსტნეული • ყველი • ყავა/ჩაი • ნატურალური წვენი')
on conflict (key) do nothing;

-- ─── CREATE BOOKING v2 — with breakfast add-on ───────────────
-- breakfast = ფასი (app_settings.breakfast_price) × სტუმარი × ღამე
drop function if exists create_booking(int, date, date, int, text, text, text, text);

create or replace function create_booking(
  p_room_type_id int,
  p_in date,
  p_out date,
  p_guests int,
  p_name text,
  p_phone text,
  p_email text default null,
  p_comment text default null,
  p_breakfast boolean default false
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_avail record;
  v_rt room_types%rowtype;
  v_booking bookings%rowtype;
  v_bf_price numeric := 0;
  v_bf_total numeric := 0;
  v_total numeric;
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

  if p_breakfast then
    select coalesce(value::numeric, 0) into v_bf_price from app_settings where key = 'breakfast_price';
    v_bf_total := coalesce(v_bf_price, 0) * p_guests * v_avail.nights;
  end if;
  v_total := v_avail.total_price + v_bf_total;

  insert into bookings (booking_number, room_type_id, check_in, check_out, guests,
                        guest_name, guest_phone, guest_email, comment, total_price,
                        source, breakfast)
  values ('', p_room_type_id, p_in, p_out, p_guests,
          trim(p_name), trim(p_phone), nullif(trim(coalesce(p_email,'')), ''),
          nullif(trim(coalesce(p_comment,'')), ''), v_total, 'website', p_breakfast)
  returning * into v_booking;

  return json_build_object(
    'booking_number', v_booking.booking_number,
    'total_price',    v_booking.total_price,
    'breakfast',      v_booking.breakfast,
    'nights',         v_avail.nights,
    'room_name',      v_rt.name
  );
end $$;

grant execute on function create_booking(int, date, date, int, text, text, text, text, boolean) to anon, authenticated;
