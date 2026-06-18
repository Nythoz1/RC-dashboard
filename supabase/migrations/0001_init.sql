-- ─────────────────────────────────────────────────────────────
-- Rollin Coal — initial schema
-- Document/key-value store that mirrors the dashboard's STORE_KEYS.
-- Each key ("rc:customers", "rc:inventory", ...) is one row holding a JSON array.
-- This is the fast, low-risk backend: the app works exactly as before, but data
-- now lives in Postgres (cloud, multi-device, backed up) instead of the browser.
-- ─────────────────────────────────────────────────────────────

create table if not exists app_state (
  key        text primary key,
  value      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

-- ⚠️ SINGLE-OPERATOR INTERNAL TOOL POLICY ⚠️
-- This allows anyone with the anon key full read/write. That is acceptable ONLY
-- for a private, internal shop tool that is not publicly linked.
-- BEFORE exposing this app publicly, replace this with Supabase Auth +
-- a policy scoped to authenticated users (see CLAUDE.md → "Auth & security").
drop policy if exists "app_state anon full access" on app_state;
create policy "app_state anon full access"
  on app_state for all
  using (true)
  with check (true);
