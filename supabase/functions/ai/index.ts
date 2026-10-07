// ─────────────────────────────────────────────────────────────
// Rollin Coal — AI proxy Edge Function (Deno)
//
// Holds the Anthropic API key server-side and forwards prompts from the dashboard.
// Deploy:   supabase functions deploy ai --no-verify-jwt
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//           (optional) supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
//           SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
//
// Body: { prompt, system? } — `system` (optional, capped at 4,000 chars) is passed
// to Anthropic as the system prompt, e.g. the ECM review's "explain and flag
// only" rules.
//
// Auth: the caller must send a logged-in user's access token as the Bearer
// credential. We verify it with supabase.auth.getUser() and reject anything that
// is not a real user — including the shared anon key (which is itself a valid
// JWT, so gateway JWT verification would let it through). Because the function
// does its own check we deploy with --no-verify-jwt: that makes getUser() the
// real (stronger) gate AND lets the browser's credential-less CORS preflight
// (OPTIONS) through. This is what stops the function being an open relay.
// Only owner and office-staff logins (app_metadata.role "owner" / "staff",
// migrations 0011 and 0013) may use it: employee logins have no use for it, and a
// login with no role has no access at all. A prompt over 24,000 characters is
// refused, so nobody can run up the shop's Anthropic bill with one huge request.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY");
const MAX_PROMPT = 24000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // ── Require a real authenticated user (not the anon key) ──
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Missing authorization" }, 401);
  if (!SB_URL || !SB_ANON) return json({ error: "Auth not configured on server" }, 500);
  try {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return json({ error: "Not authenticated" }, 401);
    if (!["owner", "staff"].includes(data.user.app_metadata?.role)) return json({ error: "Not available for this login" }, 403);
  } catch (_e) {
    return json({ error: "Auth check failed" }, 401);
  }

  if (!KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  try {
    const { prompt, system } = await req.json();
    if (!prompt) return json({ error: "Missing prompt" }, 400);
    if (String(prompt).length > MAX_PROMPT) return json({ error: "That's too much text for the AI at once. Shorten it and try again." }, 413);
    const sys = typeof system === "string" && system.trim() ? system.trim().slice(0, 4000) : null;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        ...(sys ? { system: sys } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    if (!r.ok || d?.error) {
      const msg = d?.error?.message || d?.error?.type || `Anthropic API error (${r.status})`;
      console.error("Anthropic error:", r.status, JSON.stringify(d));
      return json({ error: msg }, 502);
    }
    const text = (d.content || []).map((b: { text?: string }) => b.text || "").join("\n").trim();
    if (!text) return json({ error: "The model returned an empty response." }, 502);
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
