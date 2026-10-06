// The database rules from migration 0011, checked in a real Postgres (PGlite):
// employee logins reach only their own timesheet, can't fill in tomorrow, can't
// change an approved pay period, can delete only today, and every change keeps
// the old version.
// Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asLogin } from "./fixtures/pg.mjs";

const owner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@shop.test", app_metadata: { role: "owner" } };
const staff = { id: "00000000-0000-4000-8000-000000000002", email: "office@shop.test" };
const mike = { id: "00000000-0000-4000-8000-000000000003", email: "mike@shop.test", app_metadata: { role: "employee", employeeId: 101, name: "Mike Test" } };
const bob = { id: "00000000-0000-4000-8000-000000000004", email: "bob@shop.test", app_metadata: { role: "employee", employeeId: 102, name: "Bob Jones" } };
let db, today, D;
const day = (n) => D(n);   // a date n days from today in Medicine Hat
const add = (who, emp, date, start = "8:00 AM", finish = "4:00 PM", notes = "") =>
  asLogin(db, who, "insert into timesheet_entries (id, employee_id, work_date, data) values ($1, $2, $3::date, $4::jsonb)",
    ["x", emp, date, JSON.stringify({ start, finish, notes })]);
const change = (who, emp, date, vals) =>
  asLogin(db, who, "update timesheet_entries set data = data || $3::jsonb where employee_id = $1 and work_date = $2::date", [emp, date, JSON.stringify(vals)]);
const rows = async (who, sql, params) => (await asLogin(db, who, sql, params)).rows;
const refuses = async (p, re = /row-level security/) => assert.rejects(p, re);

