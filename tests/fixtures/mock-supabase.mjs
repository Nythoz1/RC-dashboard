// A small in-memory Supabase for tests: email/password auth, the app_state and
// inventory REST endpoints (with migration 0011's rule emulated: rc:owner:*
// keys only for a login whose app_metadata.role is "owner"), the brief_secret
// RPC, and Edge Functions you plug in. handle(Request) → Response, so it works
// as a fetch() stand-in in Node and behind a local HTTP server for the browser.
//
// Every request is logged as {method, path, as, keys}, so a test can prove a
// staff session never even asked for the owner's keys.

const b64url = (s) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, accept, accept-profile, content-profile, x-brief-secret, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "content-range, x-supabase-api-version",
};

export function mockSupabase({ users = [], anonKey = "anon-key", serviceKey = "service-key", secret = "cron-secret", functions = {} } = {}) {
  const db = new Map();              // app_state: key → value
  const inventory = new Map();       // inventory table: id → row
  const log = [];
  const tokens = new Map();          // access token → user
  const userJson = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: { provider: "email", providers: ["email"], ...(u.app_metadata || {}) }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
  function session(u) {
    const now = Math.floor(Date.now() / 1000);
    const access = [b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })), b64url(JSON.stringify({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600, app_metadata: { provider: "email", ...(u.app_metadata || {}) }, user_metadata: {}, session_id: "s-" + u.id + "-" + now + "-" + tokens.size })), b64url("sig-" + tokens.size)].join(".");
    tokens.set(access, u);
    return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "refresh-" + u.id + "-" + tokens.size, user: userJson(u) };
  }
  const who = (req) => {
    const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (t === serviceKey) return { as: "service" };
    const u = tokens.get(t);
    if (u) return { as: (u.app_metadata || {}).role === "owner" ? "owner" : "staff", user: u };
    return { as: "anon" };
  };
  const allowed = (w, key) => w.as === "service" || w.as === "owner" || (w.as === "staff" && !String(key).startsWith("rc:owner:"));
  const list = (v) => { const t = String(v || "").replace(/^in\.\(/, "").replace(/\)$/, ""); const out = []; let cur = "", q = false; for (const ch of t) { if (ch === '"') { q = !q; continue; } if (ch === "," && !q) { out.push(cur); cur = ""; continue; } cur += ch; } if (cur !== "" || t.endsWith(",")) out.push(cur); return out; };
  const reply = (status, body, extra = {}) => new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
  const rls = () => reply(403, { code: "42501", details: null, hint: null, message: 'new row violates row-level security policy for table "app_state"' });

  async function handle(req) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const w = who(req);
    const entry = { method: req.method, path: p + url.search, as: w.as, email: w.user ? w.user.email : null };
    log.push(entry);
    // ── auth ──
    if (p === "/auth/v1/token") {
      const body = await req.json().catch(() => ({}));
      if (url.searchParams.get("grant_type") === "password") {
        const u = users.find((x) => x.email === body.email && x.password === body.password);
        return u ? reply(200, session(u)) : reply(400, { error: "invalid_grant", error_description: "Invalid login credentials", code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const u = users.find((x) => String(body.refresh_token || "").startsWith("refresh-" + x.id + "-"));
        return u ? reply(200, session(u)) : reply(400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
      }
    }
    if (p === "/auth/v1/user") return w.user ? reply(200, userJson(w.user)) : reply(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    if (p === "/auth/v1/logout") return new Response(null, { status: 204, headers: CORS });
    // ── functions ──
    const fm = p.match(/^\/functions\/v1\/([\w-]+)$/);
    if (fm) return functions[fm[1]] ? functions[fm[1]](req) : reply(404, { error: "Function not found" });
    // ── rpc ──
    if (p === "/rest/v1/rpc/brief_secret") return w.as === "service" ? reply(200, JSON.stringify(secret)) : reply(403, { code: "42501", message: "permission denied for function brief_secret" });
    // ── app_state ──
    if (p === "/rest/v1/app_state") {
      if (w.as === "anon") return reply(401, { code: "42501", message: "permission denied" });
      if (req.method === "GET") {
        const eq = url.searchParams.get("key");
        const keys = !eq ? [...db.keys()] : eq.startsWith("in.") ? list(eq) : eq.startsWith("eq.") ? [eq.slice(3)] : [];
        entry.keys = keys;
        const cols = (url.searchParams.get("select") || "*").split(",");
        const rows = keys.filter((k) => db.has(k) && allowed(w, k)).map((k) => { const r = { key: k, value: db.get(k), updated_at: "2026-10-06T12:00:00Z" }; return cols.includes("*") ? r : Object.fromEntries(cols.map((c) => [c, r[c]])); });
        return reply(200, rows);
      }
      if (req.method === "POST") {
        const body = await req.json();
        const rows = Array.isArray(body) ? body : [body];
        entry.keys = rows.map((r) => r.key);
        if (rows.some((r) => !allowed(w, r.key))) return rls();
        rows.forEach((r) => db.set(r.key, r.value));
        return new Response(null, { status: 201, headers: CORS });
      }
      if (req.method === "DELETE") {
        const k = (url.searchParams.get("key") || "").replace(/^eq\./, "");
        entry.keys = [k];
        if (allowed(w, k)) db.delete(k);
        return new Response(null, { status: 204, headers: CORS });
      }
    }
    // ── inventory table ──
    if (p === "/rest/v1/inventory") {
      if (w.as === "anon") return reply(401, { code: "42501", message: "permission denied" });
      if (req.method === "GET") {
        const sel = url.searchParams.get("select") || "*";
        const rows = [...inventory.values()].sort((a, b) => a.id - b.id);
        return reply(200, sel === "data" ? rows.map((r) => ({ data: r.data })) : sel === "id" ? rows.map((r) => ({ id: r.id })) : rows);
      }
      if (req.method === "POST") { const body = await req.json(); (Array.isArray(body) ? body : [body]).forEach((r) => inventory.set(Number(r.id), r)); return new Response(null, { status: 201, headers: CORS }); }
      if (req.method === "DELETE") { list(url.searchParams.get("id")).forEach((id) => inventory.delete(Number(id))); return new Response(null, { status: 204, headers: CORS }); }
    }
    if (p.startsWith("/storage/v1/")) return reply(200, []);
    return reply(404, { message: "mock: no route for " + req.method + " " + p });
  }
  return { handle, db, inventory, log, session, users, anonKey, serviceKey, secret };
}
