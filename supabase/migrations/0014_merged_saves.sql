-- 0014: merged saves, so several people can work at once.
--
-- Until now a device saved a list by writing the whole list (app_state) or whole
-- rows (inventory), so two people saving close together overwrote each other: a
-- customer added in the office vanished when the owner's phone saved its own
-- copy, and a tab left open put an engine's old price back when it logged
-- labour. Now a device sends only what it changed since it last saved (the
-- format is described in src/lib/merge.js) and these functions apply it to
-- what's stored, holding the row lock while they do:
--   merge_list(key, changes, full)  one app_state list: records added, changed
--                                   down to the field inside nested objects,
--                                   removed; `full` is a list that was never
--                                   stored (a seed), written when nothing or an
--                                   empty list is there
--   merge_inventory(rows)           inventory rows: the same field patches,
--                                   with the typed columns kept in step
-- Both run as the caller (security invoker), so the row-level security from
-- 0013 still decides who may write: owner and staff, never an employee.
-- No DROP anywhere: the Supabase MCP holds any statement containing it.

-- A path given as a JSON array of keys → text[] (in order).
create or replace function public.rc_path(p jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(e order by o), '{}'::text[])
  from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) with ordinality as t(e, o)
$$;

-- Set the value at a path, making any missing objects on the way.
create or replace function public.rc_set_path(t jsonb, p text[], v jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when coalesce(array_length(p, 1), 0) = 0 then v
    else (case when jsonb_typeof(t) = 'object' then t else '{}'::jsonb end)
         || jsonb_build_object(p[1], public.rc_set_path(case when jsonb_typeof(t) = 'object' then t -> p[1] end, p[2:], v))
  end
$$;

-- A number from what the app stored (a number or a numeric string), else null,
-- like Number() in lib/storage.js's toRow.
create or replace function public.rc_num(v jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select case jsonb_typeof(v)
    when 'number' then (v #>> '{}')::numeric
    when 'string' then case when btrim(v #>> '{}') ~ '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then btrim(v #>> '{}')::numeric end
  end
$$;

-- One record changed by its field patches.
create or replace function public.rc_patch(it jsonb, ch jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare s jsonb;
begin
  for s in select e from jsonb_array_elements(coalesce(ch -> 'set', '[]'::jsonb)) with ordinality as t(e, o) order by o loop
    it := public.rc_set_path(it, public.rc_path(s -> 0), s -> 1);
  end loop;
  for s in select e from jsonb_array_elements(coalesce(ch -> 'unset', '[]'::jsonb)) with ordinality as t(e, o) order by o loop
    it := it #- public.rc_path(s);
  end loop;
  return it;
end $$;

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

revoke execute on function public.merge_list(text, jsonb, jsonb) from public, anon;
revoke execute on function public.merge_inventory(jsonb) from public, anon;
grant execute on function public.merge_list(text, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.merge_inventory(jsonb) to authenticated, service_role;
