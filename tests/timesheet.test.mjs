// Timesheet parser, Alberta overtime math, merge rules and the Google sync.
// Run: npm test   (node --test tests/)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../supabase/functions/_shared/timesheet.js";
import { readCsv, readXlsx, tabFromFileName } from "../src/lib/sheetfile.js";
import { OCT_DAYS, SEP_DAYS, buildTab, buildRealTab, HOW_TO, csvOf, fakeGoogle, fakeServiceAccount, serial } from "./fixtures/timesheets.mjs";

const H = (min) => +(min / 60).toFixed(2);
const rowsFor = (days) => Object.entries(days).map(([date, x]) => ({ date, start: x[0], finish: x[1], unpaidBreakMin: x[2] || 0 }));
const weekOf = (calc, iso) => calc.weeks[T.weekStart(iso)];

// ── the four cases from the brief ──
test("8:00 AM to 4:00 PM is 8.00 h, all regular", () => {
  const c = T.computeDays(rowsFor({ "2026-10-01": ["8:00 AM", "4:00 PM"] }));
  const d = c.days["2026-10-01"];
  assert.equal(H(d.min), 8); assert.equal(H(d.regMin), 8); assert.equal(H(d.otMin), 0);
});
test("7:00 AM to 5:30 PM is 10.50 h: 8 regular + 2.5 OT", () => {
  const c = T.computeDays(rowsFor({ "2026-10-02": ["7:00 AM", "5:30 PM"] }));
  const d = c.days["2026-10-02"];
  assert.equal(H(d.min), 10.5); assert.equal(H(d.regMin), 8); assert.equal(H(d.otMin), 2.5);
});
test("five 9.5-h days: daily OT 7.5 beats weekly 3.5, so 7.5 OT", () => {
  const days = {}; ["05", "06", "07", "08", "09"].forEach((d) => { days["2026-10-" + d] = ["7:00 AM", "4:30 PM"]; });
  const w = weekOf(T.computeDays(rowsFor(days)), "2026-10-05");
  assert.equal(H(w.min), 47.5); assert.equal(H(w.dailyMin), 7.5); assert.equal(H(w.weeklyMin), 3.5);
  assert.equal(H(w.otMin), 7.5); assert.equal(H(w.regMin), 40); assert.equal(w.rule, "daily");
});
test("six 8-h days: weekly 4 beats daily 0, so 4 OT (on the Saturday)", () => {
  const days = {}; ["12", "13", "14", "15", "16", "17"].forEach((d) => { days["2026-10-" + d] = ["8:00 AM", "4:00 PM"]; });
  const c = T.computeDays(rowsFor(days)); const w = weekOf(c, "2026-10-12");
  assert.equal(H(w.dailyMin), 0); assert.equal(H(w.weeklyMin), 4); assert.equal(H(w.otMin), 4); assert.equal(w.rule, "weekly");
  assert.equal(H(c.days["2026-10-17"].otMin), 4); assert.equal(H(c.days["2026-10-17"].regMin), 4);
  assert.equal(H(c.days["2026-10-12"].otMin), 0);
});

