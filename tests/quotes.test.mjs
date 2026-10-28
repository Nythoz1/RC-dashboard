// The customer quote link (migration 0018), in a real Postgres: a link shows one quote and nothing
// else, works once, can be revoked, never reaches another shop, and the answer lands on the quote
// and in the Shop Log. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asLogin, RC_TENANT } from "./fixtures/pg.mjs";

const B = "b0b00000-0000-4000-8000-000000000002";
const owner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@rc.test", app_metadata: { role: "owner" } };
const staff = { id: "00000000-0000-4000-8000-000000000002", email: "office@rc.test", app_metadata: { role: "staff" } };
const mike = { id: "00000000-0000-4000-8000-000000000003", email: "mike@rc.test", app_metadata: { role: "employee", employeeId: 101 } };
const bOwner = { id: "00000000-0000-4000-8000-0000000000b1", email: "owner@b.test", app_metadata: { role: "owner" }, tenant: B };
let db;
const one = async (who, sql, params) => (await asLogin(db, who, sql, params)).rows[0];
const make = async (who, id, days) => (await one(who, "select public.quote_link_make($1, $2) as t", [String(id), days ?? 30])).t;
const view = async (tok) => (await one("anon", "select public.quote_view($1) as v", [tok])).v;
const decide = async (tok, dec, name, note = "") => (await one("anon", "select public.quote_decide($1, $2, $3, $4) as v", [tok, dec, name, note])).v;
const quotes = async (shop = RC_TENANT) => (await db.query("select value from tenant_state where tenant_id = $1 and key = 'rc:quotes'", [shop])).rows[0].value;

before(async () => {
  db = await freshDb();
  await db.query("update tenants set profile = profile || '{\"phone\":\"1-587-863-0505\"}' where id = $1", [RC_TENANT]);
  await db.query("insert into tenants (id, name) values ($1, 'Prairie Diesel')", [B]);
  await db.query(`insert into tenant_state (tenant_id, key, value) values
    ($1, 'rc:quotes', $2::jsonb), ($1, 'rc:customers', '[{"id":7,"name":"Base Hauling","phone":"403-555-0101","spent":99999}]'),
    ($3, 'rc:quotes', '[{"id":1,"quoteNum":"PD-1","items":[{"d":"B job","q":1,"r":10}]}]')`,
    [RC_TENANT, JSON.stringify([
      { id: 501, quoteNum: "QT-501", custId: 7, date: "2026-10-20", validUntil: "30 days", description: "ISX15 in-frame", taxRate: 0.05, status: "sent",
        notes: "internal: our cost is $9k", items: [{ d: "In-frame kit", q: 1, r: 4200, cost: 3100 }, { d: "Labour", q: 18, r: 125 }, { d: "", q: 1, r: 999 }] },
      { id: 502, quoteNum: "QT-502", custId: 7, items: [{ d: "Head gasket", q: 1, r: 900 }], status: "invoiced" },
    ]), B]);
  for (const u of [owner, staff, mike, bOwner]) await one(u, "select 1");
});

test("the owner or the office makes a link; employees, strangers and other shops can't", async () => {
  assert.match(await make(owner, 501), /^[0-9a-f]{64}$/);
  assert.match(await make(staff, 501), /^[0-9a-f]{64}$/);
  await assert.rejects(make(mike, 501), /owner or office/);
  await assert.rejects(asLogin(db, "anon", "select public.quote_link_make('501')"), /permission denied/);
  await assert.rejects(make(bOwner, 501), /isn't saved yet/);        // Rollin Coal's quote id, from shop B: not found in B
  await assert.rejects(make(owner, 999), /isn't saved yet/);
  assert.equal((await db.query("select count(*)::int as n from quote_links where token_hash ~ '^[0-9a-f]{64}$'")).rows[0].n, 2);
  assert.equal((await db.query("select count(*)::int as n from quote_links where not revoked")).rows[0].n, 1);   // the newer link replaced the first
});

test("the customer sees that quote and nothing else", async () => {
  const tok = await make(owner, 501);
  const v = await view(tok);
  assert.equal(v.shop.name, "Rollin Coal"); assert.equal(v.shop.phone, "1-587-863-0505");
  assert.deepEqual([v.quote.num, v.quote.customer, v.quote.description], ["QT-501", "Base Hauling", "ISX15 in-frame"]);
  assert.deepEqual(v.quote.items, [{ d: "In-frame kit", q: 1, r: 4200 }, { d: "Labour", q: 18, r: 125 }]);   // no cost, no blank line
  assert.deepEqual([+v.quote.sub, +v.quote.tax, +v.quote.total], [6450, 322.5, 6772.5]);
  const all = JSON.stringify(v);
  assert.doesNotMatch(all, /internal|9k|3100|spent|99999|403-555|PD-1/);
  assert.equal((await view("0".repeat(64))).error, "gone");
  assert.equal((await view("")).error, "gone");
  const st = await db.query("select views, viewed_at from quote_links where token_hash = public.ql_hash($1)", [tok]);
  assert.equal(st.rows[0].views, 1);
});

test("approving takes a name, works once, sets the quote and logs it; the dashboard sees the answer", async () => {
  const tok = await make(owner, 501);
  assert.equal((await decide(tok, "approved", "  ")).error, "name");
  const r = await decide(tok, "approved", "Dale Base", "Go ahead, start Monday");
  assert.equal(r.decision.decision, "approved"); assert.equal(r.quote.status, "approved");
  assert.equal((await decide(tok, "declined", "Dale Base")).error, "decided");
  const q = (await quotes()).find((x) => x.id === 501);
  assert.equal(q.status, "approved");
  assert.deepEqual([q.custDecision.name, q.custDecision.note, q.custDecision.via], ["Dale Base", "Go ahead, start Monday", "link"]);
  assert.equal(q.notes, "internal: our cost is $9k");                // everything else on the quote untouched
  const log = (await db.query("select value from tenant_state where tenant_id = $1 and key = 'rc:activity'", [RC_TENANT])).rows[0].value;
  assert.match(log[0].msg, /✅ Quote QT-501 approved by Dale Base through the customer link: Go ahead, start Monday/);
  assert.equal(log[0].user, "customer");
  const seen = await one(staff, "select decision, decided_name from quote_links where quote_id = '501' and decided_at is not null");
  assert.deepEqual([seen.decision, seen.decided_name], ["approved", "Dale Base"]);
  assert.equal((await one(bOwner, "select count(*)::int as n from quote_links")).n, 0);   // shop B sees none of Rollin Coal's links
});

test("declining needs no name; invoiced quotes, revoked and expired links refuse", async () => {
  await db.query("update tenant_state set value = jsonb_set(value, '{0,status}', '\"sent\"') where tenant_id = $1 and key = 'rc:quotes'", [RC_TENANT]);
  const tok = await make(owner, 501);
  assert.equal((await decide(tok, "declined", "")).quote.status, "declined");
  assert.equal((await decide(await make(owner, 502), "approved", "Dale")).error, "invoiced");
  const tok3 = await make(owner, 502);
  assert.equal((await one(owner, "select public.quote_link_revoke('502') as n")).n, 1);
  assert.equal((await view(tok3)).error, "gone");
  const tok4 = await make(owner, 502);
  await db.query("update quote_links set expires_at = now() - interval '1 day' where token_hash = public.ql_hash($1)", [tok4]);
  assert.equal((await view(tok4)).error, "expired");
  assert.equal((await decide(tok4, "approved", "Dale")).error, "expired");
  assert.equal((await asLogin(db, "anon", "select token_hash from quote_links")).rows.length, 0);   // row-level security: no policy for anon
});