before(async () => {
  db = await freshDb();
  today = (await db.query("select public.shop_today()::text as d")).rows[0].d;
  D = (n) => { const x = new Date(today + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  await db.query("insert into app_state (key, value) values ('rc:customers', '[{\"id\":1,\"name\":\"Smoke Test Hauling\"}]'), ('rc:employees', '[{\"id\":101,\"name\":\"Mike Test\",\"rate\":40}]')");
  await db.query("insert into inventory (id, sku, name, data) values (1, 'BH-001', 'ISX15', '{}')");
  await db.query("insert into storage.objects (bucket_id, name) values ('engine-photos', 'bh-001.jpg'), ('ecm-files', '9/log.csv')");
});

test("an employee login can't read or write any other shop data", async () => {
  assert.equal((await rows(mike, "select key from app_state")).length, 0);
  assert.equal((await rows(mike, "select id from inventory")).length, 0);
  assert.equal((await rows(mike, "select name from storage.objects")).length, 0);
  await refuses(asLogin(db, mike, "insert into app_state (key, value) values ('rc:customers', '[]')"));
  await refuses(asLogin(db, mike, "insert into storage.objects (bucket_id, name) values ('ecm-files', 'x')"));
  assert.equal((await rows(mike, "update app_state set value = '[]' where key = 'rc:customers' returning key")).length, 0);
  // office staff and the owner still have the whole dashboard
  assert.equal((await rows(staff, "select key from app_state")).length, 2);
  assert.equal((await rows(staff, "select name from storage.objects")).length, 2);
  assert.equal((await rows(owner, "select id from inventory")).length, 1);
  assert.equal((await rows("anon", "select key from app_state")).length, 0);
});

test("an employee fills in today and earlier days, never tomorrow, and only their own", async () => {
  await add(mike, 101, day(0));
  await add(mike, 101, day(-3), "7:00 AM", "5:30 PM", "Unit 412");
  await refuses(add(mike, 101, day(1)));
  await refuses(add(mike, 102, day(0)));                       // someone else's timesheet
  const mine = await rows(mike, "select id, data from timesheet_entries order by work_date");
  assert.deepEqual(mine.map((r) => r.id), ["101|" + day(-3), "101|" + day(0)]);   // the id comes from the database
  assert.equal(mine[1].data.by, "mike@shop.test"); assert.deepEqual(mine[1].data.history, []);
  await add(bob, 102, day(0));
  assert.equal((await rows(mike, "select id from timesheet_entries")).length, 2);   // Bob's day stays hidden from Mike
  assert.equal((await rows(staff, "select id from timesheet_entries")).length, 3);  // office staff see everyone
});

test("changing a past day keeps the old version in its history, whatever the app sends", async () => {
  await change(mike, 101, day(-3), { finish: "6:00 PM", history: [] });
  const [r] = await rows(mike, "select data from timesheet_entries where work_date = $1::date", [day(-3)]);
  assert.equal(r.data.finish, "6:00 PM");
  assert.equal(r.data.history.length, 1);
  assert.equal(r.data.history[0].finish, "5:30 PM"); assert.equal(r.data.history[0].notes, "Unit 412");
  await change(mike, 101, day(-3), { finish: "6:00 PM" });     // no real change: no new history
  const [again] = await rows(mike, "select data from timesheet_entries where work_date = $1::date", [day(-3)]);
  assert.equal(again.data.history.length, 1);
});

test("an employee deletes only today's day; an earlier day is cleared by saving it empty", async () => {
  await add(mike, 101, day(-1));
  assert.equal((await rows(mike, "delete from timesheet_entries where work_date = $1::date returning id", [day(-1)])).length, 0);
  await change(mike, 101, day(-1), { start: "", finish: "", notes: "" });
  const [r] = await rows(mike, "select data from timesheet_entries where work_date = $1::date", [day(-1)]);
  assert.equal(r.data.start, "");
  assert.equal(r.data.history.at(-1).start, "8:00 AM");      // the owner still sees what it said
  assert.equal((await rows(mike, "delete from timesheet_entries where work_date = $1::date returning id", [day(0)])).length, 1);
  await add(mike, 101, day(0));
});

test("office staff look only; the owner fills in any day up to today", async () => {
  await refuses(add(staff, 101, day(-1)));
  assert.equal((await rows(staff, "update timesheet_entries set data = data || '{\"finish\":\"9:00 PM\"}' where employee_id = 101 returning id")).length, 0);
  await add(owner, 102, day(-1), "8:00 AM", "6:00 PM");
  await refuses(add(owner, 101, day(1)));
});

test("approving a pay period locks those days for the employee, not the owner", async () => {
  const start = day(-6), end = day(-2);
  await refuses(asLogin(db, staff, "insert into timesheet_approvals (id, employee_id, start_date, end_date, data) values (1, 101, $1::date, $2::date, '{}')", [start, end]));
  await refuses(asLogin(db, mike, "insert into timesheet_approvals (id, employee_id, start_date, end_date, data) values (1, 101, $1::date, $2::date, '{}')", [start, end]));
  await asLogin(db, owner, "insert into timesheet_approvals (id, employee_id, start_date, end_date, data) values (1, 101, $1::date, $2::date, '{}')", [start, end]);
  assert.equal((await rows(mike, "select id from timesheet_approvals")).length, 1);   // Mike sees his own approval
  assert.equal((await rows(bob, "select id from timesheet_approvals")).length, 0);
  // the locked day (3 days ago) can't be changed, cleared or re-added by Mike
  assert.equal((await rows(mike, "update timesheet_entries set data = data || '{\"finish\":\"11:00 PM\"}' where work_date = $1::date returning id", [day(-3)])).length, 0);
  assert.equal((await rows(mike, "delete from timesheet_entries where work_date = $1::date returning id", [day(-3)])).length, 0);
  await refuses(add(mike, 101, day(-4)));
  const [kept] = await rows(owner, "select data from timesheet_entries where employee_id = 101 and work_date = $1::date", [day(-3)]);
  assert.equal(kept.data.finish, "6:00 PM");
  // today is outside the approved period, so Mike can still fix it
  assert.equal((await rows(mike, "update timesheet_entries set data = data || '{\"finish\":\"4:30 PM\"}' where work_date = $1::date returning id", [day(0)])).length, 1);
  // the owner can still correct a locked day
  assert.equal((await rows(owner, "update timesheet_entries set data = data || '{\"finish\":\"5:00 PM\"}' where employee_id = 101 and work_date = $1::date returning id", [day(-3)])).length, 1);
});
