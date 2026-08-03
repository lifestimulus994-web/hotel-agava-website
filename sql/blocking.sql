-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — ბლოკირება დიაპაზონით + ადმინის ჯავშნის ვალიდაცია
-- გაუშვი schema.sql + content.sql + features.sql + manage.sql-ის შემდეგ.
--
-- რას ასწორებს:
--   1) ბლოკი აღარ კლავს ოთახის ტიპის მთელ მარაგს — ბლოკავს N ოთახს.
--   2) ბლოკი დიაპაზონზე დაიდება/მოიხსნება ერთი მოქმედებით.
--   3) ადმინის ჯავშანი ხელმისაწვდომობას ამოწმებს (overbooking-ის დაცვა).
-- ═══════════════════════════════════════════════════════════

-- ─── 0) ძველი ჩანაწერების ჰიგიენა ────────────────────────────
-- rooms_blocked ვერასდროს იქნება 0 ან უარყოფითი
delete from blocked_dates where rooms_blocked <= 0;

alter table blocked_dates drop constraint if exists blocked_dates_rooms_pos;
alter table blocked_dates add constraint blocked_dates_rooms_pos
  check (rooms_blocked > 0);


-- ─── 1) ბლოკის დადება დიაპაზონზე ─────────────────────────────
-- p_from და p_to ორივე ჩათვლით (ღამეები).
-- არსებულ დღეს რიცხვს უმატებს, ჭერი = room_types.total_rooms.
create or replace function admin_block_range(
  p_room_type_id int,
  p_from date,
  p_to date,
  p_rooms int default 1,
  p_reason text default null
)
returns int
language plpgsql as $$
declare
  v_total int;
  v_rows  int;
begin
  select total_rooms into v_total from room_types where id = p_room_type_id;
  if v_total is null then raise exception 'room type not found'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'invalid range'; end if;
  if (p_to - p_from) > 365 then raise exception 'range too long'; end if;
  if p_rooms is null or p_rooms < 1 then raise exception 'invalid room count'; end if;

  insert into blocked_dates (room_type_id, date, rooms_blocked, reason)
  select p_room_type_id, d::date, least(p_rooms, v_total), nullif(trim(coalesce(p_reason, '')), '')
  from generate_series(p_from, p_to, interval '1 day') d
  on conflict (room_type_id, date) do update
    set rooms_blocked = least(blocked_dates.rooms_blocked + excluded.rooms_blocked, v_total),
        reason        = coalesce(excluded.reason, blocked_dates.reason);

  get diagnostics v_rows = row_count;
  return v_rows;
end $$;


-- ─── 2) ბლოკის მოხსნა დიაპაზონზე ─────────────────────────────
-- p_rooms = null → სრულად შლის; რიცხვი → აკლებს და 0-ზე შლის.
create or replace function admin_unblock_range(
  p_room_type_id int,
  p_from date,
  p_to date,
  p_rooms int default null
)
returns int
language plpgsql as $$
declare v_rows int;
begin
  if p_from is null or p_to is null or p_to < p_from then raise exception 'invalid range'; end if;

  if p_rooms is null then
    delete from blocked_dates
     where room_type_id = p_room_type_id and date between p_from and p_to;
    get diagnostics v_rows = row_count;
  else
    if p_rooms < 1 then raise exception 'invalid room count'; end if;
    update blocked_dates set rooms_blocked = rooms_blocked - p_rooms
     where room_type_id = p_room_type_id and date between p_from and p_to;
    get diagnostics v_rows = row_count;
    delete from blocked_dates
     where room_type_id = p_room_type_id and date between p_from and p_to
       and rooms_blocked <= 0;
  end if;

  return v_rows;
end $$;


-- ─── 3) თავისუფალი ოთახები დიაპაზონზე, თვითონ ჯავშნის გამოკლებით ──
-- აბრუნებს პირველ სავსე დღეს (null = ყველა ღამე თავისუფალია).
create or replace function first_full_night(
  p_room_type_id int,
  p_in date,
  p_out date,
  p_exclude_id uuid default null
)
returns date
language sql stable as $$
  select d.day::date
  from generate_series(p_in, p_out - 1, interval '1 day') as d(day)
  where (
    (select total_rooms from room_types where id = p_room_type_id)
    - coalesce((
        select count(*) from bookings b
        where b.room_type_id = p_room_type_id
          and (p_exclude_id is null or b.id <> p_exclude_id)
          and b.check_in <= d.day and b.check_out > d.day
          and (b.status = 'confirmed'
               or (b.status = 'pending' and b.created_at > now() - interval '48 hours'))
      ), 0)
    - coalesce((
        select bd.rooms_blocked from blocked_dates bd
        where bd.room_type_id = p_room_type_id and bd.date = d.day
      ), 0)
  ) < 1
  order by d.day
  limit 1;
$$;


-- ─── 4) ადმინის ჯავშნის შენახვა (insert ან update) ───────────
-- p_id = null → ახალი. ამოწმებს მარაგს და ოთახის ნომრის კონფლიქტს.
create or replace function admin_save_booking(
  p_id           uuid,
  p_room_type_id int,
  p_in           date,
  p_out          date,
  p_guests       int,
  p_name         text,
  p_phone        text,
  p_status       text,
  p_price        numeric default null,
  p_comment      text default null,
  p_room_no      text default null,
  p_breakfast    boolean default false,
  p_source       text default 'admin'
)
returns json
language plpgsql as $$
declare
  v_rt      room_types%rowtype;
  v_full    date;
  v_clash   text;
  v_total   numeric;
  v_booking bookings%rowtype;
