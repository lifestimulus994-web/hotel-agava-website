-- ═══════════════════════════════════════════════════════════════════
-- ფასდაკლებული თარიღები — სტუმრისთვის საჩვენებლად
--
-- რატომ: sql/pricerange.sql-მა კალენდარში ფასის ჩამოწევა შესაძლებელი
-- გახადა და check_availability მართლა ნაკლებს ახდევინებს — მაგრამ
-- სტუმარი ამას ვერ ხედავდა. ოთახის ბარათზე ისევ ჩვეულებრივი ფასი
-- ეწერა და ფასდაკლება მხოლოდ მაშინ ამოხტებოდა, თუ ზუსტად იმ
-- თარიღებს აირჩევდა. ანუ ფასდაკლება არსებობდა და არავინ იცოდა.
--
-- პირდაპირ წაკითხვა არ გამოდგება: price_overrides-ზე anon-ს უფლება
-- არ აქვს (RLS), და მთელი ფასების კალენდრის გახსნაც არ გვინდა.
-- ამიტომ ერთი პატარა ფუნქცია, რომელიც მხოლოდ იმას აბრუნებს, რაც
-- ისედაც საჯაროა: რა ეღირება ოთახი და როდის.
--
-- ორი რამ განსაკუთრებით:
--   • მხოლოდ ნამდვილი ფასდაკლება — po.price < ჩვეულებრივი ფასი.
--     ახალი წლის ასაწეული ფასიც price_overrides-შია და ის
--     ფასდაკლებად არ უნდა გამოჩნდეს.
--   • ზედიზედ დღეები ერთ პერიოდად იკრიბება და მხოლოდ უახლოესი
--     ბრუნდება — ბარათზე ერთი თარიღი უნდა ეწეროს, არა ცხრა.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public_discounts()
returns table (
  room_slug    text,
  price_base   numeric,
  price_normal numeric,
  price_sale   numeric,
  date_from    date,
  date_to      date,
  nights       int
)
language sql
stable
security definer
set search_path = public
as $$
  /* რას იხდის სტუმარი ჩვეულებრივ: მუდმივი აქცია, თუ ჩართულია,
     სხვა შემთხვევაში ძირითადი ფასი */
  with eff as (
    select rt.id, rt.slug, rt.base_price,
           case
             when rt.sale_active
              and rt.sale_price is not null
              and rt.sale_price > 0
              and rt.sale_price < rt.base_price
             then rt.sale_price
             else rt.base_price
           end as normal_price
    from room_types rt
    where rt.visible
  ),
  /* ფასდაკლებული დღეები. grp — ზედიზედ დღეების ჯგუფი: თანმიმდევრულ
     თარიღებს რიგითობის გამოკლებისას ერთი და იგივე თარიღი რჩებათ.
     ფასიც ჯგუფის ნაწილია, ანუ ერთ პერიოდში ფასი არ იცვლება. */
  d as (
    select e.slug, e.base_price, e.normal_price, po.date, po.price,
           po.date - (row_number() over (
             partition by e.slug, po.price order by po.date
           ))::int as grp
    from eff e
    join price_overrides po on po.room_type_id = e.id
    where po.date >= (now() at time zone 'Asia/Tbilisi')::date
      and po.date <  (now() at time zone 'Asia/Tbilisi')::date + interval '120 days'
      -- Calendar offers take priority over a standing sale. Compare only
      -- with the base price so equal/higher-than-standing offers survive.
      and po.price > 0
      and po.price < e.base_price
  ),
  runs as (
    select slug, base_price, normal_price, price,
           min(date) as from_date,
           max(date) as to_date,
           count(*)::int as nights,
           row_number() over (partition by slug order by min(date)) as rn
    from d
    group by slug, base_price, normal_price, price, grp
  )
  select slug, base_price, normal_price, price, from_date, to_date, nights
  from runs
  where rn = 1;
$$;

-- საიტს სჭირდება, ამიტომ anon-საც — მაგრამ მხოლოდ ეს ფუნქცია,
-- და არა თავად ცხრილი
revoke all on function public_discounts() from public;
grant execute on function public_discounts() to anon, authenticated;
