// Timesheets fill in by themselves (migration 0016): once the day's shift is over in Medicine
// Hat (4:00 PM Monday to Thursday, 1:00 PM Friday), every active Team member not set to "off"
// gets that day's hours, unless the day already has a row. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, asLogin } from "./fixtures/pg.mjs";
import * as T from "../src/lib/timesheet.js";

const owner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@shop.test", app_metadata: { role: "owner" } };
const mike = { id: "00000000-0000-4000-8000-000000000003", email: "mike@shop.test", app_metadata: { role: "employee", employeeId: 101, name: "Mike Test" } };
let db;
// Medicine Hat is UTC-6 in October (MDT).
const at = (local) => new Date(local + "-06:00").toISOString();
const fill = async (local) => (await db.query("select public.ts_autofill($1::timestamptz) as n", [at(local)])).rows[0].n;
const day = async (emp, date) => ((await db.query("select data from timesheet_entries where employee_id = $1 and work_date = $2::date", [emp, date])).rows[0] || {}).data || null;

before(async () => {
  db = await freshDb();
  await db.query(`insert into app_state (key, value) values ('rc:employees', $1::jsonb)`, [JSON.stringify([
    { id: 101, name: "Mike Test", status: "active" },
    { id: 102, name: "Austin", status: "active", autoTs: "off" },
    { id: 103, name: "Kendall", status: "active", autoTs: "on" },
    { id: 104, name: "Gone", status: "inactive" },
  ])]);
});

test("nothing before the day is over, then the full day for everyone on auto", async () => {
  assert.equal(await fill("2026-10-14T15:59:00"), 0);            // Wednesday, 3:59 PM
  assert.equal(await day(101, "2026-10-14"), null);
  assert.equal(await fill("2026-10-14T16:07:00"), 2);            // 4:07 PM: Mike and Kendall, not Austin or the inactive one
  const m = await day(101, "2026-10-14");
  assert.deepEqual([m.start, m.finish, m.auto, m.by, m.history.length], ["8:00 AM", "4:00 PM", true, "shop", 0]);
  assert.equal(await day(102, "2026-10-14"), null);
  assert.equal(await day(104, "2026-10-14"), null);
  assert.equal(await fill("2026-10-14T17:07:00"), 0);            // later runs add nothing
  // it adds up like any day: 8 h, no overtime
  assert.equal(T.computeDays([{ ...m, date: "2026-10-14" }]).days["2026-10-14"].min, 480);
});

test("Friday is 8:00 AM to 1:00 PM, weekends get nothing, a day already filled in is left alone", async () => {
  await db.query("insert into timesheet_entries (id, employee_id, work_date, data) values ('x', 101, '2026-10-16', $1::jsonb) on conflict do nothing", [JSON.stringify({ start: "7:00 AM", finish: "3:00 PM", notes: "" })]);
  assert.equal(await fill("2026-10-16T12:59:00"), 0);            // Friday, 12:59 PM
  assert.equal(await fill("2026-10-16T13:07:00"), 1);            // Kendall only: Mike already has his day
  assert.deepEqual([(await day(103, "2026-10-16")).finish, (await day(101, "2026-10-16")).finish], ["1:00 PM", "3:00 PM"]);
  assert.equal(await fill("2026-10-17T18:00:00"), 0);            // Saturday
  assert.equal(T.fullDayMin("2026-10-16"), 300); assert.equal(T.fullDay("2026-10-15").finish, "4:00 PM");
});

test("only the database and the service role can run it", async () => {
  await assert.rejects(asLogin(db, owner, "select public.ts_autofill()"), /permission denied/);
  await assert.rejects(asLogin(db, mike, "select public.ts_autofill()"), /permission denied/);
  await asLogin(db, "service", "select public.ts_autofill($1::timestamptz)", [at("2026-10-13T16:30:00")]);
  assert.equal((await day(103, "2026-10-13")).finish, "4:00 PM");
  // an auto-filled day can still be changed (here by the owner), and the change is kept in its history
  await asLogin(db, owner, "update timesheet_entries set data = data || $1::jsonb where employee_id = 101 and work_date = '2026-10-14'", [JSON.stringify({ finish: "5:30 PM" })]);
  const m = await day(101, "2026-10-14");
  assert.deepEqual([m.finish, m.history.length, m.history[0].finish, m.by], ["5:30 PM", 1, "4:00 PM", "owner@shop.test"]);
});
