// ─────────────────────────────────────────────────────────────
// Timesheet sync client — Team → Timesheets "Sync now" and the settings card.
// Calls the timesheet-sync Edge Function with the signed-in user's token (same
// auth pattern as lib/brief.js). The function reads the Google Sheets with the
// service account and writes the results itself; the dashboard then reloads
// the timesheet lists. The daily 6 AM sync is pg_cron's job (migration 0011).
// ─────────────────────────────────────────────────────────────
import { supabase } from "./storage";

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const FN_URL = BASE ? BASE + "/functions/v1/timesheet-sync" : "";
export const canSyncTimesheets = !!FN_URL && !!supabase;

async function call(body) {
  if (!canSyncTimesheets) return { error: "Google sync needs the cloud setup. Upload a CSV or Excel export instead." };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { error: "Not signed in" };
    const r = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(ANON ? { apikey: ANON } : {}), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 404) return { error: "The timesheet-sync function isn't deployed yet (SETUP.md, step 7)." };
    if (!r.ok) return { ...d, error: d.error || "HTTP " + r.status };
    return d;
  } catch (e) {
    return { error: "Couldn't reach the timesheet sync. Is the timesheet-sync function deployed? (" + (e && e.message ? e.message : e) + ")" };
  }
}

let info = null;
// {saEmail, configured}: the address to share each sheet with. Cached once it's known.
export async function timesheetInfo() {
  if (info) return info;
  const r = await call({ action: "info" });
  if (!r.error && r.saEmail) info = r;
  return r;
}
export async function syncTimesheets(sourceId) {
  const r = await call({ action: "sync", ...(sourceId != null ? { sourceId } : {}) });
  if (r && r.saEmail && !info) info = { ok: true, configured: true, saEmail: r.saEmail };
  return r;
}
