-- ─────────────────────────────────────────────────────────────
-- 0011: Timesheets in the app, and employee logins.
--
-- Each login's role lives in its app_metadata.role. Only an admin, or the owner
-- through the team-logins Edge Function, can set it; nobody can change their own.
--   "owner"     everything; approves pay periods; gives the employees their logins
--   "employee"  their own timesheet only (app_metadata.employeeId = their Team
--               member's id). No other shop data: not app_state, not the
--               inventory table, not the engine photo or ECM file buckets.
--   anything else (no role, or "staff"): the whole dashboard, as before.
--
-- Timesheet days and pay-period approvals get real tables so the database holds
-- the rules, whatever screen or script is used:
--   an employee sees only their own days and approvals, and can add or change a
--   day only when it's today or earlier in Medicine Hat and the day isn't inside
--   an approved pay period. They can delete only today's day; an earlier day is
--   cleared by saving it empty, so its history stays;
--   the owner can change any day up to today, and approves;
--   everyone else (office staff) can look but not change.
-- Every change keeps the previous version in the day's data.history, written by a
-- trigger, so a day changed after the fact always shows it.
--
-- Free tier: plain tables, policies and a trigger. Idempotent: safe to run again.
-- Run after 0010: it tightens the ecm-files bucket policies that 0010 creates.
-- ─────────────────────────────────────────────────────────────

-- ── who's asking ──
create or replace function public.is_owner() returns boolean
language sql stable set search_path = '' as
$$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false) $$;

create or replace function public.is_employee() returns boolean
language sql stable set search_path = '' as
$$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'employee', false) $$;

create or replace function public.my_employee_id() returns bigint
language sql stable set search_path = '' as
$$ select case when (auth.jwt() -> 'app_metadata' ->> 'employeeId') ~ '^[0-9]{1,18}$'
               then (auth.jwt() -> 'app_metadata' ->> 'employeeId')::bigint end $$;

-- Today in Medicine Hat, whatever time zone the server runs in.
create or replace function public.shop_today() returns date
language sql stable set search_path = '' as
$$ select (now() at time zone 'America/Edmonton')::date $$;

revoke all on function public.is_owner(), public.is_employee(), public.my_employee_id(), public.shop_today() from public, anon;
grant execute on function public.is_owner(), public.is_employee(), public.my_employee_id(), public.shop_today() to authenticated, service_role;

-- ── approvals: one row per employee and approved pay period ──
create table if not exists public.timesheet_approvals (
  id          bigint primary key,
  employee_id bigint not null,
  start_date  date   not null,
  end_date    date   not null,
  data        jsonb  not null default '{}'::jsonb,   -- the app's record, read back as is
  updated_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists timesheet_approvals_emp_idx on public.timesheet_approvals (employee_id, start_date, end_date);
alter table public.timesheet_approvals enable row level security;

-- Is this employee's day inside an approved pay period? Security definer, so the
-- answer is the same whoever asks. (0012 switches it to security invoker.)
create or replace function public.ts_locked(emp bigint, d date) returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.timesheet_approvals a
                  where a.employee_id = emp and d between a.start_date and a.end_date) $$;
revoke all on function public.ts_locked(bigint, date) from public, anon;
grant execute on function public.ts_locked(bigint, date) to authenticated, service_role;

-- ── days: one row per employee and day ──
create table if not exists public.timesheet_entries (
  id          text   primary key,                    -- "<employee id>|<YYYY-MM-DD>"
  employee_id bigint not null,
  work_date   date   not null,
  data        jsonb  not null default '{}'::jsonb,   -- start, finish, notes, history: what the app reads
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (employee_id, work_date)
);
alter table public.timesheet_entries enable row level security;

-- Stamps every write: the id from the employee and date, who and when, and on a
-- change the previous start / finish / notes appended to data.history. History is
-- rebuilt from the stored row, so a client can't drop or rewrite it.
create or replace function public.ts_entry_stamp() returns trigger
language plpgsql set search_path = '' as $$
declare
  who     text := coalesce(nullif(auth.jwt() ->> 'email', ''), 'shop');
  day     text := to_char(new.work_date, 'YYYY-MM-DD');
  changed boolean;
begin
  new.id := new.employee_id::text || '|' || day;
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object(
      'id', new.id, 'emp', new.employee_id, 'date', day,
      'createdAt', now(), 'updatedAt', now(), 'by', who, 'history', '[]'::jsonb);
    return new;
  end if;
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  changed := coalesce(old.data ->> 'start', '')  is distinct from coalesce(new.data ->> 'start', '')
          or coalesce(old.data ->> 'finish', '') is distinct from coalesce(new.data ->> 'finish', '')
          or coalesce(old.data ->> 'notes', '')  is distinct from coalesce(new.data ->> 'notes', '');
  new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object(
    'id', new.id, 'emp', new.employee_id, 'date', day,
    'createdAt', coalesce(old.data -> 'createdAt', to_jsonb(old.created_at)),
    'updatedAt', case when changed then to_jsonb(now()) else coalesce(old.data -> 'updatedAt', to_jsonb(old.updated_at)) end,
    'by',        case when changed then to_jsonb(who)   else coalesce(old.data -> 'by', to_jsonb(who)) end,
    'history',   coalesce(old.data -> 'history', '[]'::jsonb)
                 || case when changed then jsonb_build_array(jsonb_build_object(
                      'at',     coalesce(old.data -> 'updatedAt', to_jsonb(old.updated_at)),
                      'by',     coalesce(old.data -> 'by', '""'::jsonb),
                      'start',  coalesce(old.data -> 'start', '""'::jsonb),
                      'finish', coalesce(old.data -> 'finish', '""'::jsonb),
                      'notes',  coalesce(old.data -> 'notes', '""'::jsonb)))
                    else '[]'::jsonb end);
  return new;