// ── more overtime ──
test("mixed week: each day keeps its own over-8, the rest of the 44-h overage lands on the last day", () => {
  const days = {}; ["05", "06", "07", "08", "09"].forEach((d) => { days["2026-10-" + d] = ["8:00 AM", "5:00 PM"]; }); days["2026-10-10"] = ["8:00 AM", "2:00 PM"];
  const c = T.computeDays(rowsFor(days)); const w = weekOf(c, "2026-10-05");
  assert.equal(H(w.min), 51); assert.equal(H(w.dailyMin), 5); assert.equal(H(w.weeklyMin), 7); assert.equal(H(w.otMin), 7); assert.equal(w.rule, "weekly");
  assert.equal(H(c.days["2026-10-05"].otMin), 1); assert.equal(H(c.days["2026-10-10"].otMin), 2); assert.equal(H(c.days["2026-10-10"].regMin), 4);
  assert.equal(H(Object.values(c.days).reduce((a, d) => a + d.regMin, 0)), 44);
});
test("a week that spans two month tabs counts as one week (starts Monday)", () => {
  const days = { "2026-09-28": ["8:00 AM", "4:00 PM"], "2026-09-29": ["8:00 AM", "4:00 PM"], "2026-09-30": ["8:00 AM", "4:00 PM"], "2026-10-01": ["8:00 AM", "4:00 PM"], "2026-10-02": ["8:00 AM", "4:00 PM"], "2026-10-03": ["8:00 AM", "4:00 PM"] };
  const c = T.computeDays(rowsFor(days)); const w = weekOf(c, "2026-10-01");
  assert.equal(w.start, "2026-09-28"); assert.equal(w.end, "2026-10-04"); assert.equal(H(w.otMin), 4); assert.equal(H(c.days["2026-10-03"].otMin), 4);
});
test("unpaid break comes off; breaks are paid when the column is blank", () => {
  const c = T.computeDays([{ date: "2026-09-01", start: "8:00 AM", finish: "4:30 PM", unpaidBreakMin: 30 }, { date: "2026-09-04", start: "8:00 AM", finish: "4:30 PM", unpaidBreakMin: null }]);
  assert.equal(H(c.days["2026-09-01"].min), 8); assert.equal(H(c.days["2026-09-04"].min), 8.5);
});

// ── the parser on the real layout ──
test("current template: labels, header by text, every day, stops at the totals", () => {
  const p = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  assert.equal(p.employee, "Mike Test"); assert.equal(p.wage, 40); assert.equal(p.otRate, 1.5); assert.equal(p.month, "2026-10");
  assert.equal(p.rows.length, 31); assert.equal(p.oldTemplate, false);
  const r1 = p.rows[0];
  assert.deepEqual([r1.date, r1.day, r1.start, r1.finish, r1.sTotal, r1.sReg, r1.sOT], ["2026-10-01", "Thu", "8:00 AM", "4:00 PM", 8, 8, 0]);
  const off = p.rows.find((r) => r.date === "2026-10-03");
  assert.deepEqual([off.start, off.finish, off.sTotal], ["", "", null]);
  assert.equal(p.rows.find((r) => r.date === "2026-10-19").notes, "Unit 412 injectors");
  assert.equal(p.rows.at(-1).date, "2026-10-31");
  assert.equal(p.rows.find((r) => r.date === "2026-10-02").unpaidBreakMin, null);
});
test("older template with the Unpaid Break column", () => {
  const p = T.parseTab(buildTab({ month: "2026-09", wage: 38, days: SEP_DAYS, old: true }), "Sep 2026");
  assert.equal(p.oldTemplate, true); assert.equal(p.wage, 38); assert.equal(p.rows.length, 30);
  const r = p.rows.find((x) => x.date === "2026-09-01");
  assert.equal(r.unpaidBreakMin, 30); assert.equal(r.sTotal, 8);
  assert.equal(p.rows.find((x) => x.date === "2026-09-04").unpaidBreakMin, 0);
});
test("values as shown (a CSV download) read the same as the raw values", () => {
  const raw = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  const shown = T.parseTab(readCsv(csvOf(buildTab({ month: "2026-10", days: OCT_DAYS, style: "shown" }))), "Oct 2026");
  assert.equal(shown.wage, 40); assert.equal(shown.otRate, 1.5);
  assert.deepEqual(shown.rows.map(T.rowSig), raw.rows.map(T.rowSig));
});
test("columns are found by header text, not position; labels by text too", () => {
  const g = buildTab({ month: "2026-10", days: OCT_DAYS });
  const hdr = 6, order = [8, 0, 3, 2, 1, 4, 5, 6, 7];   // Notes first, Finish before Start
  const moved = g.map((row, i) => (i >= hdr ? order.map((k) => (row[k] === undefined ? "" : row[k])) : row));
  moved.splice(0, 0, [], []);                           // header now on row 9
  moved[5] = ["Employee:", "", "Mike Test"]; moved[6] = ["", "", "", "", "Hourly Wage:", "$40.00", "Month:", "October 2026", "OT Rate:", "2x"];
  const p = T.parseTab(moved, "Oct 2026");
  assert.equal(p.employee, "Mike Test"); assert.equal(p.wage, 40); assert.equal(p.otRate, 2); assert.equal(p.rows.length, 31);
  const r = p.rows.find((x) => x.date === "2026-10-02");
  assert.deepEqual([r.start, r.finish], ["7:00 AM", "5:30 PM"]);
});
test("a missing value doesn't borrow the next label; month falls back to the tab name", () => {
  const g = buildTab({ month: "2026-10", days: OCT_DAYS });
  g[3] = ["", "Employee:", "", "", "", "", "Month:", ""];
  const p = T.parseTab(g, "Oct 2026");
  assert.equal(p.employee, ""); assert.equal(p.month, "2026-10");
  assert.ok(p.warnings.some((w) => /No employee name/.test(w)));
});
test("the How to fill in tab and a tab with no header give no rows", () => {
  const p = T.parseTab(HOW_TO, "How to fill in");
  assert.equal(p.rows.length, 0);
  assert.ok(T.SKIP_TAB.test("How to fill in"));
});

