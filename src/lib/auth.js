// ─────────────────────────────────────────────────────────────
// Auth adapter for Rollin Coal dashboard
//
// Email/password auth via Supabase. Accounts are invite-only (created in the
// Supabase dashboard) — there is no sign-up flow here on purpose.
//
// When Supabase is NOT configured (no VITE_SUPABASE_* env), the app runs on
// localStorage and there is no shared backend to protect, so auth is a no-op:
// getSession() returns null but `usingCloud` is false, and the app skips the
// login gate entirely. The gate only engages against a real Supabase backend.
//
// Security note: the login gate in the UI is convenience only. The real
// enforcement is server-side — RLS scopes app_state to authenticated users
// (migrations/0002_auth.sql) and the AI Edge Function rejects non-users. A
// client that bypasses the UI still cannot read/write data without a session.
// ─────────────────────────────────────────────────────────────
import { supabase, usingCloud } from "./storage";

export { usingCloud };

// Current session, or null. Supabase persists the session in localStorage and
// auto-refreshes it, so this survives reloads.
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

// Email + password sign-in. Returns { session, error } — error is a string.
export async function signIn(email, password) {
  if (!supabase) return { session: null, error: "Auth is not configured." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data?.session || null, error: error ? error.message : null };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Subscribe to login/logout. Returns a subscription with .unsubscribe().
export function onAuthChange(cb) {
  if (!supabase) return { unsubscribe() {} };
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session || null));
  return data.subscription;
}
