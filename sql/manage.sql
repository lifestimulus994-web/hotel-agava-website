-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — guest self-service (manage link: reschedule / cancel)
-- გაუშვი schema.sql + content.sql + features.sql-ის შემდეგ.
-- ═══════════════════════════════════════════════════════════

-- ─── per-booking secret token ────────────────────────────────
alter table bookings add column if not exists manage_token uuid not null default gen_random_uuid();
create index if not exists bookings_manage_token_idx on bookings (manage_token);

-- ─── create_booking: also return manage_token (same 9-arg signature) ──
create or replace function create_booking(
  p_room_type_id int, p_in date, p_out date, p_guests int,
  p_name text, p_phone text, p_email text default null,
  p_comment text default null, p_breakfast boolean default false
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
  if p_guests < 1 or p_guests > v_rt.max_guests then raise exception 'invalid guest count'; end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 120 then raise exception 'invalid name'; end if;
  if length(trim(coalesce(p_phone,''))) < 6 or length(p_phone) > 30 then raise exception 'invalid phone'; end if;

  select * into v_avail from check_availability(p_in, p_out) ca where ca.room_type_id = p_room_type_id;
  if v_avail.available < 1 then raise exception 'no availability'; end if;

  if p_breakfast then
    select coalesce(value::numeric, 0) into v_bf_price from app_settings where key = 'breakfast_price';
    v_bf_total := coalesce(v_bf_price, 0) * p_guests * v_avail.nights;
  end if;
  v_total := v_avail.total_price + v_bf_total;

  insert into bookings (booking_number, room_type_id, check_in, check_out, guests,
                        guest_name, guest_phone, guest_email, comment, total_price, source, breakfast)
  values ('', p_room_type_id, p_in, p_out, p_guests,
          trim(p_name), trim(p_phone), nullif(trim(coalesce(p_email,'')), ''),
          nullif(trim(coalesce(p_comment,'')), ''), v_total, 'website', p_breakfast)
  returning * into v_booking;

  return json_build_object(
    'booking_number', v_booking.booking_number,
    'total_price',    v_booking.total_price,
    'breakfast',      v_booking.breakfast,
    'nights',         v_avail.nights,
    'room_name',      v_rt.name,
    'manage_token',   v_booking.manage_token
  );
end $$;

grant execute on function create_booking(int, date, date, int, text, text, text, text, boolean) to anon, authenticated;

-- ─── read a booking by its token ─────────────────────────────
create or replace function booking_by_token(p_token uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select b.booking_number, b.check_in, b.check_out, b.guests, b.status,
         b.total_price, b.breakfast, b.guest_name,
         rt.name as room_name, rt.max_guests
    into v
  from bookings b join room_types rt on rt.id = b.room_type_id
  where b.manage_token = p_token;
  if not found then return null; end if;
  return row_to_json(v);
end $$;

-- ─── cancel by token ─────────────────────────────────────────
create or replace function cancel_booking_by_token(p_token uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text;
begin
  select id, status into v_id, v_status from bookings where manage_token = p_token;
  if v_id is null then raise exception 'not found'; end if;
  if v_status in ('cancelled','completed') then raise exception 'cannot cancel'; end if;
  update bookings set status = 'cancelled' where id = v_id;
  return json_build_object('ok', true, 'status', 'cancelled');
end $$;

-- ─── reschedule dates by token (re-checks availability, resets to pending) ──
create or replace function reschedule_booking_by_token(p_token uuid, p_in date, p_out date)
returns json
language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
  v_room_total int;
  v_base numeric;
  v_free int;
  v_sum numeric;
begin
  select * into b from bookings where manage_token = p_token;
  if not found then raise exception 'not found'; end if;
  if b.status in ('cancelled','completed') then raise exception 'cannot modify'; end if;
  if p_in is null or p_out is null or p_out <= p_in
     or p_in < current_date or (p_out - p_in) > 30 then
    raise exception 'invalid date range';
  end if;

  select total_rooms, base_price into v_room_total, v_base
  from room_types where id = b.room_type_id;

  -- min free over the new range, EXCLUDING this booking itself
  select coalesce(min(day_free), 0) into v_free from (
    select v_room_total
      - coalesce((select count(*) from bookings bb
          where bb.room_type_id = b.room_type_id and bb.id <> b.id
            and bb.check_in <= d.day and bb.check_out > d.day
            and (bb.status = 'confirmed' or (bb.status = 'pending' and bb.created_at > now() - interval '48 hours'))
        ), 0)
      - coalesce((select bd.rooms_blocked from blocked_dates bd
          where bd.room_type_id = b.room_type_id and bd.date = d.day), 0) as day_free
    from generate_series(p_in, p_out - 1, interval '1 day') as d(day)
  ) x;
  if v_free < 1 then raise exception 'no availability'; end if;

  -- room total across the new range (respect price overrides)
  select sum(coalesce(
           (select po.price from price_overrides po
            where po.room_type_id = b.room_type_id and po.date = d.day),
           v_base))
    into v_sum
  from generate_series(p_in, p_out - 1, interval '1 day') as d(day);

  if b.breakfast then
    v_sum := v_sum + coalesce((select value::numeric from app_settings where key = 'breakfast_price'), 0)
                     * b.guests * (p_out - p_in);
  end if;

  update bookings
     set check_in = p_in, check_out = p_out, total_price = v_sum, status = 'pending'
   where id = b.id;

  return json_build_object('ok', true, 'status', 'pending', 'total_price', v_sum, 'nights', (p_out - p_in));
end $$;

grant execute on function booking_by_token(uuid) to anon, authenticated;
grant execute on function cancel_booking_by_token(uuid) to anon, authenticated;
grant execute on function reschedule_booking_by_token(uuid, date, date) to anon, authenticated;
