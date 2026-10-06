// Timesheet hours, Alberta overtime, the full-day button and who may change a day.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../src/lib/timesheet.js";

const H = (min) => +(min / 60).toFixed(2);
const days = (map) => Object.entries(map).map(([date, [start, finish]]) => ({ date, start, finish }));
const weekOf = (calc, iso) => calc.weeks[T.weekStart(iso)];

// ── a day ──
test("a full day is 8:00 AM to 4:00 PM: 8.00 h, lunch paid, all regular", () => {
  const d = T.computeDays(days({ "2026-10-05": [T.FULL_DAY.start, T.FULL_DAY.finish] })).days["2026-10-05"];
  assert.equal(H(d.min), 8); assert.equal(H(d.regMin), 8); assert.equal(H(d.otMin), 0);
});
test("7:00 AM to 5:30 PM is 10.50 h: 8 regular + 2.5 OT", () => {
  const d = T.computeDays(days({ "2026-10-02": ["7:00 AM", "5:30 PM"] })).days["2026-10-02"];
  assert.equal(H(d.min), 10.5); assert.equal(H(d.regMin), 8); assert.equal(H(d.otMin), 2.5);
});
test("the full-day button is for Monday to Friday", () => {
  assert.deepEqual(["2026-10-05", "2026-10-09", "2026-10-10", "2026-10-11"].map(T.isWeekday), [true, true, false, false]);
});

// ── a week ──
test("five 9.5-h days: daily OT 7.5 beats weekly 3.5, so 7.5 OT", () => {
  const map = {}; ["05", "06", "07", "08", "09"].forEach((d) => { map["2026-10-" + d] = ["7:00 AM", "4:30 PM"]; });
  const w = weekOf(T.computeDays(days(map)), "2026-10-05");
  assert.equal(H(w.min), 47.5); assert.equal(H(w.dailyMin), 7.5); assert.equal(H(w.weeklyMin), 3.5);
  assert.equal(H(w.otMin), 7.5); assert.equal(w.rule, "daily");
});
test("six full days: weekly 4 beats daily 0, so 4 OT, on the Saturday", () => {
  const map = {}; ["12", "13", "14", "15", "16", "17"].forEach((d) => { map["2026-10-" + d] = ["8:00 AM", "4:00 PM"]; });
  const c = T.computeDays(days(map)); const w = weekOf(c, "2026-10-12");
  assert.equal(H(w.dailyMin), 0); assert.equal(H(w.weeklyMin), 4); assert.equal(H(w.otMin), 4); assert.equal(w.rule, "weekly");
  assert.equal(H(c.days["2026-10-17"].otMin), 4); assert.equal(H(c.days["2026-10-12"].otMin), 0);
});
test("a mixed week keeps each day's own over-8 and puts the rest of the 44-h overage on the last day", () => {
  const map = {}; ["05", "06", "07", "08", "09"].forEach((d) => { map["2026-10-" + d] = ["8:00 AM", "5:00 PM"]; }); map["2026-10-10"] = ["8:00 AM", "2:00 PM"];
  const c = T.computeDays(days(map)); const w = weekOf(c, "2026-10-05");
  assert.equal(H(w.otMin), 7); assert.equal(w.rule, "weekly");
  assert.equal(H(c.days["2026-10-05"].otMin), 1); assert.equal(H(c.days["2026-10-10"].otMin), 2);
});
test("a week that crosses into the next month is still one week (Monday to Sunday)", () => {
  const map = {}; ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"].forEach((d) => { map[d] = ["8:00 AM", "4:00 PM"]; });
  const c = T.computeDays(days(map)); const w = weekOf(c, "2026-10-01");
  assert.equal(w.start, "2026-09-28"); assert.equal(H(w.otMin), 4); assert.equal(H(c.days["2026-10-03"].otMin), 4);
});

// ── checks and flags ──
test("the day editor's checks: both times or neither, finish after start, a warning past 14 h", () => {
  assert.equal(T.checkTimes("", "").ok, true);
  assert.equal(T.checkTimes("8:00 AM", "").ok, false);
  assert.equal(T.checkTimes("4:00 PM", "8:00 AM").ok, false);
  assert.equal(H(T.checkTimes("8:00 AM", "4:00 PM").min), 8);
  const long = T.checkTimes("5:00 AM", "9:00 PM");
  assert.equal(long.ok, true); assert.match(long.warn, /over 14 hours/);
});
test("flags for the owner: over 14 hours, times on a sick day", () => {
  const rows = [{ date: "2026-10-21", start: "6:00 AM", finish: "9:00 PM" }, { date: "2026-10-20", start: "8:00 AM", finish: "12:00 PM", notes: "Sick" }, { date: "2026-10-22", start: "8:00 AM", finish: "4:00 PM" }];
  const c = T.computeDays(rows);
  const f = (i) => T.dayFlags(rows[i], c.days[rows[i].date]).map((x) => x.k);
  assert.deepEqual(f(0), ["long"]); assert.deepEqual(f(1), ["leave"]); assert.deepEqual(f(2), []);
});
test("time inputs: 08:00 ↔ 8:00 AM, 16:30 ↔ 4:30 PM", () => {
  assert.equal(T.fromTimeInput("08:00"), "8:00 AM"); assert.equal(T.fromTimeInput("16:30"), "4:30 PM");
  assert.equal(T.toTimeInput("8:00 AM"), "08:00"); assert.equal(T.toTimeInput("4:30 PM"), "16:30"); assert.equal(T.toTimeInput(""), "");
});

