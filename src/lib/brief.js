// ─────────────────────────────────────────────────────────────
// Morning Brief client — "Send now" from the Overview.
// Calls the `brief` Edge Function with the signed-in user's token (same auth
// pattern as lib/ai.js); the function treats a user call as force=1 (any time
// of day, re-sends even if today's already went out). Scheduled sends are
// pg_cron's job — see supabase/migrations/0008_morning_brief_cron.sql.
// ─────────────────────────────────────────────────────────────
import { supabase } from "./storage";

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const FN_URL = import.meta.env.VITE_BRIEF_FUNCTION_URL || (BASE ? BASE + "/functions/v1/brief" : "");

export async function requestBriefNow() {
  if (!FN_URL || !supabase) return { error: "Cloud mode required" };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { error: "Not signed in" };
    const r = await fetch(FN_URL + "?force=1", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(ANON ? { apikey: ANON } : {}), Authorization: `Bearer ${token}` },
      body: "{}",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { error: d.error || ("HTTP " + r.status) };
    return d;
  } catch (e) {
    return { error: String(e) };
  }
}