end $$;
drop trigger if exists ts_entry_stamp on public.timesheet_entries;
create trigger ts_entry_stamp before insert or update on public.timesheet_entries
  for each row execute function public.ts_entry_stamp();

-- ── policies: days ──
drop policy if exists "timesheet days: staff read"      on public.timesheet_entries;
drop policy if exists "timesheet days: owner add"       on public.timesheet_entries;
drop policy if exists "timesheet days: owner change"    on public.timesheet_entries;
drop policy if exists "timesheet days: owner clear"     on public.timesheet_entries;
drop policy if exists "timesheet days: employee read"   on public.timesheet_entries;
drop policy if exists "timesheet days: employee add"    on public.timesheet_entries;
drop policy if exists "timesheet days: employee change" on public.timesheet_entries;
drop policy if exists "timesheet days: employee clear"  on public.timesheet_entries;

create policy "timesheet days: staff read" on public.timesheet_entries
  for select to authenticated using (not (select public.is_employee()));
create policy "timesheet days: owner add" on public.timesheet_entries
  for insert to authenticated
  with check ((select public.is_owner()) and work_date <= (select public.shop_today()));
create policy "timesheet days: owner change" on public.timesheet_entries
  for update to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()) and work_date <= (select public.shop_today()));
create policy "timesheet days: owner clear" on public.timesheet_entries
  for delete to authenticated using ((select public.is_owner()));

create policy "timesheet days: employee read" on public.timesheet_entries
  for select to authenticated
  using ((select public.is_employee()) and employee_id = (select public.my_employee_id()));
create policy "timesheet days: employee add" on public.timesheet_entries
  for insert to authenticated
  with check ((select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and not public.ts_locked(employee_id, work_date));
create policy "timesheet days: employee change" on public.timesheet_entries
  for update to authenticated
  using      ((select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and not public.ts_locked(employee_id, work_date))
  with check ((select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and not public.ts_locked(employee_id, work_date));
create policy "timesheet days: employee clear" on public.timesheet_entries
  for delete to authenticated
  using ((select public.is_employee()) and employee_id = (select public.my_employee_id())
         and work_date = (select public.shop_today()) and not public.ts_locked(employee_id, work_date));

-- ── policies: approvals ──
drop policy if exists "timesheet approvals: staff read"    on public.timesheet_approvals;
drop policy if exists "timesheet approvals: employee read" on public.timesheet_approvals;
drop policy if exists "timesheet approvals: owner"         on public.timesheet_approvals;
create policy "timesheet approvals: staff read" on public.timesheet_approvals
  for select to authenticated using (not (select public.is_employee()));
create policy "timesheet approvals: employee read" on public.timesheet_approvals
  for select to authenticated
  using ((select public.is_employee()) and employee_id = (select public.my_employee_id()));
create policy "timesheet approvals: owner" on public.timesheet_approvals
  for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

-- ── keep employee logins out of everything else ──
drop policy if exists "app_state authenticated full access" on public.app_state;
drop policy if exists "app_state staff access" on public.app_state;
drop policy if exists "app_state owner access" on public.app_state;
create policy "app_state staff access" on public.app_state
  for all to authenticated
  using (not (select public.is_employee())) with check (not (select public.is_employee()));

drop policy if exists "inventory authenticated full access" on public.inventory;
drop policy if exists "inventory staff access" on public.inventory;
create policy "inventory staff access" on public.inventory
  for all to authenticated
  using (not (select public.is_employee())) with check (not (select public.is_employee()));

-- engine photos (0004 / 0005) and ECM job files (0010)
drop policy if exists "engine_photos_read" on storage.objects;
create policy "engine_photos_read" on storage.objects
  for select to authenticated using (bucket_id = 'engine-photos' and not (select public.is_employee()));
drop policy if exists "engine_photos_insert" on storage.objects;
create policy "engine_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'engine-photos' and not (select public.is_employee()));
drop policy if exists "engine_photos_update" on storage.objects;
create policy "engine_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'engine-photos' and not (select public.is_employee()))
  with check (bucket_id = 'engine-photos' and not (select public.is_employee()));
drop policy if exists "engine_photos_delete" on storage.objects;
create policy "engine_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'engine-photos' and not (select public.is_employee()));

drop policy if exists "ecm_files_read" on storage.objects;
create policy "ecm_files_read" on storage.objects
  for select to authenticated using (bucket_id = 'ecm-files' and not (select public.is_employee()));
drop policy if exists "ecm_files_insert" on storage.objects;
create policy "ecm_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'ecm-files' and not (select public.is_employee()));
drop policy if exists "ecm_files_update" on storage.objects;
create policy "ecm_files_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ecm-files' and not (select public.is_employee()))
  with check (bucket_id = 'ecm-files' and not (select public.is_employee()));
drop policy if exists "ecm_files_delete" on storage.objects;
create policy "ecm_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'ecm-files' and not (select public.is_employee()));
