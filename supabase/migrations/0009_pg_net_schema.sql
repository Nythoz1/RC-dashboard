-- 0009: Security-advisor cleanup for 0008.
-- `create extension pg_net` without a schema registers the extension in `public`
-- (Supabase lint 0014 extension_in_public). Its objects always live in the `net`
-- schema, so this is catalog hygiene only — relocate it to `extensions` like every
-- other Supabase extension. pg_net is not relocatable on every version, so fall
-- back to drop + recreate (its request/response tables are transient; the cron
-- job text in 0008 and the Edge Function are unaffected). Idempotent.
do $$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
             where e.extname = 'pg_net' and n.nspname = 'public') then
    begin
      alter extension pg_net set schema extensions;
    exception when others then
      drop extension pg_net;
      create extension pg_net with schema extensions;
    end;
  end if;
end
$$;
