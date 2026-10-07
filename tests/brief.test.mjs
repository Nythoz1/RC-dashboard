// The Morning Brief counts money the way the dashboard does (src/lib/money.js): an invoice goes overdue
// by its due date and totals with its own tax rate, freight adds to an engine's flat cost, and
// break-even is the month's margin against fixed costs. Staff get a copy without the break-even line,
// which includes payroll. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { loadEdgeFunction } from "./fixtures/edge.mjs";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";

const SB = "http://sb.test";
let sb, owner, office, brief;
before(async () => {
  sb = await mockSupabase({ users: [{ email: "owner@shop.test", password: "x", app_metadata: { role: "owner" } }, { email: "office@shop.test", password: "x", app_metadata: { role: "staff" } }] });
  globalThis.fetch = async (input, init) => { const u = String(input instanceof Request ? input.url : input); return u.startsWith(SB) ? sb.handle(input instanceof Request ? input : new Request(u, init)) : new Response("{}", { status: 503 }); };
  owner = sb.session(sb.users[0]).access_token;
  office = sb.session(sb.users[1]).access_token;
  const today = (await sb.sql("select public.shop_today()::text as d"))[0].d;
  const daysAgo = (n) => { const x = new Date(today + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10); };
  const put = (k, v) => sb.sql("insert into app_state (key, value) values ($1, $2::jsonb)", ["rc:" + k, JSON.stringify(v)]);
  // Dated 60 days ago on Net 30 and still pending: overdue by itself. $1,000 + 13% HST = $1,130.
  await put("invoices", [{ id: 1, invNum: "INV-1", custId: 1, date: daysAgo(60), due: "Net 30", status: "pending", taxRate: 0.13, items: [{ d: "Head gasket", q: 1, r: 1000 }] }]);
  // $12,000 a year = $1,000 a month, plus 10 h a week at $20 = $866.67 a month of payroll.
  await put("expenses", [{ id: 2, cat: "Insurance", amount: 12000, freq: "yearly" }]);
  await put("employees", [{ id: 3, name: "Mike", rate: 20, hrs: 10, status: "active" }]);
  // Sold this month without an invoice for $10,000; cost basis $8,000, of which $500 is shop labour.
  await put("wins", [{ id: 4, kind: "sale", engineId: 99, name: "C15", price: 10000, cost: 8000, labor: 500, ts: new Date().toISOString() }]);
  // $9,000 to buy and $600 of freight against an $11,000 list: 87% (it used to read as $600, 5%).
  await sb.sql("insert into inventory (id, sku, name, cat, status, price, cost, data) values (7, 'ISX-7', 'ISX15', 'Complete Engine', 'in-reman', 11000, 9000, $1::jsonb)",
    [JSON.stringify({ id: 7, sku: "ISX-7", name: "ISX15", cat: "Complete Engine", status: "in-reman", price: 11000, cost: 9000, costFreight: 600, stageDate: new Date().toISOString() })]);
  brief = await loadEdgeFunction("brief", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey });
});
const send = async (tok) => (await brief(new Request(SB + "/functions/v1/brief?force=1", { method: "POST", headers: { Authorization: "Bearer " + tok } }))).json();

test("the owner's brief: overdue by due date with its own tax, freight on top of the cost, break-even on margin", async () => {
  const r = await send(owner);
  assert.equal(r.ok, true);
  assert.match(r.text, /1 overdue invoice \(\$1,130\)/);
  assert.match(r.text, /ISX15 \(ISX-7\) is at 87% of its expected sale/);
  // Fixed $1,867 a month against $2,500 earned ($10,000 − $8,000 + $500 of labour already in payroll).
  assert.match(r.text, /fixed costs \$1,867 a month: ✓ break-even cleared/);
});

test("staff get the same brief without the break-even line, and so does the stored staff copy", async () => {
  const r = await send(office);
  assert.equal(r.ok, true);
  assert.match(r.text, /1 overdue invoice/);
  assert.doesNotMatch(r.text, /fixed costs|break-even/);
  const stored = (await sb.sql("select value from app_state where key = 'rc:brief'"))[0].value;
  assert.match(stored.text, /fixed costs/);
  assert.doesNotMatch(stored.staffText, /fixed costs|break-even/);
  assert.doesNotMatch(stored.staffHtml, /fixed costs|break-even/);
});
