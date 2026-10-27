-- Undo for 0017 (shops), only if the migration window goes wrong. Not a migration:
-- run it by hand (Supabase SQL Editor, or execute_sql) and only after asking the owner.
--
-- It puts the shop back on app_state without losing anything written since 0017:
--   1. copies Rollin Coal's tenant_state lists back into app_state,
--   2. opens app_state to owner / staff again (0013's rule),
--   3. puts merge_list and ts_autofill back to their 0014 / 0016 versions,
--   4. gives new rows Rollin Coal's id by default again and renames tenants to tenants_off, so the dashboard (src/lib/storage.js) finds
--      no shops and falls back to app_state by itself after a reload.
-- inventory, the timesheet tables and storage keep their tenant_id columns and
-- shop-checking policies: every Rollin Coal login still has a membership, so those
-- keep working unchanged. Redeploy the brief, team-logins and ai functions from the
-- commit before 0017 afterwards. Uses no statement the Supabase MCP holds.

begin;

-- 1. lists back into app_state (newer copy wins)
insert into public.app_state (key, value, updated_at)
select t.key, t.value, t.updated_at from public.tenant_state t
where t.tenant_id = 'c0a10000-0000-4000-8000-000000000001'
on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;

-- 2. app_state open to the shop's logins again (as 0013)
alter policy "app_state staff access" on public.app_state to authenticated
  using      ((select public.is_owner()) or (select public.is_staff()))
  with check ((select public.is_owner()) or (select public.is_staff()));

-- 3. the functions as they were (copied from 0014 and 0016)
create or replace function public.merge_list(p_key text, p_changes jsonb, p_full jsonb default null)
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  arr jsonb;
  ch jsonb;
  it jsonb;
  dels text[];
  idx int;
  ax int;
  bx int;
  has_after boolean;
  has_before boolean;
begin
  select value into arr from public.app_state where key = p_key for update;
  if not found then
    insert into public.app_state (key, value, updated_at) values (p_key, '[]'::jsonb, now()) on conflict (key) do nothing;
    select value into arr from public.app_state where key = p_key for update;
  end if;
  if jsonb_typeof(arr) is distinct from 'array' then arr := '[]'::jsonb; end if;

  if p_full is not null and jsonb_typeof(p_full) = 'array' and jsonb_array_length(arr) = 0 then
    arr := p_full;
  else
    -- records this device removed (records without an id are never touched)
    select coalesce(array_agg(x), '{}'::text[]) into dels
      from jsonb_array_elements_text(case when jsonb_typeof(p_changes -> 'del') = 'array' then p_changes -> 'del' else '[]'::jsonb end) as x;
    if cardinality(dels) > 0 then
      select coalesce(jsonb_agg(e order by o), '[]'::jsonb) into arr
        from jsonb_array_elements(arr) with ordinality as t(e, o)
        where not coalesce((e ->> 'id') = any (dels), false);
    end if;
    -- records added or changed, in the device's order
    for ch in select e from jsonb_array_elements(case when jsonb_typeof(p_changes -> 'put') = 'array' then p_changes -> 'put' else '[]'::jsonb end) with ordinality as t(e, o) order by o loop
      select (o - 1)::int into idx from jsonb_array_elements(arr) with ordinality as t(e, o) where (e ->> 'id') = (ch ->> 'id') order by o limit 1;
      if idx is not null then
        it := case when ch ? 'set' or ch ? 'unset' then public.rc_patch(arr -> idx, ch) else ch -> 'item' end;
        if it is not null then arr := jsonb_set(arr, array[idx::text], it); end if;
      elsif ch -> 'item' is null then
        continue;
      else
        -- a record the server doesn't have: last when nothing the device had comes after it; otherwise
        -- before the next record the device had, else after the one before it, else first if it was
        -- first on the device, else last (see lib/merge.js)
        has_after := coalesce(jsonb_typeof(ch -> 'after'), 'null') in ('string', 'number');
        has_before := coalesce(jsonb_typeof(ch -> 'before'), 'null') in ('string', 'number');
        bx := null; ax := null;
        if has_before then
          select (o - 1)::int into bx from jsonb_array_elements(arr) with ordinality as t(e, o) where (e ->> 'id') = (ch ->> 'before') order by o limit 1;
        end if;
        if bx is null and has_before and has_after then
          select (o - 1)::int into ax from jsonb_array_elements(arr) with ordinality as t(e, o) where (e ->> 'id') = (ch ->> 'after') order by o limit 1;
        end if;
        if bx is not null then arr := jsonb_insert(arr, array[bx::text], ch -> 'item');
        elsif ax is not null then arr := jsonb_insert(arr, array[ax::text], ch -> 'item', true);
        elsif not has_after and has_before then arr := jsonb_build_array(ch -> 'item') || arr;
        else arr := arr || jsonb_build_array(ch -> 'item');
        end if;
      end if;
    end loop;
  end if;

  update public.app_state set value = arr, updated_at = now() where key = p_key;
  return jsonb_array_length(arr);
end $$;

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
revoke execute on function public.ts_autofill(timestamptz) from public, anon, authenticated;
grant execute on function public.ts_autofill(timestamptz) to service_role;

-- new rows (the autofill runs with no login) belong to Rollin Coal again
alter table public.inventory alter column tenant_id set default 'c0a10000-0000-4000-8000-000000000001';
alter table public.timesheet_entries alter column tenant_id set default 'c0a10000-0000-4000-8000-000000000001';
alter table public.timesheet_approvals alter column tenant_id set default 'c0a10000-0000-4000-8000-000000000001';

-- 4. hide the shops from the dashboard; the file check reads the renamed table
alter table public.tenants rename to tenants_off;
create or replace function public.shop_path_ok(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(coalesce(p_name, ''), '/', 1) = coalesce(public.current_tenant()::text, '-')
      or exists (select 1 from public.tenants_off t
                 where t.id = public.current_tenant() and t.legacy_paths
                   and split_part(coalesce(p_name, ''), '/', 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-')
$$;

commit;