test("the shop's real October 2026 template: blank name box, no wage cells, 30-minute break pre-filled", () => {
  const blank = T.parseTab(buildRealTab(), "Oct 2026");
  assert.equal(blank.rows.length, 31); assert.equal(blank.month, "2026-10"); assert.equal(blank.oldTemplate, true);
  assert.equal(blank.employee, ""); assert.equal(blank.wage, null); assert.equal(blank.otRate, 1.5);
  assert.deepEqual(blank.rows.map((r) => r.unpaidBreakMin), new Array(31).fill(30));
  // Filled in the way the template's own examples describe: 7.50 h and 10.00 h (8 + 2 OT).
  const p = T.parseTab(buildRealTab({ employee: "Mike Test", days: { "2026-10-01": { start: "8:00 AM", finish: "4:00 PM" }, "2026-10-02": { start: "7:00 AM", finish: "5:30 PM" } } }), "Oct 2026");
  const c = T.computeDays(p.rows);
  assert.equal(p.employee, "Mike Test");
  assert.equal(H(c.days["2026-10-01"].min), 7.5); assert.equal(H(c.days["2026-10-02"].regMin), 8); assert.equal(H(c.days["2026-10-02"].otMin), 2);
  p.rows.forEach((r) => assert.deepEqual(T.dayFlags(r, c.days[r.date]), [], r.date));
});

// ── flags ──
test("flags: finish before start, over 14 h, times on a sick day, sheet math off, weekly rule", () => {
  const p = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  const c = T.computeDays(p.rows);
  const flags = (iso) => T.dayFlags(p.rows.find((r) => r.date === iso), c.days[iso]).map((f) => f.k + ":" + f.lv);
  assert.ok(flags("2026-10-22").includes("order:bad")); assert.equal(c.days["2026-10-22"].min, 0);
  assert.ok(flags("2026-10-21").includes("long:warn"));
  assert.ok(flags("2026-10-20").includes("leave:warn"));
  assert.ok(flags("2026-10-23").includes("total:warn"));
  assert.ok(flags("2026-10-17").includes("weekly:info"));
  assert.deepEqual(flags("2026-10-01"), []); assert.deepEqual(flags("2026-10-26"), []);
  assert.deepEqual(flags("2026-10-05"), []);
});

// ── month totals and gross pay ──
test("October totals and gross pay (with September synced for the shared week)", () => {
  const oct = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  const sep = T.parseTab(buildTab({ month: "2026-09", wage: 38, days: SEP_DAYS, old: true }), "Sep 2026");
  const c = T.computeDays([...sep.rows, ...oct.rows]);
  const inMonth = (ym) => Object.values(c.days).filter((d) => d.date.startsWith(ym));
  const pay = T.mergePay([], [{ emp: 7, month: "2026-10", wage: 40, otRate: 1.5, otRateSet: true }, { emp: 7, month: "2026-09", wage: 38, otRate: 1.5, otRateSet: true }]);
  const o = T.payTotals(inMonth("2026-10"), (d) => T.payFor(pay, 7, d));
  assert.equal(H(o.regMin + o.otMin), 181); assert.equal(H(o.regMin), 160); assert.equal(H(o.otMin), 21);
  assert.equal(o.regPay, 6400); assert.equal(o.otPay, 1260); assert.equal(o.gross, 7660);
  const s = T.payTotals(inMonth("2026-09"), (d) => T.payFor(pay, 7, d));
  assert.equal(H(s.regMin), 40); assert.equal(H(s.otMin), 3); assert.equal(s.gross, 1691);
  assert.deepEqual(T.payTotals(inMonth("2026-10"), () => null).missing, ["2026-10"]);
});