// ── who may change a day ──
test("today and past days can be filled in; future days can't, by anyone", () => {
  const today = "2026-10-06";
  for (const role of ["employee", "owner"]) {
    assert.equal(T.dayAccess({ date: "2026-10-06", today, role }).can, true, role + " today");
    assert.equal(T.dayAccess({ date: "2026-10-02", today, role }).can, true, role + " a past day");
    assert.deepEqual(T.dayAccess({ date: "2026-10-07", today, role }), { can: false, why: "future" }, role + " tomorrow");
  }
});
test("an approved pay period locks its days for the employee, not the owner; staff only look", () => {
  const periods = [{ id: 1, emp: 7, start: "2026-09-01", end: "2026-09-30" }];
  const locked = !!T.lockedBy(periods, 7, "2026-09-15");
  assert.equal(locked, true); assert.equal(!!T.lockedBy(periods, 8, "2026-09-15"), false);
  assert.deepEqual(T.dayAccess({ date: "2026-09-15", today: "2026-10-06", locked, role: "employee" }), { can: false, why: "locked" });
  assert.equal(T.dayAccess({ date: "2026-09-15", today: "2026-10-06", locked, role: "owner" }).can, true);
  assert.deepEqual(T.dayAccess({ date: "2026-10-01", today: "2026-10-06", role: "staff" }), { can: false, why: "staff" });
});
test("Medicine Hat's date, not the device's: 1 AM UTC on Oct 7 is still Oct 6 there", () => {
  assert.equal(T.shopToday(new Date("2026-10-07T01:00:00Z")), "2026-10-06");
  assert.equal(T.shopToday(new Date("2026-12-01T06:59:00Z")), "2026-11-30");
});

// ── saving a day ──
test("saving: one record per employee and day; the local mode keeps old versions", () => {
  const a = T.nextEntry(null, { start: "8:00 AM", finish: "4:00 PM" }, { emp: 7, date: "2026-10-05", by: "mike", now: "2026-10-05T22:00:00Z", keepHistory: true });
  assert.equal(a.id, "7|2026-10-05"); assert.deepEqual(a.history, []);
  const b = T.nextEntry(a, { start: "8:00 AM", finish: "6:00 PM", notes: "Unit 412" }, { emp: 7, date: "2026-10-05", by: "mike", now: "2026-10-07T15:00:00Z", keepHistory: true });
  assert.equal(b.finish, "6:00 PM"); assert.equal(b.createdAt, a.createdAt);
  assert.deepEqual(b.history, [{ at: "2026-10-05T22:00:00Z", by: "mike", start: "8:00 AM", finish: "4:00 PM", notes: "" }]);
  assert.equal(T.wasEdited(b), true); assert.equal(T.wasEdited(a), false);
  const same = T.nextEntry(b, { start: "8:00 AM", finish: "6:00 PM", notes: "Unit 412" }, { emp: 7, date: "2026-10-05", now: "2026-10-08T00:00:00Z", keepHistory: true });
  assert.equal(same.history.length, 1); assert.equal(same.updatedAt, b.updatedAt);
  const cloud = T.nextEntry(a, { start: "7:00 AM", finish: "4:00 PM" }, { emp: 7, date: "2026-10-05", keepHistory: false });
  assert.deepEqual(cloud.history, []);
});
test("a day first filled in on a later day counts as entered late", () => {
  assert.equal(T.enteredLate({ date: "2026-10-02", createdAt: "2026-10-05T15:00:00Z" }), true);
  assert.equal(T.enteredLate({ date: "2026-10-05", createdAt: "2026-10-06T03:00:00Z" }), false); // 9 PM on the 5th in Medicine Hat
});
test("a cleared day stays as an empty row with its history, and counts as not filled in", () => {
  const a = T.nextEntry(null, T.FULL_DAY, { emp: 7, date: "2026-10-02", now: "2026-10-02T22:00:00Z", keepHistory: true });
  const cleared = T.nextEntry(a, { start: "", finish: "", notes: "" }, { emp: 7, date: "2026-10-02", now: "2026-10-05T15:00:00Z", keepHistory: true });
  assert.equal(T.isFilled(a), true); assert.equal(T.isFilled(cleared), false);
  assert.equal(cleared.history[0].start, "8:00 AM"); assert.equal(T.wasEdited(cleared), true);
  assert.equal(T.isFilled({ notes: "Sick" }), true); assert.equal(T.isFilled(null), false);
  assert.equal(T.computeDays([cleared]).days["2026-10-02"].min, 0);
});

// ── pay ──
test("gross pay: regular × wage + OT × wage × 1.5", () => {
  const map = {}; ["05", "06", "07", "08", "09"].forEach((d) => { map["2026-10-" + d] = ["7:00 AM", "4:30 PM"]; });
  const c = T.computeDays(days(map));
  const p = T.payTotals(Object.values(c.days), () => ({ wage: 40, otRate: 1.5 }));
  assert.equal(H(p.regMin), 40); assert.equal(H(p.otMin), 7.5);
  assert.equal(p.regPay, 1600); assert.equal(p.otPay, 450); assert.equal(p.gross, 2050);
  assert.deepEqual(T.payTotals(Object.values(c.days), () => null).missing, ["2026-10"]);
});
test("pay periods: monthly, twice a month, every two weeks", () => {
  assert.deepEqual(T.periodOf("2026-10-17"), { start: "2026-10-01", end: "2026-10-31", kind: "monthly" });
  assert.deepEqual(T.periodOf("2026-10-17", "semimonthly"), { start: "2026-10-16", end: "2026-10-31", kind: "semimonthly" });
  assert.deepEqual(T.periodOf("2026-10-17", "biweekly", "2026-01-05"), { start: "2026-10-12", end: "2026-10-25", kind: "biweekly" });
  assert.equal(T.monthDays("2026-02").length, 28); assert.equal(T.addMonths("2026-12", 1), "2027-01");
});
