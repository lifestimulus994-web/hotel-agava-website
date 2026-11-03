-- Requires security.sql and sale.sql. Applies no prices by itself.
begin;

-- ═══════════════════════════════════════════════════════════
-- HOTEL AGAVA — ფასდაკლება თარიღების დიაპაზონზე
-- გაუშვი Supabase → SQL Editor → New query → Run.
-- blocking.sql-ისა და sale.sql-ის შემდეგ.
--
-- რატომ: price_overrides უკვე არსებობდა და check_availability
-- უკვე იყენებდა — მაგრამ ადმინში მხოლოდ თითო დღეზე, თითო ნომერზე
-- იდებოდა. 2–5 ნოემბრის დაყენება რვავე ნომერზე 32 დაჭერა იყო,
-- ამიტომ არავის გამოუყენებია: ცხრილი დღემდე ცარიელია.
--
-- ფასის რიგი უცვლელი რჩება:
--   თარიღზე დადებული ფასი → აქციის ფასი → ჩვეულებრივი ფასი
-- ═══════════════════════════════════════════════════════════

-- ─── 1) ფასის დადება დიაპაზონზე ──────────────────────────────
-- ორი გზა: ან ზუსტი ფასი (p_price), ან პროცენტი ჩვეულებრივიდან
-- (p_percent). პროცენტი რამდენიმე ნომერზე ერთად მუშაობს, რადგან
-- თითოეულს თავისი ფასიდან აკლდება.
create or replace function admin_set_price_range(
  p_room_type_ids int[],
  p_from date,
  p_to date,
  p_price numeric default null,
  p_percent int default null
)
returns int
language plpgsql security invoker set search_path = public as $$
declare
  v_rows int;
begin
  if not public.is_admin() then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if p_room_type_ids is null or array_length(p_room_type_ids, 1) is null then
    raise exception 'ნომრის ტიპი არ არის არჩეული';
  end if;
  if exists (
    select 1 from unnest(p_room_type_ids) chosen(room_id)
    where chosen.room_id is null or not exists (select 1 from public.room_types rt where rt.id = chosen.room_id)
  ) then
    raise exception 'invalid room type';
  end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to < p_from then
    raise exception 'თარიღების დიაპაზონი არასწორია';
  end if;
  if (p_to - p_from) > 364 then
    raise exception 'დიაპაზონი ძალიან გრძელია (მაქსიმუმ 365 დღე)';
  end if;
  if (p_price is null) = (p_percent is null) then
    raise exception 'მიუთითე ან ფასი, ან პროცენტი — ერთ-ერთი';
  end if;
  if p_price is not null and (p_price < 0 or p_price::text in ('NaN', 'Infinity', '-Infinity')) then
    raise exception 'ფასი უარყოფითი ვერ იქნება';
  end if;
  if p_percent is not null and (p_percent < 1 or p_percent > 90) then
    raise exception 'პროცენტი 1-დან 90-მდე უნდა იყოს';
  end if;

  insert into price_overrides (room_type_id, date, price)
  select rt.id,
         d::date,
         case
           when p_price is not null then p_price
           else round(rt.base_price * (100 - p_percent) / 100.0)
         end
  from room_types rt
  cross join generate_series(p_from, p_to, interval '1 day') d
  where rt.id = any(p_room_type_ids)
  on conflict (room_type_id, date) do update
    set price = excluded.price;

  get diagnostics v_rows = row_count;
  return v_rows;
end $$;


-- ─── 2) ფასის მოხსნა დიაპაზონზე ──────────────────────────────
-- მოხსნის შემდეგ ნომერი უბრუნდება აქციის ან ჩვეულებრივ ფასს.
create or replace function admin_clear_price_range(
  p_room_type_ids int[],
  p_from date,
  p_to date
)
returns int
language plpgsql security invoker set search_path = public as $$
declare
  v_rows int;
begin
  if not public.is_admin() then
    raise exception 'administrator required' using errcode = '42501';
  end if;
  if p_room_type_ids is null or array_length(p_room_type_ids, 1) is null then
    raise exception 'ნომრის ტიპი არ არის არჩეული';
  end if;
  if exists (
    select 1 from unnest(p_room_type_ids) chosen(room_id)
    where chosen.room_id is null or not exists (select 1 from public.room_types rt where rt.id = chosen.room_id)
  ) then
    raise exception 'invalid room type';
  end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to < p_from then
    raise exception 'თარიღების დიაპაზონი არასწორია';
  end if;

  if (p_to - p_from) > 364 then
    raise exception 'დიაპაზონი ძალიან გრძელია (მაქსიმუმ 365 დღე)';
  end if;
  delete from price_overrides
  where room_type_id = any(p_room_type_ids)
    and date between p_from and p_to;

  get diagnostics v_rows = row_count;
  return v_rows;
end $$;


-- ─── 3) უფლებები ─────────────────────────────────────────────
-- security definer განზრახ არ არის: ფუნქცია გამომძახებლის
-- უფლებებით მუშაობს, ანუ price_overrides-ის RLS ძალაშია და
-- ჩაწერა მხოლოდ ადმინს შეუძლია.
revoke execute on function admin_set_price_range(int[], date, date, numeric, int) from public, anon;
revoke execute on function admin_clear_price_range(int[], date, date) from public, anon;
grant  execute on function admin_set_price_range(int[], date, date, numeric, int) to authenticated;
grant  execute on function admin_clear_price_range(int[], date, date) to authenticated;

commit;
