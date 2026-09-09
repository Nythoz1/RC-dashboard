// ─────────────────────────────────────────────────────────────
// Rollin Coal — Morning Brief Edge Function (Deno)
//
// Computes the shop's daily brief from live data (inventory table + app_state
// blobs) and emails it. Runs autonomously: pg_cron calls this hourly (see
// migrations/0008_morning_brief_cron.sql); the function only acts at 07:00
// America/Edmonton (DST-proof) and once per calendar day. The dashboard can also
// call it on demand ("Send now") with a logged-in user's token.
//
// Auth (any one): x-brief-secret header matching the Vault secret 'brief_secret'
//   (read via the service-role-only RPC public.brief_secret()) or the optional
//   BRIEF_SECRET env; Bearer <service role key>; or a Bearer user JWT (verified
//   with auth.getUser). Deploy with --no-verify-jwt: this check is the real gate.
// Secrets: RESEND_API_KEY (optional — without it the brief is computed + stored
//   but not emailed), MAIL_TO (default wayne@rollin-coal.ca), MAIL_FROM (default
//   Resend sandbox sender), DASHBOARD_URL (optional link in the email).
// Output: upserts app_state 'rc:brief' = {date, at, subject, text, html, sent,
//   to, reason, summary, by}; the dashboard renders it read-only.
// Keep the cost/status helpers below in sync with RollinCoalDashboard.jsx.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ENV_SECRET = Deno.env.get("BRIEF_SECRET") || "";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const MAIL_TO = Deno.env.get("MAIL_TO") || "wayne@rollin-coal.ca";
const MAIL_FROM = Deno.env.get("MAIL_FROM") || "Rollin Coal <onboarding@resend.dev>";
const DASH = Deno.env.get("DASHBOARD_URL") || "";
const TZ = "America/Edmonton";
const BLOBS = ["wins","invoices","settings","timeEntries","diagnoses","cores","jobs","activity","expenses","employees"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-brief-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ── helpers mirrored from the dashboard ──
type Any = Record<string, any>;
const isEngine = (i: Any) => i.cat === "Complete Engine" || i.cat === "Core";
const engStatus = (i: Any) => i.status || (i.cat === "Core" ? "core" : "available");
const partsSpend = (i: Any) => (i.partsLog || []).reduce((a: number, p: Any) => a + (+p.v || 0), 0);
const fixedCost = (i: Any) => { const b = (+i.costCore||0)+(+i.costFreight||0)+(+i.costParts||0)+(+i.costLabor||0); return b > 0 ? b : (+i.cost || 0); };
const costBasis = (i: Any) => fixedCost(i) + partsSpend(i) + (+i.laborLogged||0) + (+i.dxParts||0);
const WIP = ["core","in-reman","on-hold"];
const uwRatio = (i: Any) => { const p = +i.price||0, cb = costBasis(i); return p > 0 && cb > 0 ? cb/p : null; };
const uwLevel = (i: Any) => { if (!WIP.includes(engStatus(i))) return null; const r = uwRatio(i); return r == null ? null : r >= .9 ? "crit" : r >= .75 ? "warn" : null; };
const $ = (n: number) => "$" + Math.round(+n||0).toLocaleString("en-US");
const $K = (n: number) => { n = +n||0; return n >= 10000 ? "$" + (n/1000).toFixed(1) + "k" : $(n); };
const STAGE: Record<string,string> = { core:"Core", "in-reman":"In Reman", available:"Available", "on-hold":"On Hold", sold:"Sold" };

function local(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", hour12:false });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, hour: (+p.hour) % 24,
    long: new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday:"long", month:"long", day:"numeric" }).format(d) };
}
const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
const ymdOf = (ts: string) => ts ? local(new Date(ts)).ymd : "";

