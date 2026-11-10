-- New website bookings only. Existing bookings are deliberately not backfilled.
-- Run after schema.sql, manage.sql and security.sql, once the worker is configured.
begin;
create table if not exists public.booking_email_jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('guest','admin')),
  recipient text not null,
  payload jsonb not null,
  state text not null default 'pending' check (state in ('pending','sending','accepted','failed')),
  attempts int not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(booking_id,kind)
);
alter table public.booking_email_jobs enable row level security;
revoke all on public.booking_email_jobs from anon, authenticated;
grant select on public.booking_email_jobs to authenticated;
drop policy if exists booking_email_admin_read on public.booking_email_jobs;
create policy booking_email_admin_read on public.booking_email_jobs for select to authenticated using(public.is_admin());
create index if not exists booking_email_ready on public.booking_email_jobs(state,available_at);

create or replace function public.queue_booking_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare details jsonb; room text;
begin
  if new.source <> 'website' then return new; end if;
  select name into room from public.room_types where id=new.room_type_id;
  details := jsonb_build_object('booking_number',new.booking_number,'room_name',room,
    'check_in',new.check_in,'check_out',new.check_out,'guests',new.guests,
    'nights',new.check_out-new.check_in,'guest_name',new.guest_name,
    'guest_phone',new.guest_phone,'guest_email',new.guest_email,
    'total_price',new.total_price,'breakfast',new.breakfast,'status',new.status,
    'manage_token',new.manage_token);
  insert into public.booking_email_jobs(booking_id,kind,recipient,payload)
    values(new.id,'admin','agavahoteltbilisi@gmail.com',details);
  if nullif(trim(new.guest_email),'') is not null then
    insert into public.booking_email_jobs(booking_id,kind,recipient,payload)
      values(new.id,'guest',trim(new.guest_email),details);
  end if;
  return new;
end $$;
revoke all on function public.queue_booking_email() from public,anon,authenticated;
drop trigger if exists queue_booking_email on public.bookings;
create trigger queue_booking_email after insert on public.bookings for each row execute function public.queue_booking_email();

-- Only the server worker can lease/acknowledge jobs. Concurrent invocations cannot share a lease.
create or replace function public.claim_booking_emails() returns setof public.booking_email_jobs
language plpgsql security definer set search_path = public as $$
begin
  -- Resend keeps idempotency keys for 24h. Stop automatic retries before that expires.
  update public.booking_email_jobs set state='failed',last_error='retry_window_expired',updated_at=now()
    where state in ('pending','sending') and created_at < now()-interval '22 hours';
  update public.booking_email_jobs set state='failed',last_error='attempt_limit_reached',updated_at=now()
    where state='sending' and attempts>=10 and lease_until<now();
  return query
    with selected as (
      select id from public.booking_email_jobs
      where attempts<10 and created_at>now()-interval '22 hours' and
        ((state='pending' and available_at<=now()) or (state='sending' and lease_until<now()))
      order by created_at limit 5 for update skip locked
    )
    update public.booking_email_jobs j set state='sending',attempts=j.attempts+1,
      lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now()
    from selected where j.id=selected.id returning j.*;
end $$;
create or replace function public.finish_booking_email(p_id uuid,p_lease uuid,p_provider_id text,p_error text,p_retry boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.booking_email_jobs set
    state=case when p_provider_id is not null then 'accepted' when p_retry and attempts<10 then 'pending' else 'failed' end,
    provider_id=p_provider_id,last_error=left(p_error,120),lease_until=null,lease_token=null,
    available_at=now()+make_interval(secs=>least(3600,60*power(2,attempts)::int)),updated_at=now()
  where id=p_id and state='sending' and lease_token=p_lease;
end $$;
revoke all on function public.claim_booking_emails() from public,anon,authenticated;
revoke all on function public.finish_booking_email(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_booking_emails() to service_role;
grant execute on function public.finish_booking_email(uuid,uuid,text,text,boolean) to service_role;
notify pgrst,'reload schema';
commit;
