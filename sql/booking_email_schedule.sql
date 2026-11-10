-- Enable only after deploying the worker and testing it.
-- Store BOOKING_EMAIL_WORKER_SECRET in Edge Function Secrets, and the same value
-- in Supabase Vault under booking_email_worker_secret. Never paste it into Git.
begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='booking_email_worker_secret') then
    raise exception 'Add booking_email_worker_secret to Vault before enabling email delivery';
  end if;
end $$;
select cron.unschedule(jobid) from cron.job where jobname='agava-booking-emails';
select cron.schedule('agava-booking-emails','* * * * *', $cron$
  select net.http_post(
    url := 'https://bkrkrwwyedtujkwlxkzp.supabase.co/functions/v1/booking-email',
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='booking_email_worker_secret' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);
commit;
