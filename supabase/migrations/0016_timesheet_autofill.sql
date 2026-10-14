-- 0016: timesheets fill in by themselves at the end of the day.
--
-- The crew's hours are known ahead: 8:00 AM to 4:00 PM Monday to Thursday,
-- 8:00 AM to 1:00 PM on Friday (Tsh.fullDay in src/lib/timesheet.js). Once that
-- day's shift is over in Medicine Hat, ts_autofill() writes those hours for every
-- active Team member whose Timesheet setting isn't "off" (employees.autoTs in
-- app_state rc:employees; missing means on). It never touches a day that already
-- has a row, so a day someone filled in, changed or cleared stays as it is, and
-- anyone can still change an auto-filled day afterwards (it's an ordinary row,
-- marked data.auto, stamped "shop" by ts_entry_stamp). Nothing is written ahead
-- of time. Weekends get nothing.
--
-- pg_cron runs it every hour (at :07); each run fills only today, and only after
-- the shift has ended, so the 4 PM to midnight runs give it several chances.
-- Only the database (cron) and the service role may call it.
-- Only create-or-replace, revoke, grant and cron.schedule, so it applies straight through the Supabase MCP.

create or replace function public.ts_autofill(p_now timestamptz default now())
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  loc    timestamp := p_now at time zone 'America/Edmonton';
  day    date := loc::date;
  dow    int := extract(isodow from loc)::int;
  fin    text := case when extract(isodow from loc)::int = 5 then '1:00 PM' else '4:00 PM' end;
  fin_t  time := case when extract(isodow from loc)::int = 5 then time '13:00' else time '16:00' end;
  n      int;
begin
  if dow > 5 or loc::time < fin_t then return 0; end if;
  insert into public.timesheet_entries (id, employee_id, work_date, data)
  select (e ->> 'id') || '|' || to_char(day, 'YYYY-MM-DD'), (e ->> 'id')::bigint, day,
         jsonb_build_object('start', '8:00 AM', 'finish', fin, 'notes', '', 'work', '[]'::jsonb, 'auto', true)
  from public.app_state s, jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) e
  where s.key = 'rc:employees'
    and coalesce(e ->> 'status', 'active') = 'active'
    and coalesce(e ->> 'autoTs', 'on') <> 'off'
    and (e ->> 'id') ~ '^[0-9]+$'
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.ts_autofill(timestamptz) from public, anon, authenticated;
grant execute on function public.ts_autofill(timestamptz) to service_role;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('rollin-coal-timesheet-autofill', '7 * * * *', 'select public.ts_autofill()');
  end if;
end $$;
