-- ─────────────────────────────────────────────────────────────
-- Public storefront view for rollin-coal.ca (served by public/stock.html).
-- Exposes ONLY buyer-safe fields for ONLY available engines: no costs, no
-- parts log, no labor, no notes, no lifecycle internals. The view runs with
-- owner rights (not security_invoker), so anon reads pass through it while
-- the base inventory table stays RLS-locked to authenticated staff
-- (verified: anon sees 0 rows from inventory/app_state directly).
-- ─────────────────────────────────────────────────────────────

create or replace view public.stock_public as
select
  id,
  data->>'sku'                  as sku,
  data->>'name'                 as name,
  nullif(data->>'serial','')    as esn,
  nullif(data->>'year','')      as year,
  nullif(data->>'ratedHp','')   as rated_hp,
  nullif(data->>'oilCap','')    as oil_cap,
  nullif(data->>'condition','') as condition,
  price,
  nullif(data->>'photo','')     as photo
from public.inventory
where cat in ('Complete Engine','Core') and status = 'available';

revoke all on public.stock_public from anon, authenticated;
grant select on public.stock_public to anon, authenticated;
