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
  await sb.sql("insert into timesheet_entries (tenant_id, id, employee_id, work_date, data) select 'c0a10000-0000-4000-8000-000000000001', 'x', 102, d::date, '{}'::jsonb from generate_series(date '2020-01-01', date '2020-01-01' + 1049, interval '1 day') d");
  const all = JSON.parse(await owner.db.getItem("rc:timesheets"));
  assert.equal(all.filter((r) => String(r.emp) === "102").length, 1050);
  const both = await owner.db.getAll(["rc:timesheets", "rc:inventory"]);
  assert.equal(JSON.parse(both["rc:timesheets"]).length, 1050);
});

test("one refused day doesn't stop the others from saving, and is reported", async () => {
  await sb.sql("insert into timesheet_approvals (tenant_id, id, employee_id, start_date, end_date, data) values ('c0a10000-0000-4000-8000-000000000001', 7, 101, $1::date, $2::date, '{}')", [day(-3), day(-2)]);
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

test("before migration 0017 (no shops yet) the same build still reads and saves app_state", async () => {
  const old = await mockSupabase({ users: [{ email: "owner@old.test", password: "owner-pass-1", app_metadata: { role: "owner" } }], skip: ["0017_shops.sql"] });
  const keep = globalThis.fetch;
  globalThis.fetch = async (input, init) => old.handle(input instanceof Request ? input : new Request(String(input), init));
  try {
    await old.sql("insert into app_state (key, value) values ('rc:customers', '[{\"id\":1,\"name\":\"Base Hauling\"}]')");
    const dev = await loadDevice({ url: SB, anonKey: old.anonKey, email: "owner@old.test", password: "owner-pass-1" });
    assert.equal((await dev.getShop()).pre, true);
    assert.equal(await dev.shopFolder(), "");
    const got = (await dev.db.getAll(["rc:customers"]))["rc:customers"];
    assert.deepEqual(JSON.parse(got).map((c) => c.name), ["Base Hauling"]);
    await dev.db.setItem("rc:customers", JSON.stringify([...JSON.parse(got), { id: 2, name: "New" }]), got);
    assert.deepEqual((await old.sql("select value from app_state where key = 'rc:customers'"))[0].value.map((c) => c.name), ["Base Hauling", "New"]);
  } finally { globalThis.fetch = keep; }
});

test("after 0017 a login gets its shop, and files go in the shop's folder", async () => {
  const shop = await owner.getShop();
  assert.equal(shop.id, "c0a10000-0000-4000-8000-000000000001");
  assert.equal(shop.name, "Rollin Coal");
  assert.equal(await owner.shopFolder(), shop.id + "/");
});

test("the owner saves the shop profile; an employee can't", async () => {
  const sh = await owner.saveShopProfile("Rollin Coal", { phone: "1-587-863-0505", tagline: "Canada's Diesel Engine Specialists" });
  assert.equal(sh.profile.phone, "1-587-863-0505");
  await assert.rejects(mike.saveShopProfile("Mike's shop", {}), /Only the shop's owner/);
  assert.equal((await owner.getShop()).name, "Rollin Coal");
});
