// ─────────────────────────────────────────────────────────────
// Rollin Coal — AI proxy Edge Function (Deno)
//
// Holds the Anthropic API key server-side and forwards prompts from the dashboard.
// Deploy:   supabase functions deploy ai --no-verify-jwt
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//           (optional) supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
// ─────────────────────────────────────────────────────────────
const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
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
    const text = (d.content || []).map((b) => b.text || "").join("\n").trim();
    return new Response(JSON.stringify({ text }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
