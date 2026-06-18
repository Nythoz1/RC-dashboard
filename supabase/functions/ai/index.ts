// ─────────────────────────────────────────────────────────────
// Rollin Coal — AI proxy Edge Function (Deno)
//
// Holds the Anthropic API key server-side and forwards prompts from the dashboard.
// Deploy:   supabase functions deploy ai
//           (do NOT pass --no-verify-jwt — we require a real signed-in user)
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//           (optional) supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
//           SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
//
// Auth: the caller must send a logged-in user's access token as the Bearer
// credential. We verify it with supabase.auth.getUser() and reject anything that
// is not a real user — including the shared anon key (which is itself a valid
// JWT, so gateway-level JWT verification is not sufficient on its own). This is
// what stops the function from being an open relay on the Anthropic key.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY");

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
  } catch (_e) {
    return json({ error: "Auth check failed" }, 401);
  }

  if (!KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  try {
    const { prompt } = await req.json();
    if (!prompt) return json({ error: "Missing prompt" }, 400);
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
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    const text = (d.content || []).map((b: { text?: string }) => b.text || "").join("\n").trim();
    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
