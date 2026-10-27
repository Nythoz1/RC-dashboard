-- 0017: many shops on one system (Phase 1, multi-tenancy).
--
-- Until now there was one shop: every owner / staff login saw all of app_state,
-- inventory and the timesheets. Now each row belongs to a shop (a tenant), and
-- a login sees only its own shop's rows, whatever the browser asks for.
--
--   tenants        one row per shop: name, short code, province, packs (which
--                  industry features it has), plan, time zone, profile (phone,
--                  address, site, tagline). Rollin Coal is the first, with a
--                  fixed id so this file can fill it in.
--   memberships    which shop a login belongs to, and as what. One shop per
--                  login for now (user_id is the key; a switcher can come later).
--                  Written only by the service role (the team-logins and shops
--                  Edge Functions), read by the login itself and its shop's owner.
--   current_tenant()  the caller's shop, from memberships (never from what the
--                  client sends). Every policy below checks tenant_id against it.
--   tenant_state   replaces app_state: the same key / value lists, keyed by
--                  (tenant_id, key). Rollin Coal's app_state rows are copied in;
--                  app_state is then closed to clients (kept for rollback).
--   tenant_id      on inventory, timesheet_entries and timesheet_approvals:
--                  existing rows get Rollin Coal, new rows default to the
--                  caller's shop.
--   storage        new files go under "<tenant id>/…"; Rollin Coal's existing
--                  files keep their old paths (tenants.legacy_paths) until moved.
--   functions      merge_list, merge_inventory, engine_picklist and ts_autofill
--                  work per shop; update_shop_profile lets an owner edit theirs.
--
-- Roles are unchanged: owner / staff / employee still come from the login's
-- app_metadata (set by an admin or team-logins), and now also need a membership.
-- Only create, create-or-replace, alter, insert and update below, so it goes
-- straight through the Supabase MCP. Run once, after 0016.

-- ── shops ──
create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code          text not null default '',
  province      text not null default 'AB',
  timezone      text not null default 'America/Edmonton',
  packs         text[] not null default '{diesel}',
  plan          text not null default 'pilot',
  profile       jsonb not null default '{}'::jsonb,
  legacy_paths  boolean not null default false,
  created_at    timestamptz not null default now()
);
alter table public.tenants enable row level security;

create table if not exists public.memberships (
  user_id      uuid primary key,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  role         text not null check (role in ('owner', 'staff', 'employee')),
  employee_id  bigint,
  name         text not null default '',
  email        text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists memberships_tenant_idx on public.memberships (tenant_id);
alter table public.memberships enable row level security;

-- The caller's shop. security definer so it reads memberships whatever their policies say.
create or replace function public.current_tenant() returns uuid
language sql stable security definer set search_path = '' as
$$ select m.tenant_id from public.memberships m where m.user_id = auth.uid() $$;
revoke all on function public.current_tenant() from public, anon;
grant execute on function public.current_tenant() to authenticated, service_role;

-- Rollin Coal, the first shop.
insert into public.tenants (id, name, code, province, timezone, packs, plan, legacy_paths, profile)
values ('c0a10000-0000-4000-8000-000000000001', 'Rollin Coal', 'RC', 'AB', 'America/Edmonton', '{diesel}', 'founder', true,
        jsonb_build_object('tagline', 'Canada''s Diesel Engine Specialists', 'phone', '1-587-863-0505',
                           'address', '2040 11th Ave NW, Medicine Hat, AB', 'site', 'rollin-coal.ca', 'email', 'wayne@rollin-coal.ca'))
on conflict (id) do nothing;

-- Every login with a role today joins Rollin Coal.
do $$ begin
  if to_regclass('auth.users') is not null then
    insert into public.memberships (user_id, tenant_id, role, employee_id, name, email)
    select u.id, 'c0a10000-0000-4000-8000-000000000001', u.raw_app_meta_data ->> 'role',
           case when (u.raw_app_meta_data ->> 'employeeId') ~ '^[0-9]+$' then (u.raw_app_meta_data ->> 'employeeId')::bigint end,
           coalesce(u.raw_app_meta_data ->> 'name', ''), coalesce(u.email, '')
    from auth.users u
    where u.raw_app_meta_data ->> 'role' in ('owner', 'staff', 'employee')
    on conflict (user_id) do nothing;
  end if;
end $$;

-- ── who may see what in those two tables ──
create policy "tenants: members read their shop" on public.tenants
  for select to authenticated using (id = (select public.current_tenant()));
create policy "memberships: read own" on public.memberships
  for select to authenticated using (user_id = auth.uid());
create policy "memberships: owner reads the shop" on public.memberships
  for select to authenticated using ((select public.is_owner()) and tenant_id = (select public.current_tenant()));
grant select on public.tenants, public.memberships to authenticated;

-- An owner edits their shop's name and profile (not its plan, packs or id).
create or replace function public.update_shop_profile(p_name text, p_profile jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() or public.current_tenant() is null then
    raise exception 'Only the shop owner can change the shop profile' using errcode = '42501';
  end if;
  update public.tenants set
    name = coalesce(nullif(btrim(p_name), ''), name),
    profile = case when jsonb_typeof(p_profile) = 'object' then profile || p_profile else profile end
  where id = public.current_tenant();
end $$;
revoke all on function public.update_shop_profile(text, jsonb) from public, anon;
grant execute on function public.update_shop_profile(text, jsonb) to authenticated;

-- ── shop data: tenant_state replaces app_state ──
create table if not exists public.tenant_state (
  tenant_id   uuid not null default public.current_tenant() references public.tenants(id) on delete cascade,
  key         text not null,
  value       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (tenant_id, key)
);
alter table public.tenant_state enable row level security;
create policy "tenant_state: shop staff" on public.tenant_state
  for all to authenticated
  using      (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())))
  with check (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())));
