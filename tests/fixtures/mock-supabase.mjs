// A small Supabase for tests and the smoke run. Auth works like GoTrue (password
// and refresh sign-in, /user, logout, and the admin endpoints the team-logins
// function uses); data goes to a real Postgres (PGlite with the repo's
// migrations, see pg.mjs), so the actual row-level security policies and
// triggers answer every request, run as the caller's login. Edge Functions are
// plugged in as handlers. handle(Request) → Response works as a fetch() stand-in
// in Node and behind a local HTTP server for the browser.
// Every request is logged as {method, path, as, email}.
import { randomUUID } from "node:crypto";
import { freshDb, asLogin } from "./pg.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, accept, accept-profile, content-profile, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "content-range, x-total-count, x-supabase-api-version",
};
const TABLES = { app_state: "key", inventory: "id", timesheet_entries: "id", timesheet_approvals: "id" };
const COL = /^[a-z_][a-z0-9_]*$/;
const b64url = (s) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function mockSupabase({ users = [], anonKey = "anon-key", serviceKey = "service-key", functions = {} } = {}) {
  const db = await freshDb();
  const log = [];
  const tokens = new Map();      // access token → user id
  const byId = (id) => users.find((u) => u.id === id);
  users.forEach((u) => { u.id = u.id || randomUUID(); u.created_at = u.created_at || new Date().toISOString(); });
  const userJson = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: { provider: "email", providers: ["email"], ...(u.app_metadata || {}) }, user_metadata: {}, created_at: u.created_at, updated_at: u.created_at, last_sign_in_at: u.last_sign_in_at || null });
  function session(u) {
    const now = Math.floor(Date.now() / 1000);
    u.last_sign_in_at = new Date().toISOString();
    const access = [b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })), b64url(JSON.stringify({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600, app_metadata: { provider: "email", ...(u.app_metadata || {}) }, user_metadata: {}, session_id: randomUUID() })), b64url(randomUUID())].join(".");
    tokens.set(access, { id: u.id, app_metadata: { ...(u.app_metadata || {}) } });   // like a real JWT: the claims are fixed at sign-in
    return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "refresh-" + u.id + "-" + randomUUID(), user: userJson(u) };
  }
  // The login a request runs as: "service", "anon", or a user with the claims from their token.
  const who = (req) => {
    const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (t === serviceKey) return "service";
    const s = tokens.get(t), u = s && byId(s.id);
    return u ? { id: u.id, email: u.email, app_metadata: s.app_metadata } : "anon";
  };
  const reply = (status, body, extra = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
  const pgError = (e) => { const code = e && e.code; return reply(code === "42501" ? 403 : code === "23505" ? 409 : 400, { code: code || "PGRST", message: (e && e.message) || String(e), details: null, hint: null }); };
  const listOf = (v) => { const t = String(v).replace(/^\(/, "").replace(/\)$/, ""); const out = []; let cur = "", q = false; for (const ch of t) { if (ch === '"') { q = !q; continue; } if (ch === "," && !q) { out.push(cur); cur = ""; continue; } cur += ch; } out.push(cur); return out.filter((x) => x !== ""); };
  // PostgREST-style filters → SQL (the few the app uses: eq, neq, in, gte, lte).
  function where(url, params) {
    const parts = [];
    for (const [k, v] of url.searchParams) {
      if (["select", "order", "on_conflict", "columns", "limit", "offset"].includes(k)) continue;
      if (!COL.test(k)) throw Object.assign(new Error("bad column " + k), { code: "42703" });
      const m = String(v).match(/^(eq|neq|in|gte|lte|gt|lt)\.(.*)$/s);
      if (!m) continue;
      if (m[1] === "in") { params.push(listOf(m[2])); parts.push(k + "::text = any($" + params.length + "::text[])"); continue; }
      params.push(m[2]);
      parts.push(k + "::text " + { eq: "=", neq: "<>", gte: ">=", lte: "<=", gt: ">", lt: "<" }[m[1]] + " $" + params.length);
    }
    return parts.length ? " where " + parts.join(" and ") : "";
  }
  const outRow = (row, fields) => { const o = {}; fields.forEach((f) => { const v = row[f.name]; o[f.name] = v instanceof Date ? (f.dataTypeID === 1082 ? v.toISOString().slice(0, 10) : v.toISOString()) : v; }); return o; };

  async function rest(req, url, table, as) {
    const pk = TABLES[table];
    if (req.method === "GET" || req.method === "HEAD") {
      const params = [];
      const cols = (url.searchParams.get("select") || "*").split(",").map((c) => c.trim());
      if (!cols.every((c) => c === "*" || COL.test(c))) return reply(400, { message: "bad select" });
      const ord = (url.searchParams.get("order") || "").split(".");
      const order = ord[0] && COL.test(ord[0]) ? " order by " + ord[0] + (ord[1] === "desc" ? " desc" : "") : "";
      const sql = "select " + cols.join(", ") + " from public." + table + where(url, params) + order;
      const r = await asLogin(db, as, sql, params);
      return reply(200, r.rows.map((row) => outRow(row, r.fields)));
    }
    if (req.method === "POST") {
      const body = await req.json();
      const rows = Array.isArray(body) ? body : [body];
      if (!rows.length) return new Response(null, { status: 201, headers: CORS });
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      if (!cols.every((c) => COL.test(c))) return reply(400, { message: "bad column" });
      const upsert = /merge-duplicates/.test(req.headers.get("prefer") || "");
      const target = url.searchParams.get("on_conflict") || pk;
      const sql = "insert into public." + table + " (" + cols.join(", ") + ") select " + cols.join(", ") + " from jsonb_populate_recordset(null::public." + table + ", $1::jsonb)"
        + (upsert ? " on conflict (" + target + ") do update set " + cols.filter((c) => c !== target).map((c) => c + " = excluded." + c).join(", ") : "");
      await asLogin(db, as, sql, [JSON.stringify(rows)]);
      return new Response(null, { status: 201, headers: CORS });
    }
    if (req.method === "DELETE") {
      const params = [];
      await asLogin(db, as, "delete from public." + table + where(url, params), params);
      return new Response(null, { status: 204, headers: CORS });
    }
    return reply(405, { message: "not supported in the mock: " + req.method });
  }

  async function handle(req) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const as = who(req);
    log.push({ method: req.method, path: p + url.search, as: typeof as === "string" ? as : (as.app_metadata.role || "staff"), email: typeof as === "string" ? null : as.email });
    try {
      // ── auth ──
      if (p === "/auth/v1/token") {
        const body = await req.json().catch(() => ({}));
        if (url.searchParams.get("grant_type") === "password") {
          const u = users.find((x) => x.email === String(body.email || "").toLowerCase() && x.password === body.password);
          return u ? reply(200, session(u)) : reply(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
        }
        if (url.searchParams.get("grant_type") === "refresh_token") {
          const u = users.find((x) => String(body.refresh_token || "").startsWith("refresh-" + x.id + "-"));
          return u ? reply(200, session(u)) : reply(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
        }
      }
      if (p === "/auth/v1/user") {
        if (typeof as === "string") return reply(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
        const u = byId(as.id);
        if (req.method === "PUT") { const body = await req.json().catch(() => ({})); if (body.password) u.password = body.password; }
        return reply(200, userJson(u));
      }
      if (p === "/auth/v1/logout") return new Response(null, { status: 204, headers: CORS });
      const am = p.match(/^\/auth\/v1\/admin\/users(?:\/([^/]+))?$/);
      if (am) {
        if (as !== "service") return reply(403, { code: 403, error_code: "not_admin", msg: "User not allowed" });
        const id = am[1];
        if (!id && req.method === "GET") return reply(200, { users: users.map(userJson), aud: "authenticated" }, { "x-total-count": String(users.length) });
        if (!id && req.method === "POST") {
          const b = await req.json();
          const email = String(b.email || "").toLowerCase();
          if (users.some((u) => u.email === email)) return reply(422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
          const u = { id: randomUUID(), email, password: b.password, app_metadata: { ...(b.app_metadata || {}) }, created_at: new Date().toISOString() };
          users.push(u);
          return reply(200, userJson(u));
        }
        const u = byId(id);
        if (!u) return reply(404, { code: 404, error_code: "user_not_found", msg: "User not found" });
        if (req.method === "GET") return reply(200, userJson(u));
        if (req.method === "PUT") {
          const b = await req.json();
          if (b.password) u.password = b.password;
          if (b.app_metadata) { u.app_metadata = { ...(u.app_metadata || {}), ...b.app_metadata }; Object.keys(u.app_metadata).forEach((k) => { if (u.app_metadata[k] === null) delete u.app_metadata[k]; }); }
          return reply(200, userJson(u));
        }
        if (req.method === "DELETE") { users.splice(users.indexOf(u), 1); [...tokens].forEach(([t, s]) => { if (s.id === u.id) tokens.delete(t); }); return reply(200, userJson(u)); }
      }
      // ── functions ──
      const fm = p.match(/^\/functions\/v1\/([\w-]+)$/);
      if (fm) return functions[fm[1]] ? functions[fm[1]](req) : reply(404, { error: "Function not found" });
      // ── data ──
      const tm = p.match(/^\/rest\/v1\/([a-z_]+)$/);
      if (tm && TABLES[tm[1]]) return await rest(req, url, tm[1], as);
      if (p.startsWith("/storage/v1/")) return reply(200, []);
      return reply(404, { message: "mock: no route for " + req.method + " " + p });
    } catch (e) {
      return pgError(e);
    }
  }
  // Read the database directly, as the service role.
  const sql = async (q, params) => (await asLogin(db, "service", q, params)).rows;
  return { handle, db, sql, log, users, session, anonKey, serviceKey, functions };
}
