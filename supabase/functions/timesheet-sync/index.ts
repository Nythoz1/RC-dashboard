// ─────────────────────────────────────────────────────────────
// Rollin Coal — Timesheet sync Edge Function (Deno)
//
// Reads each employee's Google Sheets timesheet with a Google service account
// (read-only), recomputes the hours (Alberta overtime) and stores them for the
// dashboard's Team → Timesheets. The parsing, overtime math and merge rules live
// in ../_shared/timesheet.js, the same module the dashboard and tests use.
//
// Runs on "Sync now" (a signed-in user) and once a day at about 6 AM Mountain:
// pg_cron calls it at 12:05 and 13:05 UTC (migration 0011) and only the call
// that lands in the 6 o'clock hour in America/Edmonton does the work, so the
// time holds through daylight saving changes.
//
// Auth (any one): x-brief-secret header matching the Vault secret 'brief_secret'
//   (the same shared cron secret as the Morning Brief, read through the
//   service-role-only RPC public.brief_secret()); Bearer <service role key>; or a
//   Bearer user JWT verified with auth.getUser (the anon key is rejected).
//   Deploy with --no-verify-jwt: this check is the real gate.
// Secret: GOOGLE_SA_JSON = the whole service account key file (JSON). Never in
//   the repo or the browser. SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY are
//   injected automatically.
// Body: { action?: "sync" | "info", sourceId? } — "info" only returns the
//   service account email to share the sheets with.
// Writes app_state rc:timesheets, rc:timesheetSources and rc:owner:tsPay (the
//   wages; migration 0011 limits rc:owner:* to the owner login). The response
//   carries counts and errors only, never wages.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applySync, fetchSources, saEmailOf } from "../_shared/timesheet.js";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SA_JSON = Deno.env.get("GOOGLE_SA_JSON") || "";
const TZ = "America/Edmonton";
const KEYS = { rows: "rc:timesheets", sources: "rc:timesheetSources", periods: "rc:payPeriods", pay: "rc:owner:tsPay" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-brief-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const localHour = (d: Date) =>
  +new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d) % 24;

// deno-lint-ignore no-explicit-any
type Any = Record<string, any>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!SB_URL || !SB_SERVICE) return json({ error: "Server not configured" }, 500);
  const svc = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });

  // ── authorize: cron secret · service role · signed-in user ──
  let mode = "";
  const hdr = req.headers.get("x-brief-secret") || "";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (hdr) {
    try { const { data } = await svc.rpc("brief_secret"); if (data && hdr === data) mode = "cron"; } catch (_e) { /* vault not set up */ }
  }
  if (!mode && token) {
    if (token === SB_SERVICE) mode = "service";
    else if (SB_ANON) {
      try {
        const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data?.user) mode = "user";
      } catch (_e) { /* fall through */ }
    }
  }
  if (!mode) return json({ error: "Not authorized" }, 401);

  let body: Any = {};
  try { body = await req.json(); } catch (_e) { body = {}; }
  const saEmail = saEmailOf(SA_JSON);
  if (body.action === "info") return json({ ok: true, configured: !!saEmail, saEmail });

  const now = new Date();
  if (mode === "cron" && localHour(now) !== 6) return json({ skipped: "only runs in the 6 o'clock hour, " + TZ, localHour: localHour(now) });

  // ── which sheets ──
  const src = await svc.from("app_state").select("value").eq("key", KEYS.sources).maybeSingle();
  if (src.error) return json({ error: "app_state: " + src.error.message }, 500);
  const sources: Any[] = Array.isArray(src.data?.value) ? src.data.value : [];
  if (!sources.length) return json({ ok: true, saEmail, results: [], note: "No timesheets connected yet." });

  // ── Google first (the slow part) ──
  const fetched = await fetchSources(sources, { saJson: SA_JSON, now, only: body.sourceId ?? null });

  // ── then read the stored lists fresh, fold in, write back ──
  const cur = await svc.from("app_state").select("key,value").in("key", Object.values(KEYS));
  if (cur.error) return json({ error: "app_state: " + cur.error.message }, 500);
  const by = new Map((cur.data || []).map((r: Any) => [r.key, r.value]));
  const list = (k: string) => (Array.isArray(by.get(k)) ? by.get(k) : []);
  const at = new Date().toISOString();
  const out = applySync({ sources: list(KEYS.sources), timesheets: list(KEYS.rows), payPeriods: list(KEYS.periods), tsPay: list(KEYS.pay) }, fetched, { now: at });
  const up = await svc.from("app_state").upsert([
    { key: KEYS.rows, value: out.timesheets, updated_at: at },
    { key: KEYS.sources, value: out.sources, updated_at: at },
    { key: KEYS.pay, value: out.tsPay, updated_at: at },
  ]);
  if (up.error) return json({ error: "Couldn't save the timesheets: " + up.error.message }, 500);
  return json({ ok: true, at, by: mode, saEmail: fetched.saEmail || saEmail, error: fetched.error || null, results: out.results });
});
