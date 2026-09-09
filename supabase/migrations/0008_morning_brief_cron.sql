-- ─────────────────────────────────────────────────────────────
-- Morning Brief: autonomous daily email at 07:00 America/Edmonton.
-- pg_cron fires the 'brief' Edge Function every hour; the function applies the
-- real gate (7am local, once per day — DST-proof) and does the work.
-- Auth between cron and the function is a shared secret that lives ONLY in
-- Vault: generated here server-side (never committed, never an env var to
-- paste), read by the cron job for the request header and by the function via
-- the service-role-only RPC public.brief_secret().
-- ─────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- one-time random shared secret (no-op if it already exists)
select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'brief_secret',
  'Shared secret between pg_cron and the brief Edge Function')
where not exists (select 1 from vault.secrets where name = 'brief_secret');

-- service-role-only accessor the Edge Function uses to verify the header
create or replace function public.brief_secret() returns text
language sql security definer set search_path = public, vault as
$$ select decrypted_secret from vault.decrypted_secrets where name = 'brief_secret' limit 1 $$;
revoke all on function public.brief_secret() from public, anon, authenticated;
grant execute on function public.brief_secret() to service_role;

-- hourly trigger (idempotent re-schedule)
select cron.unschedule(jobid) from cron.job where jobname = 'rollin-coal-morning-brief';
select cron.schedule('rollin-coal-morning-brief', '0 * * * *', $job$
  select net.http_post(
    url     := 'https://ssvcappeflsgickdzmpw.supabase.co/functions/v1/brief',
    headers := jsonb_build_object('Content-Type', 'application/json',
                 'x-brief-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'brief_secret' limit 1)),
    body    := '{}'::jsonb
  );
$job$);
