-- ─────────────────────────────────────────────────────────────
-- Rollin Coal — auth hardening (P0)
--
-- Replaces the open "anon full access" policy from 0001 with one scoped to
-- AUTHENTICATED users only. Shared-workspace model: any logged-in staff member
-- can read/write ALL shop data (inventory, customers, invoices, ...). There is
-- no per-user data isolation by design — it's one shop, one shared dataset.
--
-- After running this migration you MUST also:
--   1. Disable public sign-ups (invite-only):
--      Dashboard → Authentication → Providers → Email → turn OFF
--      "Allow new users to sign up". Create staff accounts under
--      Authentication → Users → Add user.
--   2. Redeploy the AI function so it enforces a logged-in user:
--      supabase functions deploy ai          (NOTE: no --no-verify-jwt)
-- ─────────────────────────────────────────────────────────────

-- RLS is already enabled in 0001; this just swaps the policy.
-- Remove the old open policy (full read/write for the anon key).
drop policy if exists "app_state anon full access" on app_state;

-- Shared workspace: any authenticated user has full access. The anon role now
-- has no policy at all, so unauthenticated requests are denied by RLS.
drop policy if exists "app_state authenticated full access" on app_state;
create policy "app_state authenticated full access"
  on app_state for all
  to authenticated
  using (true)
  with check (true);