function daily3(s: Any) {
  const c: Any[] = []; const E = (s.inventory||[]).filter(isEngine);
  E.filter((i: Any) => costBasis(i) <= 0).forEach((i: Any) => c.push({ t:"cost", l:"Enter core cost — " + (i.sku||i.name||"") }));
  E.filter((i: Any) => engStatus(i) === "available" && !(i.listedOn||[]).length).forEach((i: Any) => c.push({ t:"list", l:"Post " + (i.sku||"") + " — not advertised" }));
  E.filter((i: Any) => !i.photo).forEach((i: Any) => c.push({ t:"photo", l:"Photo " + (i.sku||i.name||"") }));
  E.filter((i: Any) => !(i.serial||i.esn)).forEach((i: Any) => c.push({ t:"esn", l:"Record ESN — " + (i.sku||i.name||"") }));
  E.filter((i: Any) => WIP.includes(engStatus(i)) && i.stageDate && days(i.stageDate) > 7).forEach((i: Any) => c.push({ t:"stale", l:"Touch " + (i.sku||i.name||"") + " — stuck in " + STAGE[engStatus(i)] }));
  (s.invoices||[]).filter((v: Any) => v.status === "overdue").forEach((v: Any) => c.push({ t:"inv", l:"Chase invoice " + (v.invNum||v.id) }));
  const day = Math.floor(Date.now()/864e5); const types = [...new Set(c.map(x => x.t))]; const picks: Any[] = [];
  for (let k = 0; k < types.length && picks.length < 3; k++) { const ty = types[(k+day) % types.length]; const cand = c.find(x => x.t === ty && !picks.includes(x)); if (cand) picks.push(cand); }
  for (const x of c) { if (picks.length >= 3) break; if (!picks.includes(x)) picks.push(x); }
  return picks.slice(0, 3);
}

function compute(s: Any, now: Date) {
  const t = local(now); const y = local(new Date(now.getTime() - 864e5)).ymd; const ym = t.ymd.slice(0, 7);
  const E = (s.inventory||[]).filter(isEngine);
  const wins = (s.wins||[]).filter((w: Any) => w.kind === "sale");
  const yWins = wins.filter((w: Any) => ymdOf(w.ts) === y);
  const mWins = wins.filter((w: Any) => ymdOf(w.ts).slice(0, 7) === ym);
  const mRev = mWins.reduce((a: number, w: Any) => a + (+w.price||0), 0);
  const set = (s.settings||[])[0] || {}; const goal = +set.monthlyGoal || 50000;
  const dxY = (s.diagnoses||[]).filter((x: Any) => x.date === y);
  const yParts = E.reduce((a: number, i: Any) => a + (i.partsLog||[]).filter((p: Any) => p.date === y).reduce((x: number, p: Any) => x + (+p.v||0), 0), 0)
    + dxY.reduce((a: number, x: Any) => a + (x.parts||[]).reduce((b: number, p: Any) => b + (+p.v||0), 0), 0);
  const yHours = (s.timeEntries||[]).filter((x: Any) => x.date === y).reduce((a: number, x: Any) => a + (+x.hours||0), 0)
    + dxY.reduce((a: number, x: Any) => a + (+x.hours||0), 0);
  const yActs = (s.activity||[]).filter((x: Any) => ymdOf(x.ts) === y);
  const yAvail = yActs.filter((x: Any) => /→ Available/.test(x.msg||"")).length;
  const uw = E.filter((i: Any) => uwLevel(i)).map((i: Any) => ({ name: i.name||i.sku, pct: Math.round((uwRatio(i)||0)*100), lv: uwLevel(i) })).sort((a: Any, b: Any) => b.pct - a.pct);
  const stale = E.filter((i: Any) => WIP.includes(engStatus(i)) && i.stageDate && days(i.stageDate) > 7).map((i: Any) => ({ name: i.name||i.sku, d: days(i.stageDate), st: STAGE[engStatus(i)] })).sort((a: Any, b: Any) => b.d - a.d);
  const avail = E.filter((i: Any) => engStatus(i) === "available");
  const unlisted = avail.filter((i: Any) => !(i.listedOn||[]).length).length;
  const noCost = E.filter((i: Any) => costBasis(i) <= 0).length;
  const overdue = (s.invoices||[]).filter((v: Any) => v.status === "overdue");
  const invTot = (v: Any) => (v.items||[]).reduce((a: number, it: Any) => a + (+it.q||0)*(+it.r||0), 0) * 1.05;
  const overdueSum = overdue.reduce((a: number, v: Any) => a + invTot(v), 0);
  const coresPending = (s.cores||[]).filter((c: Any) => c.status === "pending").length;
  const openDx = (s.diagnoses||[]).filter((x: Any) => (x.outcome||"open") !== "resolved").length;
  const wip = E.filter((i: Any) => WIP.includes(engStatus(i))); const wipCost = wip.reduce((a: number, i: Any) => a + costBasis(i), 0);
  const fixedMo = (s.expenses||[]).reduce((a: number, e: Any) => a + (+e.amount||0), 0) + (s.employees||[]).reduce((a: number, e: Any) => a + (+e.rate||0)*(+e.hrs||0), 0) * 4.33;
  return { t, y, E: E.length, avail: avail.length, wip: wip.length, wipCost, yWins, mWins, mRev, goal, yParts, yHours, yActs: yActs.length, yAvail, yDx: dxY.length, uw, stale, unlisted, noCost, overdue, overdueSum, coresPending, openDx, fixedMo, d3: daily3(s) };
}

