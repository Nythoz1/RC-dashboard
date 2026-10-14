-- 0015: engines on the timesheet.
--
-- A timesheet day can now list the engines the person worked on and for how
-- long (data.work: [{engineId, sku, name, hours, note}], see src/lib/timesheet.js).
--   ts_entry_stamp   counts a change to the engines as a change, so it is kept
--                    in the day's history like the times and the note
--   engine_picklist  the engines to pick from: id, stock #, name and stage of
--                    every engine that isn't sold. Employee logins can't read
--                    the inventory (0011), so this hands them only those four
--                    columns, nothing about cost or price. Any login with a
--                    known role may call it; anyone else gets no rows.
-- Only create-or-replace, revoke and grant, so it applies straight through the Supabase MCP.

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
          or coalesce(old.data ->> 'notes', '')  is distinct from coalesce(new.data ->> 'notes', '')
          or coalesce(old.data -> 'work', '[]'::jsonb) is distinct from coalesce(new.data -> 'work', '[]'::jsonb);
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
                      'notes',  coalesce(old.data -> 'notes', '""'::jsonb))
                      || case when jsonb_typeof(old.data -> 'work') = 'array' and jsonb_array_length(old.data -> 'work') > 0
                              then jsonb_build_object('work', old.data -> 'work') else '{}'::jsonb end)
                    else '[]'::jsonb end);
  return new;
end $$;

create or replace function public.engine_picklist()
returns table (id bigint, sku text, name text, status text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.sku, i.name, i.status
  from public.inventory i
  where (public.is_owner() or public.is_staff() or public.is_employee())
    and i.cat in ('Complete Engine', 'Core')
    and coalesce(i.status, '') <> 'sold'
  order by i.sku
$$;
revoke execute on function public.engine_picklist() from public, anon;
grant execute on function public.engine_picklist() to authenticated, service_role;