grant select, insert, update, delete on public.tenant_state to authenticated;

insert into public.tenant_state (tenant_id, key, value, updated_at)
select 'c0a10000-0000-4000-8000-000000000001', a.key, a.value, coalesce(a.updated_at, now())
from public.app_state a
on conflict (tenant_id, key) do nothing;

-- The old table stays for rollback, closed to every login (a browser still on the
-- old app gets "Not saved yet" and reloads, instead of writing where nobody reads).
alter policy "app_state staff access" on public.app_state to authenticated using (false) with check (false);

-- ── a shop id on every row of the real tables ──
-- Existing rows get Rollin Coal through the column default (no trigger runs);
-- the default then becomes the caller's shop.
alter table public.inventory add column if not exists tenant_id uuid not null default 'c0a10000-0000-4000-8000-000000000001' references public.tenants(id);
alter table public.inventory alter column tenant_id set default public.current_tenant();
create index if not exists inventory_tenant_idx on public.inventory (tenant_id);

alter table public.timesheet_entries add column if not exists tenant_id uuid not null default 'c0a10000-0000-4000-8000-000000000001' references public.tenants(id);
alter table public.timesheet_entries alter column tenant_id set default public.current_tenant();
create index if not exists timesheet_entries_tenant_idx on public.timesheet_entries (tenant_id);

alter table public.timesheet_approvals add column if not exists tenant_id uuid not null default 'c0a10000-0000-4000-8000-000000000001' references public.tenants(id);
alter table public.timesheet_approvals alter column tenant_id set default public.current_tenant();
create index if not exists timesheet_approvals_tenant_idx on public.timesheet_approvals (tenant_id);

-- ── every policy also checks the shop ──
alter policy "inventory staff access" on public.inventory to authenticated
  using      (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())))
  with check (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())));

alter policy "timesheet days: staff read" on public.timesheet_entries to authenticated
  using (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())));
alter policy "timesheet days: owner add" on public.timesheet_entries to authenticated
  with check (tenant_id = (select public.current_tenant()) and (select public.is_owner()) and work_date <= (select public.shop_today()));
alter policy "timesheet days: owner change" on public.timesheet_entries to authenticated
  using      (tenant_id = (select public.current_tenant()) and (select public.is_owner()))
  with check (tenant_id = (select public.current_tenant()) and (select public.is_owner()) and work_date <= (select public.shop_today()));
alter policy "timesheet days: owner clear" on public.timesheet_entries to authenticated
  using (tenant_id = (select public.current_tenant()) and (select public.is_owner()));
alter policy "timesheet days: employee read" on public.timesheet_entries to authenticated
  using (tenant_id = (select public.current_tenant()) and (select public.is_employee()) and employee_id = (select public.my_employee_id()));
