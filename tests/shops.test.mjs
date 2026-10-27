// Many shops on one system (migration 0017), checked in a real Postgres (PGlite) and
// through the Edge Functions on the mock Supabase: a second shop's logins never see,
// change or overwrite Rollin Coal's data (lists, engines, timesheets, approvals, files),
// whatever they send, and the other way round. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asLogin, RC_TENANT } from "./fixtures/pg.mjs";
import { loadEdgeFunction } from "./fixtures/edge.mjs";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";

const B = "b0b00000-0000-4000-8000-000000000002";   // a second shop, in Saskatchewan
const rcOwner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@rc.test", app_metadata: { role: "owner" } };
const rcStaff = { id: "00000000-0000-4000-8000-000000000002", email: "office@rc.test", app_metadata: { role: "staff" } };
const rcMike = { id: "00000000-0000-4000-8000-000000000003", email: "mike@rc.test", app_metadata: { role: "employee", employeeId: 101, name: "Mike Test" } };
const bOwner = { id: "00000000-0000-4000-8000-0000000000b1", email: "owner@b.test", app_metadata: { role: "owner" }, tenant: B };
const bStaff = { id: "00000000-0000-4000-8000-0000000000b2", email: "office@b.test", app_metadata: { role: "staff" }, tenant: B };
const bEmp = { id: "00000000-0000-4000-8000-0000000000b3", email: "tech@b.test", app_metadata: { role: "employee", employeeId: 201, name: "B Tech" }, tenant: B };
// A login that claims a role but was never put in a shop (made straight in Supabase).
const stray = { id: "00000000-0000-4000-8000-0000000000c1", email: "stray@x.test", app_metadata: { role: "owner" }, noShop: true };
let db, today;
const rows = async (who, sql, params) => (await asLogin(db, who, sql, params)).rows;
const refuses = (p, re = /row-level security|isn't part of a shop|Only the shop owner/) => assert.rejects(p, re);

before(async () => {
  db = await freshDb();
  today = (await db.query("select public.shop_today()::text as d")).rows[0].d;
  await db.query("insert into tenants (id, name, code, province, timezone) values ($1, 'Prairie Diesel', 'PD', 'SK', 'America/Regina')", [B]);
  await db.query(`insert into tenant_state (tenant_id, key, value) values
    ($1, 'rc:customers', '[{"id":1,"name":"RC customer"}]'), ($1, 'rc:employees', '[{"id":101,"name":"Mike Test","status":"active"}]'),
    ($2, 'rc:customers', '[{"id":1,"name":"B customer"}]'), ($2, 'rc:employees', '[{"id":201,"name":"B Tech","status":"active"}]')`, [RC_TENANT, B]);
  await db.query(`insert into inventory (tenant_id, id, sku, name, cat, status, data) values
    ($1, 1, 'RC-1', 'Cummins X15', 'Complete Engine', 'available', '{"id":1,"name":"Cummins X15"}'),
    ($2, 2, 'PD-1', 'Cat C15', 'Complete Engine', 'available', '{"id":2,"name":"Cat C15"}')`, [RC_TENANT, B]);
  await db.query(`insert into storage.objects (bucket_id, name) values
    ('engine-photos', 'bh-001.jpg'), ('ecm-files', '9/log.csv'),
    ('engine-photos', '${RC_TENANT}/rc-2.jpg'), ('ecm-files', '${B}/5/b-log.csv'), ('engine-photos', '${B}/pd-1.jpg')`);
  // touch every login once so the fixture puts it in its shop
  for (const u of [rcOwner, rcStaff, rcMike, bOwner, bStaff, bEmp]) await rows(u, "select 1");
});

test("each login belongs to one shop and sees only that shop's row and memberships", async () => {
  assert.deepEqual((await rows(rcOwner, "select name from tenants")).map((r) => r.name), ["Rollin Coal"]);
  assert.deepEqual((await rows(bStaff, "select name from tenants")).map((r) => r.name), ["Prairie Diesel"]);
  assert.equal((await rows(stray, "select name from tenants")).length, 0);
  assert.equal((await rows(stray, "select public.current_tenant() as t"))[0].t, null);
  // the owner sees their shop's logins; staff only their own; nobody another shop's
  assert.deepEqual((await rows(bOwner, "select email from memberships order by email")).map((r) => r.email), ["office@b.test", "owner@b.test", "tech@b.test"]);
  assert.deepEqual((await rows(bStaff, "select email from memberships")).map((r) => r.email), ["office@b.test"]);
  assert.equal((await rows(rcOwner, "select 1 from memberships where tenant_id = $1", [B])).length, 0);
  // nobody joins a shop or moves themselves to another from the browser
  await refuses(asLogin(db, bOwner, "insert into memberships (user_id, tenant_id, role) values ($1, $2, 'owner')", [stray.id, RC_TENANT]), /permission denied|row-level security/);
  assert.equal((await rows(bOwner, "update memberships set tenant_id = $1 where user_id = $2 returning user_id", [RC_TENANT, bOwner.id])).length, 0);
  assert.equal((await db.query("select tenant_id from memberships where user_id = $1", [bOwner.id])).rows[0].tenant_id, B);
});

test("lists: a shop reads and writes only its own, even naming the other shop's id", async () => {
  assert.deepEqual((await rows(rcStaff, "select value->0->>'name' as n from tenant_state where key = 'rc:customers'")).map((r) => r.n), ["RC customer"]);
  assert.deepEqual((await rows(bStaff, "select value->0->>'name' as n from tenant_state where key = 'rc:customers'")).map((r) => r.n), ["B customer"]);
  // writing into Rollin Coal from shop B: refused, or touches nothing
  await refuses(asLogin(db, bOwner, "insert into tenant_state (tenant_id, key, value) values ($1, 'rc:customers', '[]')", [RC_TENANT]));
  assert.equal((await rows(bOwner, "update tenant_state set value = '[]' where tenant_id = $1 returning key", [RC_TENANT])).length, 0);
  assert.equal((await rows(bOwner, "delete from tenant_state where tenant_id = $1 returning key", [RC_TENANT])).length, 0);
  // a plain insert lands in the caller's own shop
  await rows(bStaff, "insert into tenant_state (key, value) values ('rc:quotes', '[{\"id\":9}]')");
  assert.equal((await db.query("select tenant_id from tenant_state where key = 'rc:quotes'")).rows[0].tenant_id, B);
  // employees and stray logins: nothing
  assert.equal((await rows(bEmp, "select key from tenant_state")).length, 0);
  assert.equal((await rows(stray, "select key from tenant_state")).length, 0);
  // the old single-shop table is closed to every login
  assert.equal((await rows(rcOwner, "select key from app_state")).length, 0);
  await refuses(asLogin(db, rcOwner, "insert into app_state (key, value) values ('rc:x', '[]')"));
});

test("merged saves stay inside the caller's shop", async () => {
  const add = (who, name) => asLogin(db, who, "select public.merge_list('rc:customers', $1::jsonb) as n", [JSON.stringify({ put: [{ id: 5, item: { id: 5, name } }], del: [] })]);
  await add(bOwner, "B second");
  await add(rcOwner, "RC second");
  const rc = (await db.query("select value from tenant_state where tenant_id = $1 and key = 'rc:customers'", [RC_TENANT])).rows[0].value;
  const b = (await db.query("select value from tenant_state where tenant_id = $1 and key = 'rc:customers'", [B])).rows[0].value;
  assert.deepEqual(rc.map((c) => c.name), ["RC customer", "RC second"]);
  assert.deepEqual(b.map((c) => c.name), ["B customer", "B second"]);
  // deleting id 1 in shop B leaves Rollin Coal's id 1 alone
  await asLogin(db, bOwner, "select public.merge_list('rc:customers', $1::jsonb)", [JSON.stringify({ put: [], del: ["1"] })]);
  assert.equal((await db.query("select jsonb_array_length(value) as n from tenant_state where tenant_id = $1 and key = 'rc:customers'", [RC_TENANT])).rows[0].n, 2);
  // a login in no shop can't create a list anywhere
  await refuses(add(stray, "nope"));
});

test("engines: each shop sees and changes only its own, and can't take over another's by id", async () => {
  assert.deepEqual((await rows(rcStaff, "select sku from inventory")).map((r) => r.sku), ["RC-1"]);
  assert.deepEqual((await rows(bStaff, "select sku from inventory")).map((r) => r.sku), ["PD-1"]);
  assert.equal((await rows(bOwner, "update inventory set price = 1 where id = 1 returning id")).length, 0);
  assert.equal((await rows(bOwner, "delete from inventory where id = 1 returning id")).length, 0);
  // merge_inventory naming Rollin Coal's engine id: refused, the engine untouched
  await refuses(asLogin(db, bOwner, "select public.merge_inventory($1::jsonb)", [JSON.stringify([{ id: 1, item: { id: 1, name: "Hijacked" } }])]));
  assert.equal((await rows(bOwner, "select public.merge_inventory($1::jsonb) as n", [JSON.stringify([{ id: 1, set: { name: "Hijacked" } }])]))[0].n, 0);   // a patch finds no row to patch
  assert.equal((await db.query("select name from inventory where id = 1")).rows[0].name, "Cummins X15");
  // a new engine lands in the caller's shop
  await asLogin(db, bOwner, "select public.merge_inventory($1::jsonb)", [JSON.stringify([{ id: 3, item: { id: 3, sku: "PD-2", name: "DD15", cat: "Complete Engine" } }])]);
  assert.equal((await db.query("select tenant_id from inventory where id = 3")).rows[0].tenant_id, B);
  assert.deepEqual((await rows(rcOwner, "select sku from inventory order by id")).map((r) => r.sku), ["RC-1"]);
  // the employee pick list is per shop too
  assert.deepEqual((await rows(rcMike, "select sku from public.engine_picklist()")).map((r) => r.sku), ["RC-1"]);
  assert.deepEqual((await rows(bEmp, "select sku from public.engine_picklist() order by sku")).map((r) => r.sku), ["PD-1", "PD-2"]);
  assert.equal((await rows(stray, "select sku from public.engine_picklist()")).length, 0);
});

test("timesheets and approvals: per shop, for owners, staff and employees", async () => {
  const add = (who, emp) => asLogin(db, who, "insert into timesheet_entries (id, employee_id, work_date, data) values ('x', $1, $2::date, '{\"start\":\"8:00 AM\",\"finish\":\"4:00 PM\"}')", [emp, today]);
  await add(rcMike, 101);
  await add(bEmp, 201);
  assert.deepEqual((await rows(rcStaff, "select employee_id from timesheet_entries")).map((r) => Number(r.employee_id)), [101]);
  assert.deepEqual((await rows(bStaff, "select employee_id from timesheet_entries")).map((r) => Number(r.employee_id)), [201]);
  assert.equal((await rows(bOwner, "update timesheet_entries set data = '{}' where employee_id = 101 returning id")).length, 0);
  assert.equal((await rows(bOwner, "delete from timesheet_entries where employee_id = 101 returning id")).length, 0);
  // shop B's owner can't write a day into Rollin Coal
  await refuses(asLogin(db, bOwner, "insert into timesheet_entries (tenant_id, id, employee_id, work_date, data) values ($1, 'x', 777, $2::date, '{}')", [RC_TENANT, today]));
  // approvals: B's owner approves in B; Rollin Coal never sees it, and B can't approve for Rollin Coal
  await rows(bOwner, "insert into timesheet_approvals (id, employee_id, start_date, end_date, data) values (50, 201, $1::date, $1::date, '{}')", [today]);
  assert.equal((await rows(rcOwner, "select id from timesheet_approvals")).length, 0);
  assert.equal((await rows(bEmp, "select id from timesheet_approvals")).length, 1);
  await refuses(asLogin(db, bOwner, "insert into timesheet_approvals (tenant_id, id, employee_id, start_date, end_date, data) values ($1, 51, 101, $2::date, $2::date, '{}')", [RC_TENANT, today]));
});

test("files: a shop reaches its own folder; Rollin Coal also keeps its older paths", async () => {
  const names = async (who) => (await rows(who, "select name from storage.objects")).map((r) => r.name).sort();
  assert.deepEqual(await names(rcStaff), ["9/log.csv", "bh-001.jpg", RC_TENANT + "/rc-2.jpg"]);
  assert.deepEqual(await names(bStaff), [B + "/5/b-log.csv", B + "/pd-1.jpg"]);
  assert.deepEqual(await names(bEmp), []);
  await refuses(asLogin(db, bOwner, "insert into storage.objects (bucket_id, name) values ('engine-photos', 'old-style.jpg')"));            // no legacy paths for new shops
  await refuses(asLogin(db, bOwner, "insert into storage.objects (bucket_id, name) values ('ecm-files', $1)", [RC_TENANT + "/7/x.csv"]));  // nor another shop's folder
  await refuses(asLogin(db, rcOwner, "insert into storage.objects (bucket_id, name) values ('ecm-files', $1)", [B + "/7/x.csv"]));
  await rows(bOwner, "insert into storage.objects (bucket_id, name) values ('ecm-files', $1)", [B + "/7/x.csv"]);
  await rows(rcOwner, "insert into storage.objects (bucket_id, name) values ('ecm-files', '12/y.csv')");
  assert.equal((await rows(bOwner, "delete from storage.objects where name like '9/%' returning name")).length, 0);
});

test("an owner edits their own shop's name and profile, nothing else", async () => {
  await rows(bOwner, "select public.update_shop_profile('Prairie Diesel Ltd', '{\"phone\":\"306-555-0100\"}'::jsonb)");
  const b = (await db.query("select name, profile, plan from tenants where id = $1", [B])).rows[0];
  assert.deepEqual([b.name, b.profile.phone, b.plan], ["Prairie Diesel Ltd", "306-555-0100", "pilot"]);
  assert.equal((await db.query("select name from tenants where id = $1", [RC_TENANT])).rows[0].name, "Rollin Coal");
  await refuses(asLogin(db, bStaff, "select public.update_shop_profile('x', '{}'::jsonb)"));
  await refuses(asLogin(db, stray, "select public.update_shop_profile('x', '{}'::jsonb)"));
  assert.equal((await rows(bOwner, "update tenants set plan = 'free' returning id")).length, 0);   // no direct writes at all
});

test("timesheets fill in per shop, each in its own time zone", async () => {
  // 4:30 PM in Medicine Hat (MDT, UTC-6) is 4:30 PM in Regina too in October; in January
  // Regina (no daylight saving, UTC-6) is an hour ahead of Medicine Hat (MST, UTC-7).
  const n = (await db.query("select public.ts_autofill('2027-01-13T22:30:00Z'::timestamptz) as n")).rows[0].n;   // Wed: 3:30 PM MH, 4:30 PM Regina
  assert.equal(n, 1);
  const filled = (await db.query("select tenant_id, employee_id from timesheet_entries where work_date = '2027-01-13'")).rows;
  assert.deepEqual(filled.map((r) => [r.tenant_id, Number(r.employee_id)]), [[B, 201]]);
  assert.equal((await db.query("select public.ts_autofill('2027-01-13T23:30:00Z'::timestamptz) as n")).rows[0].n, 1);   // 4:30 PM MH: now Mike
});

// ── the Edge Functions, through the mock Supabase ──
const SB = "http://sb.test";
test("team-logins: an owner manages only their own shop's logins", async () => {
  const sb = await mockSupabase({ users: [
    { email: "owner@rc.test", password: "x", app_metadata: { role: "owner" } },
    { email: "owner@b.test", password: "x", app_metadata: { role: "owner" }, tenant: B },
    { email: "tech@b.test", password: "x", app_metadata: { role: "employee", employeeId: 201, name: "B Tech" }, tenant: B },
  ], tenants: [{ id: B, name: "Prairie Diesel" }] });
  await sb.sql("insert into tenant_state (tenant_id, key, value) values ($1, 'rc:employees', $2::jsonb), ($3, 'rc:employees', $4::jsonb)",
    [RC_TENANT, JSON.stringify([{ id: 101, name: "Mike Test" }]), B, JSON.stringify([{ id: 201, name: "B Tech" }, { id: 202, name: "B Second" }])]);
  globalThis.fetch = async (input, init) => sb.handle(input instanceof Request ? input : new Request(String(input), init));
  const fn = await loadEdgeFunction("team-logins", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey });
  const call = async (u, body) => { const r = await fn(new Request(SB + "/functions/v1/team-logins", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + sb.session(u).access_token }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };
  const [rcO, bO] = sb.users;
  assert.deepEqual((await call(rcO, { action: "list" })).body.logins.map((l) => l.email), ["owner@rc.test"]);
  assert.deepEqual((await call(bO, { action: "list" })).body.logins.map((l) => l.email).sort(), ["owner@b.test", "tech@b.test"]);
  // B's owner makes a login for B's Team member: it joins shop B
  const made = await call(bO, { action: "create", employeeId: 202, email: "second@b.test", password: "coal-4821-turbo", role: "employee" });
  assert.equal(made.status, 200, JSON.stringify(made.body));
  assert.deepEqual((await sb.sql("select tenant_id, role, employee_id from memberships where email = 'second@b.test'")).map((r) => [r.tenant_id, r.role, Number(r.employee_id)]), [[B, "employee", 202]]);
  // ...but not for Rollin Coal's Mike, and Rollin Coal's owner can't touch B's logins
  assert.equal((await call(bO, { action: "create", employeeId: 101, email: "mike2@b.test", password: "coal-4821-turbo", role: "employee" })).status, 400);
  const tech = sb.users.find((u) => u.email === "tech@b.test");
  for (const body of [{ action: "password", userId: tech.id, password: "new-pass-123" }, { action: "access", userId: tech.id, role: "staff" }, { action: "remove", userId: tech.id }]) {
    const r = await call(rcO, body);
    assert.equal(r.status, 400); assert.match(r.body.error, /doesn't exist/);
  }
  assert.ok(sb.users.some((u) => u.email === "tech@b.test"));
});

test("the brief: a user gets their own shop's; cron runs each shop on its own data", async () => {
  const sb = await mockSupabase({ users: [{ email: "owner@rc.test", password: "x", app_metadata: { role: "owner" } }], tenants: [{ id: B, name: "Prairie Diesel", profile: { email: "owner@b.test" } }] });
  await sb.sql("insert into tenant_state (tenant_id, key, value) values ($1, 'rc:invoices', $2::jsonb)", [B, JSON.stringify([{ id: 1, invNum: "B-1", date: "2020-01-01", due: "Net 30", status: "pending", taxRate: 0.05, items: [{ d: "Work", q: 1, r: 1000 }] }])]);
  globalThis.fetch = async (input, init) => { const u = String(input instanceof Request ? input.url : input); return u.startsWith(SB) ? sb.handle(input instanceof Request ? input : new Request(u, init)) : new Response("{}", { status: 503 }); };
  const brief = await loadEdgeFunction("brief", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey });
  const send = async (tok) => (await brief(new Request(SB + "/functions/v1/brief?force=1", { method: "POST", headers: { Authorization: "Bearer " + tok } }))).json();
  const mine = await send(sb.session(sb.users[0]).access_token);
  assert.equal(mine.tenant, RC_TENANT);
  assert.doesNotMatch(mine.text, /overdue invoice/);              // B's overdue invoice isn't Rollin Coal's
  const all = await send(sb.serviceKey);
  assert.equal(all.shops, 2);
  const b = all.results.find((r) => r.tenant === B);
  assert.match(b.text, /1 overdue invoice \(\$1,050\)/);
  const stored = await sb.sql("select tenant_id from tenant_state where key = 'rc:brief' order by tenant_id");
  assert.deepEqual(stored.map((r) => r.tenant_id).sort(), [B, RC_TENANT].sort());
});

test("the brief carries each shop's own name", async () => {
  const sb = await mockSupabase({ users: [], tenants: [{ id: B, name: "Prairie Diesel", profile: { address: "12 Main St, Swift Current, SK" } }] });
  globalThis.fetch = async (input, init) => { const u = String(input instanceof Request ? input.url : input); return u.startsWith(SB) ? sb.handle(input instanceof Request ? input : new Request(u, init)) : new Response("{}", { status: 503 }); };
  const brief = await loadEdgeFunction("brief", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey });
  const all = await (await brief(new Request(SB + "/functions/v1/brief?force=1&tenant=" + B, { method: "POST", headers: { Authorization: "Bearer " + sb.serviceKey } }))).json();
  const b = all.results[0];
  assert.match(b.subject, /Prairie Diesel brief/);
  assert.match(b.text, /^PRAIRIE DIESEL — MORNING BRIEF/);
  assert.doesNotMatch(b.text, /Rollin Coal/i);
  const html = (await sb.sql("select value->>'html' as h from tenant_state where tenant_id = $1 and key = 'rc:brief'", [B]))[0].h;
  assert.match(html, /Swift Current, SK/); assert.doesNotMatch(html, /Rollin Coal|Medicine Hat/);
});