const esc = (t: unknown) => String(t ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const sec = (t: string) => `<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d4581a;font-weight:700;margin-top:14px;border-left:3px solid #d4581a;padding-left:8px">${t}</div>`;

function render(c: Any) {
  const pct = c.goal > 0 ? Math.min(999, Math.round(c.mRev / c.goal * 100)) : 0;
  const yRev = c.yWins.reduce((a: number, w: Any) => a + (+w.price||0), 0);
  const att: string[] = [];
  c.uw.forEach((u: Any) => att.push(`${u.lv === "crit" ? "🔴" : "🟠"} ${u.name} is at ${u.pct}% of its expected sale — ${u.lv === "crit" ? "UNDERWATER" : "margin risk"}. Finish, part out, or sell as-is.`));
  c.stale.slice(0, 4).forEach((x: Any) => att.push(`⏳ ${x.name} — ${x.d} days in ${x.st}`));
  if (c.overdue.length) att.push(`💰 ${c.overdue.length} overdue invoice${c.overdue.length > 1 ? "s" : ""} (${$(c.overdueSum)})`);
  if (c.unlisted) att.push(`📣 ${c.unlisted} available engine${c.unlisted > 1 ? "s" : ""} not advertised`);
  if (c.coresPending) att.push(`🔄 ${c.coresPending} core return${c.coresPending > 1 ? "s" : ""} pending`);
  if (c.noCost) att.push(`💲 ${c.noCost} engine${c.noCost > 1 ? "s" : ""} with no cost basis (margins are fiction until entered)`);
  if (c.openDx) att.push(`🩺 ${c.openDx} open diagnos${c.openDx > 1 ? "es" : "is"}`);
  const yest: string[] = [
    (c.yWins.length ? "🏆 " + c.yWins.length + " sold · " + $(yRev) + " — " + c.yWins.map((w: Any) => w.name).join(", ") : "No sales"),
    `⏱ ${c.yHours}h wrenching · 🧩 ${$(c.yParts)} parts into builds · 🔧 ${c.yAvail} reman${c.yAvail === 1 ? "" : "s"} completed`,
    `🩺 ${c.yDx} diagnos${c.yDx === 1 ? "is" : "es"} logged · 📜 ${c.yActs} actions in the shop log`,
  ];
  const subject = `☀️ Rollin Coal brief — ${c.t.long}${c.uw.length ? " · ⚠ " + c.uw.length + " build" + (c.uw.length > 1 ? "s" : "") + " at risk" : ""}${c.yWins.length ? " · 🏆 " + c.yWins.length + " sold" : ""}`;
  const text = [
    `ROLLIN COAL — MORNING BRIEF · ${c.t.long}`,
    ``, `YESTERDAY`, ...yest.map(l => "  " + l),
    ``, `NEEDS ATTENTION TODAY`, ...(att.length ? att.map(l => "  " + l) : ["  ✓ Nothing urgent — lot's clean."]),
    ``, `TODAY'S 3`, ...(c.d3.length ? c.d3.map((x: Any, i: number) => `  ${i + 1}. ${x.l}`) : ["  Lot's clean — go sell something."]),
    ``, `MONTH SO FAR`,
    `  ${$(c.mRev)} of ${$(c.goal)} goal (${pct}%) · ${c.mWins.length} engine${c.mWins.length === 1 ? "" : "s"} sold` + (c.fixedMo > 0 ? ` · break-even ${$(c.fixedMo)}${c.mRev >= c.fixedMo ? " ✓ cleared" : ""}` : ""),
    `  Lot: ${c.E} engines · ${c.avail} available · ${c.wip} in WIP holding ${$K(c.wipCost)}`,
    ``, DASH ? `Open the dashboard: ${DASH}` : ``, `Sent automatically by your Rollin Coal dashboard.`,
  ].join("\n");
  const li = (a: string[]) => a.map(x => `<li style="margin:4px 0">${esc(x)}</li>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f2ef;font-family:Helvetica,Arial,sans-serif;color:#1b1b1b">
<div style="max-width:620px;margin:0 auto;padding:18px">
 <div style="background:#d4581a;color:#fff;border-radius:10px 10px 0 0;padding:16px 20px"><div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.9">Rollin Coal</div><div style="font-size:22px;font-weight:800;letter-spacing:1px;margin-top:2px">☀️ Morning Brief</div><div style="font-size:12px;opacity:.9;margin-top:4px">${esc(c.t.long)}</div></div>
 <div style="background:#fff;border:1px solid #e3ded8;border-top:none;border-radius:0 0 10px 10px;padding:6px 20px 16px">
  ${sec("Yesterday")}<ul style="padding-left:18px;margin:6px 0 14px;font-size:14px;line-height:1.5">${li(yest)}</ul>
  ${sec("Needs attention today")}${att.length ? `<ul style="padding-left:18px;margin:6px 0 14px;font-size:14px;line-height:1.5">${li(att)}</ul>` : `<p style="font-size:14px;color:#1e7a34;margin:6px 0 14px">✓ Nothing urgent — lot's clean.</p>`}
  ${sec("Today's 3")}${c.d3.length ? `<ol style="padding-left:20px;margin:6px 0 14px;font-size:14px;line-height:1.6">${c.d3.map((x: Any) => `<li>${esc(x.l)}</li>`).join("")}</ol>` : `<p style="font-size:14px;margin:6px 0 14px">Lot's clean — go sell something.</p>`}
  ${sec("Month so far")}
  <div style="font-size:14px;margin:6px 0 4px"><b>${esc($(c.mRev))}</b> of ${esc($(c.goal))} goal · ${pct}% · ${c.mWins.length} engine${c.mWins.length === 1 ? "" : "s"} sold${c.fixedMo > 0 ? ` · break-even ${esc($(c.fixedMo))}${c.mRev >= c.fixedMo ? " ✓" : ""}` : ""}</div>
  <div style="height:10px;background:#eee;border-radius:6px;overflow:hidden;margin:6px 0 10px"><div style="height:100%;width:${Math.min(100, pct)}%;background:${pct >= 100 ? "#3fae5a" : "#d4581a"}"></div></div>
  <div style="font-size:12px;color:#666">Lot: ${c.E} engines · ${c.avail} available · ${c.wip} in WIP holding ${esc($K(c.wipCost))}</div>
  ${DASH ? `<p style="margin:16px 0 0"><a href="${esc(DASH)}" style="background:#d4581a;color:#fff;text-decoration:none;padding:9px 14px;border-radius:7px;font-size:13px;font-weight:700">Open the dashboard →</a></p>` : ""}
 </div>
 <div style="font-size:11px;color:#999;text-align:center;padding:12px">Sent automatically by your Rollin Coal dashboard · Medicine Hat, AB</div>
</div></body></html>`;
  return { subject, text, html, summary: { sold: c.yWins.length, atRisk: c.uw.length, stale: c.stale.length, overdue: c.overdue.length, monthRev: c.mRev, goal: c.goal } };
}

async function sendEmail(subject: string, html: string, text: string) {
  if (!RESEND) return { sent: false, reason: "RESEND_API_KEY not set" };
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + RESEND, "Content-Type": "application/json" }, body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_TO], subject, html, text }) });
    const d: Any = await r.json().catch(() => ({}));
    if (!r.ok) return { sent: false, reason: d?.message || d?.name || ("Resend " + r.status) };
    return { sent: true, id: d?.id };
  } catch (e) { return { sent: false, reason: String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!SB_URL || !SB_SERVICE) return json({ error: "Server not configured" }, 500);
  const svc = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
  // ── authorize: cron secret · service role · signed-in user ──
  let mode = "";
  const hdr = req.headers.get("x-brief-secret") || "";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (hdr) {
    let vaultSecret = "";
    try { const { data } = await svc.rpc("brief_secret"); vaultSecret = (data as string) || ""; } catch (_e) { /* vault not configured */ }
    if ((vaultSecret && hdr === vaultSecret) || (ENV_SECRET && hdr === ENV_SECRET)) mode = "cron";
  }
  if (!mode && token) {
    if (token === SB_SERVICE) mode = "service";
    else if (SB_ANON) { try { const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } }); const { data, error } = await sb.auth.getUser(token); if (!error && data?.user) mode = "user"; } catch (_e) { /* fall through */ } }
  }
  if (!mode) return json({ error: "Not authorized" }, 401);

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1" || mode === "user";
  const now = new Date(); const t = local(now);
  // ── load everything the brief needs (parallel) ──
  const [inv, blobs, prev] = await Promise.all([
    svc.from("inventory").select("data").order("id"),
    svc.from("app_state").select("key,value").in("key", BLOBS.map(k => "rc:" + k)),
    svc.from("app_state").select("value").eq("key", "rc:brief").maybeSingle(),
  ]);
  if (inv.error) return json({ error: "inventory: " + inv.error.message }, 500);
  if (blobs.error) return json({ error: "app_state: " + blobs.error.message }, 500);
  const s: Any = { inventory: (inv.data || []).map((r: Any) => r.data) };
  const by = new Map((blobs.data || []).map((r: Any) => [r.key, r.value]));
  BLOBS.forEach(k => { const v = by.get("rc:" + k); s[k] = Array.isArray(v) ? v : []; });
  const last = (prev.data?.value as Any) || null;
  // ── gate (scheduled calls only): 07:00 local, once per day ──
  if (!force) {
    if (t.hour !== 7) return json({ skipped: "outside 07:00 " + TZ, localHour: t.hour, date: t.ymd });
    if (last && last.date === t.ymd && last.sent) return json({ skipped: "already sent today", date: t.ymd });
  }
  // ── compute → email → store ──
  const c = compute(s, now);
  const out = render(c);
  const mail: Any = await sendEmail(out.subject, out.html, out.text);
  const brief = { date: t.ymd, at: now.toISOString(), subject: out.subject, text: out.text, html: out.html, sent: !!mail.sent, to: mail.sent ? MAIL_TO : null, reason: mail.sent ? null : (mail.reason || null), summary: out.summary, by: mode };
  const up = await svc.from("app_state").upsert({ key: "rc:brief", value: brief, updated_at: now.toISOString() });
  if (up.error) console.error("brief store failed:", up.error.message);
  return json({ ok: true, date: t.ymd, sent: brief.sent, to: brief.to, reason: brief.reason, subject: out.subject, text: out.text, summary: out.summary, stored: !up.error });
});
