-- ─────────────────────────────────────────────────────────────
-- 0011: Timesheets — an owner-only corner of app_state, and the daily sync.
--
-- 1. Owner role. Wages from the timesheets are stored under app_state keys that
--    start with 'rc:owner:' (today: rc:owner:tsPay). Staff logins keep full
--    access to every other key; only a login whose app_metadata says
--    role = "owner" can read or write rc:owner:*. app_metadata can only be set
--    by an admin (the SQL in SETUP.md), never by the user themselves.
--    Before the owner role is given to anyone, nobody sees wages in the app.
--    The Edge Function writes with the service role, which bypasses RLS.
--
-- 2. Daily sync at about 6 AM Mountain. pg_cron calls the timesheet-sync Edge
--    Function at 12:05 and 13:05 UTC; the function only works on the call that
--    lands in the 6 o'clock hour in America/Edmonton (06:05 MDT in summer,
--    06:05 MST in winter). Same shared Vault secret as the Morning Brief (0008),
--    created here too if it's missing so this file runs on its own.
--
-- Free tier: pg_cron, pg_net and Edge Functions are all on the free plan.
-- Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- ── 1. owner-only keys ──
create or replace function public.is_owner() returns boolean
language sql stable set search_path = '' as
$$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false) $$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated, service_role;

drop policy if exists "app_state authenticated full access" on public.app_state;
drop policy if exists "app_state staff access" on public.app_state;
drop policy if exists "app_state owner access" on public.app_state;

-- Every signed-in staff member: everything except the owner's keys.
create policy "app_state staff access"
  on public.app_state for all
  to authenticated
  using (key not like 'rc:owner:%')
  with check (key not like 'rc:owner:%');

-- The owner: everything, owner keys included.
create policy "app_state owner access"
  on public.app_state for all
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

-- ── 2. daily sync ──
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'brief_secret',
  'Shared secret between pg_cron and the Edge Functions (Morning Brief, timesheet sync)')
where not exists (select 1 from vault.secrets where name = 'brief_secret');

create or replace function public.brief_secret() returns text
language sql security definer set search_path = public, vault as
$$ select decrypted_secret from vault.decrypted_secrets where name = 'brief_secret' limit 1 $$;
revoke all on function public.brief_secret() from public, anon, authenticated;
grant execute on function public.brief_secret() to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'rollin-coal-timesheet-sync';
select cron.schedule('rollin-coal-timesheet-sync', '5 12,13 * * *', $job$
  select net.http_post(
    url     := 'https://ssvcappeflsgickdzmpw.supabase.co/functions/v1/timesheet-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
                 'x-brief-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'brief_secret' limit 1)),
    body    := '{"action":"sync"}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
