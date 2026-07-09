-- ─────────────────────────────────────────────────────────────
-- Owner decision: no public surface at all — engines are posted on the
-- shop's own website, and the dashboard stays fully private. Drops the
-- anon-readable storefront view added in 0006 (public/stock.html removed
-- from the app in the same commit).
-- ─────────────────────────────────────────────────────────────

drop view if exists public.stock_public;
