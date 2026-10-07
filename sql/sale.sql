-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — ფასდაკლება ოთახის ტიპზე
-- გაუშვი Supabase → SQL Editor → New query → Run.
-- schema.sql-ის, features.sql-ის და manage.sql-ის შემდეგ.
--
-- ორი ველი ემატება room_types-ს: sale_price და sale_active. სანამ
-- sale_active ჩართული არ არის, ყველაფერი ისე რჩება, როგორც იყო.
--
-- მთავარი აქ არის check_availability-ის განახლება. ჯავშნის თანხას
-- სწორედ ის ითვლის და create_booking მას ეყრდნობა — ანუ ფასდაკლება
-- სტუმარს რეალურად ერიცხება, არა მხოლოდ ეკრანზე ჩანს.
-- ═══════════════════════════════════════════════════════════

alter table room_types add column if not exists sale_price  numeric;
alter table room_types add column if not exists sale_active boolean not null default false;

do $do$
begin
  if not exists (select 1 from pg_constraint where conname = 'room_types_sale_price_check') then
    alter table room_types add constraint room_types_sale_price_check check (sale_price is null or sale_price >= 0);
  end if;
end $do$;

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
      coalesce(
        -- a price set for that exact date still wins: it is the most specific
        (select po.price from price_overrides po
         where po.room_type_id = rt.id and po.date = dy.day),
        -- then the room's sale price, while the sale is switched on
        (case when rt.sale_active and rt.sale_price is not null then rt.sale_price end),
        rt.base_price
      ) as day_price
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

grant execute on function check_availability(date, date) to anon, authenticated;
