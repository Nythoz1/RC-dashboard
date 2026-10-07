// ─────────────────────────────────────────────────────────────
// Rollin Coal — team logins Edge Function (Deno)
//
// Lets the owner give each employee a login from the dashboard's Team tab, so
// nobody has to open the Supabase dashboard or write SQL. Owner only: the caller's
// token must belong to a login whose app_metadata.role is "owner" (set once with
// the SQL in SETUP.md).
//
// A login's access is its app_metadata, which only this function or an admin can
// set (users can't change their own):
//   role "employee" + employeeId + name → their own timesheet, nothing else (0011)
//   role "staff"                        → the whole dashboard, no wages
//   no role                             → no access at all (0013) until given one
// Owner logins can't be changed or removed here.
//
// Body {action, ...}:
//   list                                                  → { logins: [...] }
//   create   {employeeId, email, password, role}          → { login }
//   password {userId, password}                           → { ok: true }
//   access   {userId, role, employeeId?}                  → { login }
//   remove   {userId}                                     → { ok: true }
// Deploy: supabase functions deploy team-logins --no-verify-jwt
//   (this check is the real gate; SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY are
//   injected automatically)
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
type Any = Record<string, any>;
const ROLES = ["employee", "staff"];
const roleOf = (u: Any) => (u?.app_metadata?.role as string) || "none";
const view = (u: Any) => ({
  id: u.id, email: u.email || "", role: roleOf(u), employeeId: u.app_metadata?.employeeId ?? null,
  name: u.app_metadata?.name || "", lastSignIn: u.last_sign_in_at || null, createdAt: u.created_at || null,
});
const plain = (e: Any, fallback: string) => {
  const m = String(e?.message || e?.msg || e || "");
  if (/already (been )?registered|already exists|email_exists/i.test(m)) return "That email already has a login.";
  if (/password/i.test(m) && /(short|weak|characters)/i.test(m)) return "That password is too weak. Use at least 8 characters.";
  return m || fallback;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!SB_URL || !SB_ANON || !SB_SERVICE) return json({ error: "Server not configured" }, 500);

  // ── owner only ──
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Missing authorization" }, 401);
  let me: Any | null = null;
  try {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (!error) me = data?.user || null;
  } catch (_e) { /* fall through */ }
  if (!me) return json({ error: "Not authenticated" }, 401);
  if (roleOf(me) !== "owner") return json({ error: "Only the owner's login can manage logins." }, 403);

  const svc = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  let body: Any = {};
  try { body = await req.json(); } catch (_e) { body = {}; }
  const all = async () => {
    const { data, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return (data?.users || []) as Any[];
  };
  const team = async () => {
    const { data } = await svc.from("app_state").select("value").eq("key", "rc:employees").maybeSingle();
    return (Array.isArray(data?.value) ? data.value : []) as Any[];
  };
  const target = async (id: string) => {
    if (!id) return { err: "Which login?" };
    const { data, error } = await svc.auth.admin.getUserById(id);
    if (error || !data?.user) return { err: "That login doesn't exist any more." };
    if (roleOf(data.user) === "owner") return { err: "Owner logins can't be changed here." };
    return { user: data.user as Any };
  };

  try {
    if (body.action === "list") return json({ logins: (await all()).map(view) });

    if (body.action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = String(body.role || "employee");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "That doesn't look like an email address." }, 400);
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400);
      if (!ROLES.includes(role)) return json({ error: "Pick employee or office staff." }, 400);
      const member = (await team()).find((e) => String(e.id) === String(body.employeeId));
      if (role === "employee" && !member) return json({ error: "Pick the team member this login is for." }, 400);
      if (member && (await all()).some((u) => String(u.app_metadata?.employeeId) === String(member.id))) return json({ error: member.name + " already has a login." }, 400);
      const app_metadata = { role, employeeId: member ? Number(member.id) : null, name: member ? String(member.name || "") : "" };
      const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true, app_metadata });
      if (error || !data?.user) return json({ error: plain(error, "Couldn't create the login.") }, 400);
      return json({ login: view(data.user) });
    }

    if (body.action === "password") {
      const t = await target(String(body.userId || ""));
      if (t.err) return json({ error: t.err }, 400);
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400);
      const { error } = await svc.auth.admin.updateUserById(t.user!.id, { password });
      if (error) return json({ error: plain(error, "Couldn't change the password.") }, 400);
      return json({ ok: true });
    }

    if (body.action === "access") {
      const t = await target(String(body.userId || ""));
      if (t.err) return json({ error: t.err }, 400);
      const role = String(body.role || "");
      if (!ROLES.includes(role)) return json({ error: "Pick employee or office staff." }, 400);
      const empId = body.employeeId ?? t.user!.app_metadata?.employeeId ?? null;
      const member = (await team()).find((e) => String(e.id) === String(empId));
      if (role === "employee" && !member) return json({ error: "Pick the team member this login is for." }, 400);
      const app_metadata = { ...(t.user!.app_metadata || {}), role, employeeId: member ? Number(member.id) : null, name: member ? String(member.name || "") : "" };
      const { data, error } = await svc.auth.admin.updateUserById(t.user!.id, { app_metadata });
      if (error || !data?.user) return json({ error: plain(error, "Couldn't change the access.") }, 400);
      return json({ login: view(data.user) });
    }

    if (body.action === "remove") {
      const t = await target(String(body.userId || ""));
      if (t.err) return json({ error: t.err }, 400);
      if (t.user!.id === me.id) return json({ error: "You can't remove your own login." }, 400);
      const { error } = await svc.auth.admin.deleteUser(t.user!.id);
      if (error) return json({ error: plain(error, "Couldn't remove the login.") }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: plain(e, "Something went wrong.") }, 500);
  }
});
