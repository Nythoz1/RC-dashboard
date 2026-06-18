// ─────────────────────────────────────────────────────────────
// AI client for Rollin Coal dashboard
//
// The original artifact called api.anthropic.com directly with no key — that only
// works inside the Claude artifact runtime. In a real app the Anthropic key must
// NEVER live in client-side code. Instead we call a Supabase Edge Function
// (supabase/functions/ai) that holds ANTHROPIC_API_KEY server-side and proxies
// the request.
//
// Set VITE_AI_FUNCTION_URL to your deployed function URL, e.g.
//   https://<project-ref>.functions.supabase.co/ai
// ─────────────────────────────────────────────────────────────
const FN_URL = import.meta.env.VITE_AI_FUNCTION_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function askClaude(prompt) {
  if (!FN_URL) {
    return "AI is not configured. Set VITE_AI_FUNCTION_URL to your deployed Supabase Edge Function and try again.";
  }
  try {
    const r = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ANON ? { Authorization: `Bearer ${ANON}`, apikey: ANON } : {}),
      },
      body: JSON.stringify({ prompt }),
    });
    const d = await r.json();
    if (d.error) return "AI error: " + d.error;
    return (d.text || "").trim() || "No response from AI.";
  } catch (e) {
    return "Error generating content. Check the AI function is deployed and reachable.";
  }
}
