// Engines on the timesheet (migration 0015): an employee picks from a list of the engines
// that aren't sold (stock #, name and stage only), and a change to a day's engines is kept
// in its history like the times. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asLogin } from "./fixtures/pg.mjs";

const owner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@shop.test", app_metadata: { role: "owner" } };
const nobody = { id: "00000000-0000-4000-8000-000000000005", email: "new@shop.test" };
const mike = { id: "00000000-0000-4000-8000-000000000003", email: "mike@shop.test", app_metadata: { role: "employee", employeeId: 101, name: "Mike Test" } };
let db, today;
const rows = async (who, sql, params) => (await asLogin(db, who, sql, params)).rows;

before(async () => {
  db = await freshDb();
  today = (await db.query("select public.shop_today()::text as d")).rows[0].d;
  await db.query(`insert into inventory (id, sku, name, cat, status, price, cost, data) values
    (1, 'RC-CUX152021-001', 'Cummins X15', 'Complete Engine', 'in-reman', 52000, 2000, '{}'),
    (2, 'RC-CAC2005-001', 'Caterpillar C7', 'Complete Engine', 'sold', 42000, 3500, '{}'),
    (3, 'INJ-1', 'Injector', 'Injectors', null, 300, 100, '{}')`);
});

test("employees get the engines to pick from, nothing else and nothing sold", async () => {
  assert.equal((await rows(mike, "select id from inventory")).length, 0);
  const list = await rows(mike, "select * from public.engine_picklist()");
  assert.deepEqual(list.map((r) => [Number(r.id), r.sku, r.status]), [[1, "RC-CUX152021-001", "in-reman"]]);
  assert.deepEqual(Object.keys(list[0]).sort(), ["id", "name", "sku", "status"]);
  assert.equal((await rows(owner, "select * from public.engine_picklist()")).length, 1);
  assert.equal((await rows(nobody, "select * from public.engine_picklist()")).length, 0);
  await assert.rejects(asLogin(db, "anon", "select * from public.engine_picklist()"), /permission denied/);
});

test("a change to the engines alone is kept in the day's history", async () => {
  const work = [{ engineId: 1, sku: "RC-CUX152021-001", name: "Cummins X15", hours: 8, note: "" }];
  await asLogin(db, mike, "insert into timesheet_entries (id, employee_id, work_date, data) values ('x', 101, $1::date, $2::jsonb)", [today, JSON.stringify({ start: "8:00 AM", finish: "4:00 PM", notes: "", work })]);
  await asLogin(db, mike, "update timesheet_entries set data = data || $2::jsonb where employee_id = 101 and work_date = $1::date", [today, JSON.stringify({ work: [{ ...work[0], hours: 6 }] })]);
  const [r] = await rows(mike, "select data from timesheet_entries where employee_id = 101");
  assert.equal(r.data.work[0].hours, 6);
  assert.equal(r.data.history.length, 1);
  assert.equal(r.data.history[0].work[0].hours, 8);
  // saving the same engines again isn't a change
  await asLogin(db, mike, "update timesheet_entries set data = data || '{}'::jsonb where employee_id = 101");
  assert.equal((await rows(mike, "select data from timesheet_entries where employee_id = 101"))[0].data.history.length, 1);
});
