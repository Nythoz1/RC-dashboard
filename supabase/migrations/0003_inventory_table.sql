-- ─────────────────────────────────────────────────────────────
-- Rollin Coal — P4 relational migration, phase 1: inventory
--
-- First entity to graduate from the app_state JSON blob to its own table.
-- Pattern: `data` jsonb holds the exact object the app reads back (perfect
-- round-trip, zero behaviour change), plus projected typed columns for SQL and
-- a real `id` PK that future child tables will reference via engine_id
-- (cores, invoices, warranties, shipments). lib/storage.js routes the
-- "rc:inventory" key to this table; every other list still lives in app_state.
--
-- Apply after 0001 and 0002.
-- ─────────────────────────────────────────────────────────────
create table if not exists inventory (
  id          bigint primary key,
  sku         text,
  name        text,
  cat         text,
  status      text,
  price       numeric,
  cost        numeric,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists inventory_status_idx on inventory(status);

alter table inventory enable row level security;
drop policy if exists "inventory authenticated full access" on inventory;
create policy "inventory authenticated full access"
  on inventory for all to authenticated using (true) with check (true);

-- One-time data migration: explode the app_state blob into rows.
insert into inventory (id, sku, name, cat, status, price, cost, data)
select (e->>'id')::bigint, e->>'sku', e->>'name', e->>'cat', e->>'status',
       nullif(e->>'price','')::numeric, nullif(e->>'cost','')::numeric, e
from app_state, jsonb_array_elements(value) e
where key = 'rc:inventory'
on conflict (id) do nothing;

-- Retire the old blob out of the live keyspace (keep as a one-time backup).
update app_state set key = 'rc:_bak:inventory_0003', updated_at = now() where key = 'rc:inventory';