alter policy "timesheet days: employee add" on public.timesheet_entries to authenticated
  with check (tenant_id = (select public.current_tenant()) and (select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and work_date >= (select public.ts_floor())
              and not public.ts_locked(employee_id, work_date));
alter policy "timesheet days: employee change" on public.timesheet_entries to authenticated
  using      (tenant_id = (select public.current_tenant()) and (select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and work_date >= (select public.ts_floor())
              and not public.ts_locked(employee_id, work_date))
  with check (tenant_id = (select public.current_tenant()) and (select public.is_employee()) and employee_id = (select public.my_employee_id())
              and work_date <= (select public.shop_today()) and work_date >= (select public.ts_floor())
              and not public.ts_locked(employee_id, work_date));

alter policy "timesheet approvals: staff read" on public.timesheet_approvals to authenticated
  using (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())));
alter policy "timesheet approvals: employee read" on public.timesheet_approvals to authenticated
  using (tenant_id = (select public.current_tenant()) and (select public.is_employee()) and employee_id = (select public.my_employee_id()));
alter policy "timesheet approvals: owner" on public.timesheet_approvals to authenticated
  using      (tenant_id = (select public.current_tenant()) and (select public.is_owner()))
  with check (tenant_id = (select public.current_tenant()) and (select public.is_owner()));