// ── merge: re-sync, approval locks ──
const inc = (p, emp = 7) => p.rows.map((r) => ({ ...r, emp, employee: p.employee, sheetId: "S1", tab: p.tab, src: "google" }));
test("re-syncing the same sheet updates rows instead of duplicating them", () => {
  const p = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  const a = T.mergeRows([], inc(p), {});
  const b = T.mergeRows(a.rows, inc(p), {});
  assert.equal(a.rows.length, 31); assert.equal(b.rows.length, 31); assert.equal(b.stats.same, 31); assert.equal(b.stats.added, 0);
  assert.equal(new Set(b.rows.map((r) => r.id)).size, 31); assert.equal(b.rows[0].id, "7|2026-10-01");
});
test("a change to an approved day is flagged with old and new, never overwritten", () => {
  const p = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  const periods = [{ id: 1, emp: 7, start: "2026-10-01", end: "2026-10-31" }];
  const base = T.mergeRows([], inc(p), {}).rows;
  const p2 = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS, edit: { "2026-10-06": { finish: "6:30 PM" } } }), "Oct 2026");
  const m = T.mergeRows(base, inc(p2), { periods, now: "2026-11-02T13:00:00Z" });
  const r = m.rows.find((x) => x.date === "2026-10-06");
  assert.equal(m.stats.flagged, 1); assert.equal(m.rows.length, 31);
  assert.equal(r.finish, "4:30 PM"); assert.equal(r.pending.vals.finish, "6:30 PM");
  const again = T.mergeRows(m.rows, inc(p2), { periods });
  assert.equal(again.stats.flagged, 0);
  const kept = again.rows.map((x) => (x.date === "2026-10-06" ? T.keepApproved(x) : x));
  const after = T.mergeRows(kept, inc(p2), { periods });
  assert.equal(after.stats.flagged, 0); assert.equal(after.rows.find((x) => x.date === "2026-10-06").pending, undefined);
  const p3 = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS, edit: { "2026-10-06": { finish: "7:00 PM" } } }), "Oct 2026");
  const changedAgain = T.mergeRows(after.rows, inc(p3), { periods });
  assert.equal(changedAgain.stats.flagged, 1);
  const accepted = T.acceptPending(changedAgain.rows.find((x) => x.date === "2026-10-06"));
  assert.equal(accepted.finish, "7:00 PM"); assert.equal(accepted.pending, undefined);
});
test("unapproved days follow the sheet; days gone from the sheet go, unless approved", () => {
  const p = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  const base = T.mergeRows([], inc(p), {}).rows;
  const p2 = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS, edit: { "2026-10-06": { finish: "6:30 PM" } } }), "Oct 2026");
  const m = T.mergeRows(base, inc(p2), {});
  assert.equal(m.stats.updated, 1); assert.equal(m.rows.find((x) => x.date === "2026-10-06").finish, "6:30 PM");
  const half = inc(p2).filter((r) => r.date <= "2026-10-15");
  const scope = (r) => r.sheetId === "S1";
  const gone = T.mergeRows(m.rows, half, { scope });
  assert.equal(gone.rows.length, 15); assert.equal(gone.stats.removed, 16);
  const locked = T.mergeRows(m.rows, half, { scope, periods: [{ emp: 7, start: "2026-10-16", end: "2026-10-31" }] });
  assert.equal(locked.rows.length, 31); assert.equal(locked.rows.filter((r) => r.pending && r.pending.removed).length, 16);
});
test("a wage change in an approved month is parked, not applied", () => {
  const periods = [{ emp: 7, start: "2026-10-01", end: "2026-10-31" }];
  const a = T.mergePay([], [{ emp: 7, month: "2026-10", wage: 40, otRate: 1.5, otRateSet: true }]);
  const b = T.mergePay(a, [{ emp: 7, month: "2026-10", wage: 42, otRate: 1.5, otRateSet: true }], { periods });
  assert.equal(b[0].wage, 40); assert.equal(b[0].pending.wage, 42);
  const c = T.mergePay(a, [{ emp: 7, month: "2026-10", wage: 42, otRate: 1.5, otRateSet: true }]);
  assert.equal(c[0].wage, 42);
});