begin
  select * into v_rt from room_types where id = p_room_type_id;
  if not found then raise exception 'room type not found'; end if;
  if p_in is null or p_out is null or p_out <= p_in then raise exception 'invalid date range'; end if;
  if p_status not in ('pending','confirmed','cancelled','completed') then raise exception 'invalid status'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'invalid name'; end if;
  if length(trim(coalesce(p_phone,''))) < 4 then raise exception 'invalid phone'; end if;

  -- მარაგი მოწმდება მხოლოდ აქტიურ სტატუსებზე
  if p_status in ('pending','confirmed') then
    v_full := first_full_night(p_room_type_id, p_in, p_out, p_id);
    if v_full is not null then
      raise exception 'no availability on %', to_char(v_full, 'YYYY-MM-DD');
    end if;

    -- ერთი ფიზიკური ოთახი ორ სტუმარს ვერ ერგება გადამფარავ თარიღებზე
    if nullif(trim(coalesce(p_room_no,'')), '') is not null then
      select b.booking_number into v_clash
      from bookings b
      where b.room_no = trim(p_room_no)
        and b.status in ('pending','confirmed')
        and (p_id is null or b.id <> p_id)
        and b.check_in < p_out and b.check_out > p_in
      limit 1;
      if v_clash is not null then
        raise exception 'room % busy (%)', trim(p_room_no), v_clash;
      end if;
    end if;
  end if;

  -- ფასი: თუ ხელით არ არის მითითებული — ვთვლით ღამეებით + საუზმე
  v_total := p_price;
  if v_total is null then
    select sum(coalesce(
             (select po.price from price_overrides po
              where po.room_type_id = p_room_type_id and po.date = d.day),
             v_rt.base_price))
      into v_total
    from generate_series(p_in, p_out - 1, interval '1 day') as d(day);

    if p_breakfast then
      v_total := coalesce(v_total, 0)
        + coalesce((select value::numeric from app_settings where key = 'breakfast_price'), 0)
          * coalesce(p_guests, 1) * (p_out - p_in);
    end if;
  end if;

  if p_id is null then
    insert into bookings (booking_number, room_type_id, check_in, check_out, guests,
                          guest_name, guest_phone, comment, status, total_price,
                          source, room_no, breakfast)
    values ('', p_room_type_id, p_in, p_out, coalesce(p_guests, 2),
            trim(p_name), trim(p_phone), nullif(trim(coalesce(p_comment,'')), ''),
            p_status, v_total, coalesce(p_source, 'admin'),
            nullif(trim(coalesce(p_room_no,'')), ''), coalesce(p_breakfast, false))
    returning * into v_booking;
  else
    update bookings set
      room_type_id = p_room_type_id,
      check_in     = p_in,
      check_out    = p_out,
      guests       = coalesce(p_guests, guests),
      guest_name   = trim(p_name),
      guest_phone  = trim(p_phone),
      comment      = nullif(trim(coalesce(p_comment,'')), ''),
      status       = p_status,
      total_price  = v_total,
      room_no      = nullif(trim(coalesce(p_room_no,'')), ''),
      breakfast    = coalesce(p_breakfast, false)
    where id = p_id
    returning * into v_booking;
    if not found then raise exception 'booking not found'; end if;
  end if;

  return json_build_object(
    'id',             v_booking.id,
    'booking_number', v_booking.booking_number,
    'total_price',    v_booking.total_price
  );
end $$;


-- ─── 5) უფლებები: მხოლოდ ავტორიზებული ადმინი ─────────────────
revoke all on function admin_block_range(int, date, date, int, text)   from public, anon;
revoke all on function admin_unblock_range(int, date, date, int)       from public, anon;
revoke all on function first_full_night(int, date, date, uuid)         from public, anon;
revoke all on function admin_save_booking(uuid, int, date, date, int, text, text, text, numeric, text, text, boolean, text) from public, anon;

grant execute on function admin_block_range(int, date, date, int, text)   to authenticated;
grant execute on function admin_unblock_range(int, date, date, int)       to authenticated;
grant execute on function first_full_night(int, date, date, uuid)         to authenticated;
grant execute on function admin_save_booking(uuid, int, date, date, int, text, text, text, numeric, text, text, boolean, text) to authenticated;


-- ═══════════════════════════════════════════════════════════
-- მიგრაცია (ნაბიჯი 2) — ძველი „მთელი ტიპის" ბლოკები
-- ჯერ გაუშვი ეს SELECT და ნახე, არსებობს თუ არა ასეთი ჩანაწერები:
--
--   select bd.date, rt.name, bd.rooms_blocked, rt.total_rooms, bd.reason
--   from blocked_dates bd join room_types rt on rt.id = bd.room_type_id
--   where bd.rooms_blocked >= rt.total_rooms
--   order by bd.date;
--
-- თუ სია ცარიელია — არაფერი გასაკეთებელი.
-- თუ სიაში ნახავ დღეებს, რომლებიც სინამდვილეში ერთი სტუმრით იყო
-- დაკავებული (და არა რემონტით), წაშალე ისინი და სტუმარი შეიყვანე
-- ჩვეულებრივ ჯავშნად ადმინ პანელიდან:
--
--   delete from blocked_dates bd
--   using room_types rt
--   where rt.id = bd.room_type_id
--     and bd.rooms_blocked >= rt.total_rooms
--     and bd.reason = 'admin'
--     and bd.date >= current_date;
-- ═══════════════════════════════════════════════════════════
