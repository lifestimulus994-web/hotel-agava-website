# Booking notifications

Prepared for Hotel Agava. Adding this code to the repository does not enable delivery.
The database migration, Edge Function, secrets, verified sending domain and cron
must be configured together, then tested with a clearly labelled test booking.

## Intended delivery

- From: `Hotel Agava <reservations@bookings.hotelagava.ge>` (verified in Resend).
- Admin and Reply-To: `agavahoteltbilisi@gmail.com`.
- Guest: the email entered in the booking form. An omitted email creates only the admin job.
- Bilingual Georgian/English receipt says the request is received, awaiting hotel confirmation.
- Both messages use the saved total, including calendar prices and breakfast.
- Guest gets the private management link; admin gets the authenticated admin page.
- Only newly inserted `source=website` bookings are queued. No old-customer backfill.

## Deployment

1. Verify `bookings.hotelagava.ge` in Resend with the exact DKIM/SPF/MX records supplied
   for that subdomain. Do not replace the root domain's MX records or website records.
   Keep email click/open tracking disabled, especially for private management URLs.
2. Create a Resend **sending-only** key restricted to that domain. Put it directly in
   Supabase Edge Function Secrets as `RESEND_API_KEY`; never put it in site JS or Git.
3. Set `BOOKING_EMAIL_FROM` to the From value above. Set a random high-entropy
   `BOOKING_EMAIL_WORKER_SECRET` in Edge Function Secrets and the same value in
   Supabase Vault as `booking_email_worker_secret`.
4. Deploy `booking-email` with `verify_jwt=false`; the function enforces its own
   worker-secret authentication. Supabase supplies `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` inside the backend runtime.
5. Apply `sql/booking_email.sql` and then `sql/booking_email_schedule.sql` through the
   authenticated Supabase SQL Editor. The latter verifies the Vault secret exists.
6. Submit one labelled test booking with an owner-controlled guest address. Confirm
   the saved admin booking, both queue rows, both Resend delivery events and receipt
   in the recipient inbox(es). Cancel the test booking afterwards to release inventory.
7. Repeat the successful form submission in GA4 Realtime; `booking_submit` is a
   Key event. It is a reservation request, not a paid purchase.

## Reliability and monitoring

The booking transaction inserts email jobs; it does not call a network service.
A once-per-minute cron invocation leases up to five jobs with `FOR UPDATE SKIP LOCKED`.
Jobs are acknowledged separately, so failure for the guest does not erase the admin
result. Provider requests use a stable Resend idempotency key per job and stable
payload. A crash after provider acceptance is safe to retry within Resend's 24-hour
idempotency window. Automatic attempts stop after 10 tries or 22 hours; investigate
failed jobs instead of blindly creating a new idempotency key.

`accepted` means Resend accepted the request, **not** proof of inbox delivery.
Check Resend Emails for delivered/bounced results and the provider ID in
`booking_email_jobs`. Job rows are readable only by hotel admins; mutation RPCs
are service-role-only. Worker logs and stored errors exclude guest data/secrets.

Read-only operational check:

```sql
select kind,state,count(*) from public.booking_email_jobs group by kind,state;
select id,kind,state,attempts,provider_id,last_error,created_at
from public.booking_email_jobs
where state <> 'accepted' order by created_at desc limit 30;
```

To stop dispatch without affecting booking intake:
`select cron.unschedule(jobid) from cron.job where jobname='agava-booking-emails';`
Queued jobs remain for investigation. Do not delete booking records to stop email.
