-- ─────────────────────────────────────────────────────────────
-- 0013: Only known roles get in, and tighter limits for employee logins.
--
-- Until now every signed-in login that wasn't an employee counted as office
-- staff, so a login with no role at all (one made straight in Supabase, or an
-- anonymous sign-in if that provider were ever switched on) could read and
-- write all shop data. Now only these get in:
--   "owner"     everything (unchanged)
--   "staff"     the whole dashboard (set from the Team tab, or with SQL)
--   "employee"  their own timesheet only (unchanged)
-- A login with no role gets nothing until the owner gives it access.
--
-- Employees:
--   can fill in or change a day only from the first of last month up to
--   today (no padding hours years back), and only outside approved periods;
--   never hard-delete a day: clearing one saves it empty, so its history and
--   any owner correction stay (the app does this since this change).
-- Approvals: one per person and pay period.
--
-- Run once, after 0012. Only ALTER statements touch existing policies, so it
-- is safe to run again; a later re-run of an OLDER migration (0001, 0004,
-- 0010) would loosen access again, so never re-run those.
-- ─────────────────────────────────────────────────────────────

-- ── who's asking ──
create or replace function public.is_staff() returns boolean
language sql stable set search_path = '' as
$$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff', false) $$;

-- The first day an employee may still fill in or change: the first of last
-- month in Medicine Hat.
create or replace function public.ts_floor() returns date
language sql stable set search_path = '' as
$$ select (date_trunc('month', (now() at time zone 'America/Edmonton')::date) - interval '1 month')::date $$;

revoke all on function public.is_staff(), public.ts_floor() from public, anon;
grant execute on function public.is_staff(), public.ts_floor() to authenticated, service_role;

-- ── shop data: owner and office staff only ──
alter policy "app_state staff access" on public.app_state to authenticated
  using      ((select public.is_owner()) or (select public.is_staff()))
  with check ((select public.is_owner()) or (select public.is_staff()));

alter policy "inventory staff access" on public.inventory to authenticated
  using      ((select public.is_owner()) or (select public.is_staff()))
  with check ((select public.is_owner()) or (select public.is_staff()));

alter policy "engine_photos_read" on storage.objects to authenticated
  using (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())));
alter policy "engine_photos_insert" on storage.objects to authenticated
  with check (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())));
alter policy "engine_photos_update" on storage.objects to authenticated
  using      (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())))
  with check (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())));
alter policy "engine_photos_delete" on storage.objects to authenticated
  using (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())));

alter policy "ecm_files_read" on storage.objects to authenticated
  using (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())));
alter policy "ecm_files_insert" on storage.objects to authenticated
  with check (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())));
alter policy "ecm_files_update" on storage.objects to authenticated
  using      (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())))
  with check (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())));
alter policy "ecm_files_delete" on storage.objects to authenticated
  using (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())));

-- ── timesheets ──
alter policy "timesheet days: staff read" on public.timesheet_entries to authenticated
  using ((select public.is_owner()) or (select public.is_staff()));
alter policy "timesheet approvals: staff read" on public.timesheet_approvals to authenticated
  using ((select public.is_owner()) or (select public.is_staff()));

alter policy "timesheet days: employee add" on public.timesheet_entries to authenticated
  with check ((select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and work_date >= (select public.ts_floor())
              and not public.ts_locked(employee_id, work_date));
alter policy "timesheet days: employee change" on public.timesheet_entries to authenticated
  using      ((select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and work_date >= (select public.ts_floor())
              and not public.ts_locked(employee_id, work_date))
  with check ((select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and work_date >= (select public.ts_floor())
              and not public.ts_locked(employee_id, work_date));
-- Employees never hard-delete a day; the app clears it by saving it empty.
alter policy "timesheet days: employee clear" on public.timesheet_entries to authenticated
  using (false);

-- ── one approval per person and pay period ──
create unique index if not exists timesheet_approvals_period_key
  on public.timesheet_approvals (employee_id, start_date, end_date);