-- ── files: "<tenant id>/…", or Rollin Coal's older paths ──
create or replace function public.shop_path_ok(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(coalesce(p_name, ''), '/', 1) = coalesce(public.current_tenant()::text, '-')
      or exists (select 1 from public.tenants t
                 where t.id = public.current_tenant() and t.legacy_paths
                   and split_part(coalesce(p_name, ''), '/', 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-')
$$;
revoke all on function public.shop_path_ok(text) from public, anon;
grant execute on function public.shop_path_ok(text) to authenticated;

alter policy "engine_photos_read" on storage.objects to authenticated
  using (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "engine_photos_insert" on storage.objects to authenticated
  with check (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "engine_photos_update" on storage.objects to authenticated
  using      (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name))
  with check (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "engine_photos_delete" on storage.objects to authenticated
  using (bucket_id = 'engine-photos' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "ecm_files_read" on storage.objects to authenticated
  using (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "ecm_files_insert" on storage.objects to authenticated
  with check (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "ecm_files_update" on storage.objects to authenticated
  using      (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name))
  with check (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));
alter policy "ecm_files_delete" on storage.objects to authenticated
  using (bucket_id = 'ecm-files' and ((select public.is_owner()) or (select public.is_staff())) and public.shop_path_ok(name));

-- ── functions, per shop ──
-- merge_list: as 0014, on tenant_state, inside the caller's shop.
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
  shop uuid := public.current_tenant();
begin
  if shop is null then raise exception 'This login isn''t part of a shop' using errcode = '42501'; end if;
  select value into arr from public.tenant_state where tenant_id = shop and key = p_key for update;
  if not found then
    insert into public.tenant_state (tenant_id, key, value, updated_at) values (shop, p_key, '[]'::jsonb, now()) on conflict (tenant_id, key) do nothing;
    select value into arr from public.tenant_state where tenant_id = shop and key = p_key for update;
  end if;
  if jsonb_typeof(arr) is distinct from 'array' then arr := '[]'::jsonb; end if;

  if p_full is not null and jsonb_typeof(p_full) = 'array' and jsonb_array_length(arr) = 0 then
    arr := p_full;
  else
    select coalesce(array_agg(x), '{}'::text[]) into dels
      from jsonb_array_elements_text(case when jsonb_typeof(p_changes -> 'del') = 'array' then p_changes -> 'del' else '[]'::jsonb end) as x;
    if cardinality(dels) > 0 then
      select coalesce(jsonb_agg(e order by o), '[]'::jsonb) into arr
        from jsonb_array_elements(arr) with ordinality as t(e, o)
        where not coalesce((e ->> 'id') = any (dels), false);
    end if;
    for ch in select e from jsonb_array_elements(case when jsonb_typeof(p_changes -> 'put') = 'array' then p_changes -> 'put' else '[]'::jsonb end) with ordinality as t(e, o) order by o loop
      select (o - 1)::int into idx from jsonb_array_elements(arr) with ordinality as t(e, o) where (e ->> 'id') = (ch ->> 'id') order by o limit 1;
      if idx is not null then
        it := case when ch ? 'set' or ch ? 'unset' then public.rc_patch(arr -> idx, ch) else ch -> 'item' end;
        if it is not null then arr := jsonb_set(arr, array[idx::text], it); end if;
      elsif ch -> 'item' is null then
        continue;
      else
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

  update public.tenant_state set value = arr, updated_at = now() where tenant_id = shop and key = p_key;
  return jsonb_array_length(arr);
end $$;

-- merge_inventory: as 0014; a new row lands in the caller's shop (the column default),
-- and a row of another shop can't be reached (its policy refuses the update).
create or replace function public.merge_inventory(p_rows jsonb)
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  r jsonb;
  cur jsonb;
  v jsonb;
  rid bigint;
  n int := 0;
begin
  for r in select e from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end) with ordinality as t(e, o) order by o loop
    rid := (r ->> 'id')::bigint;
    v := null;
    if r ? 'set' or r ? 'unset' then
      select data into cur from public.inventory where id = rid for update;
      if found then v := public.rc_patch(cur, r); end if;
    end if;
    if v is null then v := r -> 'item'; end if;
    if jsonb_typeof(v) is distinct from 'object' then continue; end if;
    v := v || jsonb_build_object('id', rid);
    insert into public.inventory (id, sku, name, cat, status, price, cost, data, updated_at)
      values (rid, v ->> 'sku', v ->> 'name', v ->> 'cat', v ->> 'status', public.rc_num(v -> 'price'), public.rc_num(v -> 'cost'), v, now())
      on conflict (id) do update set sku = excluded.sku, name = excluded.name, cat = excluded.cat, status = excluded.status,
        price = excluded.price, cost = excluded.cost, data = excluded.data, updated_at = excluded.updated_at;
    n := n + 1;
  end loop;
  return n;
end $$;

-- engine_picklist: only the caller's shop's engines.
create or replace function public.engine_picklist()
returns table (id bigint, sku text, name text, status text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.sku, i.name, i.status
  from public.inventory i
  where (public.is_owner() or public.is_staff() or public.is_employee())
    and i.tenant_id = public.current_tenant()
    and i.cat in ('Complete Engine', 'Core')
    and coalesce(i.status, '') <> 'sold'
  order by i.sku
$$;

-- ts_autofill: every shop's Team list, each shop in its own time zone.
create or replace function public.ts_autofill(p_now timestamptz default now())
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  t record;
  loc timestamp;
  day date;
  dow int;
  fin text;
  fin_t time;
  k int;
  n int := 0;
begin
  for t in select s.tenant_id, s.value, coalesce(tn.timezone, 'America/Edmonton') as tz
           from public.tenant_state s join public.tenants tn on tn.id = s.tenant_id
           where s.key = 'rc:employees' loop
    loc := p_now at time zone t.tz;
    day := loc::date;
    dow := extract(isodow from loc)::int;
    fin := case when dow = 5 then '1:00 PM' else '4:00 PM' end;
    fin_t := case when dow = 5 then time '13:00' else time '16:00' end;
    continue when dow > 5 or loc::time < fin_t;
    insert into public.timesheet_entries (id, tenant_id, employee_id, work_date, data)
    select (e ->> 'id') || '|' || to_char(day, 'YYYY-MM-DD'), t.tenant_id, (e ->> 'id')::bigint, day,
           jsonb_build_object('start', '8:00 AM', 'finish', fin, 'notes', '', 'work', '[]'::jsonb, 'auto', true)
    from jsonb_array_elements(case when jsonb_typeof(t.value) = 'array' then t.value else '[]'::jsonb end) e
    where coalesce(e ->> 'status', 'active') = 'active'
      and coalesce(e ->> 'autoTs', 'on') <> 'off'
      and (e ->> 'id') ~ '^[0-9]+$'
    on conflict do nothing;
    get diagnostics k = row_count;
    n := n + k;
  end loop;
  return n;
end $$;
revoke execute on function public.ts_autofill(timestamptz) from public, anon, authenticated;
grant execute on function public.ts_autofill(timestamptz) to service_role;