// ── pay periods, links ──
test("pay periods: monthly, twice a month, every two weeks", () => {
  assert.deepEqual(T.periodOf("2026-10-17"), { start: "2026-10-01", end: "2026-10-31", kind: "monthly" });
  assert.deepEqual(T.periodOf("2026-10-17", "semimonthly"), { start: "2026-10-16", end: "2026-10-31", kind: "semimonthly" });
  assert.deepEqual(T.periodOf("2026-10-17", "biweekly", "2026-01-05"), { start: "2026-10-12", end: "2026-10-25", kind: "biweekly" });
  assert.deepEqual(T.periodOf("2026-01-04", "biweekly", "2026-01-05"), { start: "2025-12-22", end: "2026-01-04", kind: "biweekly" });
  assert.equal(T.periodLabel(T.periodOf("2026-02-03")), "February 2026");
});
test("a pasted Google Sheets link gives the spreadsheet id", () => {
  assert.equal(T.extractSheetId("https://docs.google.com/spreadsheets/d/1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0"), "1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123456789");
  assert.equal(T.extractSheetId("1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123456789"), "1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123456789");
  assert.equal(T.extractSheetId("https://example.com"), "");
});

// ── Google: token + sync, with a fake Google ──
test("sync: signs the service-account JWT, skips How to fill in, reads both templates, re-sync adds nothing", async () => {
  const sa = await fakeServiceAccount();
  const calls = [];
  const sheets = { S1: { title: "Mike Test - Timesheet 2026", tabs: [{ title: "How to fill in", raw: HOW_TO }, { title: "Sep 2026", raw: buildTab({ month: "2026-09", wage: 38, days: SEP_DAYS, old: true }) }, { title: "Oct 2026", raw: buildTab({ month: "2026-10", days: OCT_DAYS }) }] } };
  const fetch = fakeGoogle({ sheets, shared: new Set(["S1"]), publicKey: sa.publicKey, calls });
  const state = { sources: [{ id: 1, sheetId: "S1", employeeId: 7 }], timesheets: [], payPeriods: [], tsPay: [] };
  const out = await T.runSync(state, { saJson: sa.json, fetch, now: new Date("2026-11-02T13:05:00Z") });
  assert.equal(out.error, null); assert.equal(out.saEmail, "timesheet-reader@rollin-coal-timesheets.iam.gserviceaccount.com");
  assert.equal(out.results[0].ok, true); assert.equal(out.results[0].tabs, 2); assert.equal(out.timesheets.length, 61);
  assert.ok(!calls.some((c) => /How%20to/.test(c) && /batchGet/.test(c)));
  assert.ok(calls.some((c) => /valueRenderOption=UNFORMATTED_VALUE/.test(c) && /dateTimeRenderOption=FORMATTED_STRING/.test(c)));
  assert.equal(out.sources[0].lastError, null); assert.equal(out.sources[0].title, "Mike Test - Timesheet 2026");
  assert.deepEqual(out.tsPay.map((p) => [p.id, p.wage]), [["7|2026-09", 38], ["7|2026-10", 40]]);
  const again = await T.runSync({ ...state, timesheets: out.timesheets, tsPay: out.tsPay, sources: out.sources }, { saJson: sa.json, fetch, now: new Date("2026-11-03T13:05:00Z") });
  assert.equal(again.timesheets.length, 61); assert.equal(again.results[0].added, 0); assert.equal(again.results[0].same, 61);
});
test("sync: plain-language errors for a sheet that isn't shared, a turned-off API, a bad key", async () => {
  const sa = await fakeServiceAccount();
  const sheets = { S1: { title: "x", tabs: [{ title: "Oct 2026", raw: buildTab({ month: "2026-10", days: OCT_DAYS }) }] } };
  const state = { sources: [{ id: 1, sheetId: "S1", employeeId: 7 }], timesheets: [{ id: "7|2026-10-01", emp: 7, date: "2026-10-01", sheetId: "S1", start: "8:00 AM", finish: "4:00 PM" }] };
  const notShared = await T.runSync(state, { saJson: sa.json, fetch: fakeGoogle({ sheets, shared: new Set(), publicKey: sa.publicKey }) });
  assert.match(notShared.sources[0].lastError, /isn't shared with the service account.*timesheet-reader@/);
  assert.equal(notShared.timesheets.length, 1);
  const off = await T.runSync(state, { saJson: sa.json, fetch: fakeGoogle({ sheets, shared: new Set(["S1"]), publicKey: sa.publicKey, apiOff: true }) });
  assert.match(off.sources[0].lastError, /Sheets API is turned off/);
  const other = await fakeServiceAccount();
  const badKey = await T.runSync(state, { saJson: sa.json, fetch: fakeGoogle({ sheets, shared: new Set(["S1"]), publicKey: other.publicKey }) });
  assert.match(badKey.sources[0].lastError, /Google turned the key down/);
  const none = await T.runSync(state, { saJson: "", fetch: fakeGoogle({ sheets, shared: new Set(["S1"]) }) });
  assert.match(none.sources[0].lastError, /GOOGLE_SA_JSON secret is missing/);
});
test("sync: an Excel file in Drive gets a plain answer, and Settings can spot its link", async () => {
  const sa = await fakeServiceAccount();
  const sheets = { X1: { title: "Rollin_Coal_Timesheet_Oct_2026.xlsx", excel: true, tabs: [] } };
  const out = await T.runSync({ sources: [{ id: 1, sheetId: "X1", employeeId: 7 }] }, { saJson: sa.json, fetch: fakeGoogle({ sheets, shared: new Set(["X1"]), publicKey: sa.publicKey }) });
  assert.match(out.sources[0].lastError, /Excel file \(\.xlsx\).*Save as Google Sheets/);
  assert.equal(T.looksLikeExcelLink("https://docs.google.com/spreadsheets/d/1DDUl5aGEmHmIs0twNkNLdihLDfBhalLy/edit?usp=sharing&ouid=1&rtpof=true&sd=true"), true);
  assert.equal(T.looksLikeExcelLink("https://docs.google.com/spreadsheets/d/1AbC-dEf_GhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0"), false);
});
test("sync falls back to the values as shown when the raw ones don't read", async () => {
  const sa = await fakeServiceAccount();
  const raw = buildTab({ month: "2026-10", days: OCT_DAYS }).map((r, i) => (i > 6 && r[2] ? [r[0], r[1], 0.5, "x", ...r.slice(4)] : r));
  const sheets = { S1: { title: "x", tabs: [{ title: "Oct 2026", raw, shown: buildTab({ month: "2026-10", days: OCT_DAYS, style: "shown" }) }] } };
  const calls = [];
  const out = await T.runSync({ sources: [{ id: 1, sheetId: "S1", employeeId: 7 }] }, { saJson: sa.json, fetch: fakeGoogle({ sheets, shared: new Set(["S1"]), publicKey: sa.publicKey, calls }) });
  assert.ok(calls.some((c) => /valueRenderOption=FORMATTED_VALUE/.test(c)));
  assert.equal(out.timesheets.find((r) => r.date === "2026-10-02").finish, "5:30 PM");
});

// ── files: CSV and .xlsx ──
test("CSV reader: quotes, commas, CRLF, a semicolon file", () => {
  assert.deepEqual(readCsv('a,"b, c","say ""hi"""\r\n1,,3\r\n'), [["a", "b, c", 'say "hi"'], ["1", "", "3"]]);
  assert.deepEqual(readCsv("x;y\n1;2"), [["x", "y"], ["1", "2"]]);
  assert.equal(tabFromFileName("Mike Test - Timesheet 2026 - Oct 2026.csv"), "Oct 2026");
});
test(".xlsx reader: shared strings, times, dates and month cells stored as numbers", async () => {
  const xlsx = await makeXlsx([{ name: "How to fill in", grid: HOW_TO }, { name: "Oct 2026", grid: xlsxGrid(buildTab({ month: "2026-10", days: OCT_DAYS })) }]);
  const tabs = await readXlsx(xlsx);
  assert.deepEqual(tabs.map((t) => t.name), ["How to fill in", "Oct 2026"]);
  const p = T.parseTab(tabs[1].grid, tabs[1].name);
  const ref = T.parseTab(buildTab({ month: "2026-10", days: OCT_DAYS }), "Oct 2026");
  assert.equal(p.wage, 40); assert.equal(p.month, "2026-10"); assert.equal(p.rows.length, 31);
  assert.deepEqual(p.rows.map(T.rowSig), ref.rows.map(T.rowSig));
});

// The Oct grid with what Excel would store: real dates, times, month and wage as numbers + styles.
function xlsxGrid(g) {
  const tm = (t) => { const m = t.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/); let h = +m[1] % 12; if (m[3] === "PM") h += 12; return (h * 60 + +m[2]) / 1440; };
  return g.map((row, i) => row.map((v, c) => {
    if (i === 3 && c === 7) return { n: serial("2026-10-01"), s: 4 };
    if (i === 4 && c === 2) return { n: 40, s: 5 };
    if (i > 6 && i < 38 && c === 0) return { n: serial("2026-10-" + String(i - 6).padStart(2, "0")), s: 1 };
    if (i > 6 && i < 38 && (c === 2 || c === 3) && v) return { n: tm(v), s: 2 };
    if (i > 6 && i < 38 && c >= 4 && c <= 6 && typeof v === "number") return { n: v, s: 3 };
    return v;
  }));
}
// A minimal but valid .xlsx (zip + SpreadsheetML), deflated like Excel writes it.
async function makeXlsx(sheets) {
  const strings = [], sidx = new Map();
  const si = (t) => { if (!sidx.has(t)) { sidx.set(t, strings.length); strings.push(t); } return sidx.get(t); };
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const col = (c) => { let s = ""; c++; while (c) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); } return s; };
  const ws = (grid) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    grid.map((row, r) => '<row r="' + (r + 1) + '">' + row.map((v, c) => {
      const ref = col(c) + (r + 1);
      if (v === "" || v == null) return "";
      if (typeof v === "object") return '<c r="' + ref + '" s="' + v.s + '"><v>' + v.n + "</v></c>";
      if (typeof v === "number") return '<c r="' + ref + '"><v>' + v + "</v></c>";
      return '<c r="' + ref + '" t="s"><v>' + si(String(v)) + "</v></c>";
    }).join("") + "</row>").join("") + "</sheetData></worksheet>";
  const files = {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join("") + "</sheets></workbook>",
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join("") + "</Relationships>",
    "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="mmm d"/><numFmt numFmtId="165" formatCode="mmmm yyyy"/><numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0.00"/></numFmts><cellXfs count="6"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="18" applyNumberFormat="1"/><xf numFmtId="2" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/><xf numFmtId="166" applyNumberFormat="1"/></cellXfs></styleSheet>',
  };
  sheets.forEach((s, i) => { files["xl/worksheets/sheet" + (i + 1) + ".xml"] = ws(s.grid); });
  files["xl/sharedStrings.xml"] = '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + strings.map((t) => "<si><t xml:space=\"preserve\">" + esc(t) + "</t></si>").join("") + "</sst>";
  return zip(files);
}
async function zip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = enc.encode(text), nm = enc.encode(name);
    const def = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 8, true); lh.setUint32(14, crc(raw), true); lh.setUint32(18, def.length, true); lh.setUint32(22, raw.length, true); lh.setUint16(26, nm.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(10, 8, true); ch.setUint32(16, crc(raw), true); ch.setUint32(20, def.length, true); ch.setUint32(24, raw.length, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    parts.push(new Uint8Array(lh.buffer), nm, def); central.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + def.length;
  }
  const cd = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, Object.keys(files).length, true); end.setUint16(10, Object.keys(files).length, true); end.setUint32(12, cd, true); end.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const b of all) { out.set(b, p); p += b.length; }
  return out;
}
