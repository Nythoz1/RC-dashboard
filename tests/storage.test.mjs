// The dashboard's storage layer against the mock Supabase (real migrations and
// row-level security underneath): long tables read in full, and a row the
// database refuses doesn't stop the others from saving. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";
import { loadDevice } from "./fixtures/client.mjs";

const SB = "http://sb.test";
let sb, owner, mike, today;
const users = [
  { email: "owner@shop.test", password: "owner-pass-1", app_metadata: { role: "owner" } },
  { email: "mike@shop.test", password: "mike-pass-1", app_metadata: { role: "employee", employeeId: 101, name: "Mike Test" } },
];
const day = (n) => { const x = new Date(today + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const entry = (emp, date, vals = {}) => ({ id: emp + "|" + date, emp, date, start: "8:00 AM", finish: "4:00 PM", notes: "", ...vals });

before(async () => {
  sb = await mockSupabase({ users });
  globalThis.fetch = async (input, init) => sb.handle(input instanceof Request ? input : new Request(String(input), init));
  today = (await sb.sql("select public.shop_today()::text as d"))[0].d;
  owner = await loadDevice({ url: SB, anonKey: sb.anonKey, email: users[0].email, password: users[0].password });
  mike = await loadDevice({ url: SB, anonKey: sb.anonKey, email: users[1].email, password: users[1].password });
});

test("a table longer than one page (1,000 rows) still loads in full", async () => {
  await sb.sql("insert into timesheet_entries (id, employee_id, work_date, data) select 'x', 102, d::date, '{}'::jsonb from generate_series(date '2020-01-01', date '2020-01-01' + 1049, interval '1 day') d");
  const all = JSON.parse(await owner.db.getItem("rc:timesheets"));
  assert.equal(all.filter((r) => String(r.emp) === "102").length, 1050);
  const both = await owner.db.getAll(["rc:timesheets", "rc:inventory"]);
  assert.equal(JSON.parse(both["rc:timesheets"]).length, 1050);
});

test("one refused day doesn't stop the others from saving, and is reported", async () => {
  await sb.sql("insert into timesheet_approvals (id, employee_id, start_date, end_date, data) values (7, 101, $1::date, $2::date, '{}')", [day(-3), day(-2)]);
  const locked = entry(101, day(-2)), fresh = entry(101, day(0));
  const res = await mike.db.setItem("rc:timesheets", JSON.stringify([locked, fresh]), JSON.stringify([]));
  assert.deepEqual(res.refused.map((r) => r.id), ["101|" + day(-2)]);
  assert.equal(res.refused[0].code, "42501");
  const mine = await sb.sql("select id from timesheet_entries where employee_id = 101 order by id");
  assert.deepEqual(mine.map((r) => r.id), ["101|" + day(0)]);
});

test("a delete the database refuses is reported instead of looking done", async () => {
  const fresh = entry(101, day(0));
  const res = await mike.db.setItem("rc:timesheets", JSON.stringify([]), JSON.stringify([fresh]));
  assert.deepEqual(res.refused.map((r) => String(r.id)), ["101|" + day(0)]);
  assert.equal((await sb.sql("select count(*)::int as n from timesheet_entries where employee_id = 101"))[0].n, 1);
});

test("a save that never reaches the database throws, so the app can retry it", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  try {
    await assert.rejects(owner.db.setItem("rc:customers", JSON.stringify([{ id: 1, name: "Smoke Test Hauling" }]), JSON.stringify([])));
  } finally { globalThis.fetch = real; }
});
