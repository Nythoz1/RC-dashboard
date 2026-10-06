// The timesheet-sync Edge Function itself, run in Node (esbuild bundle, Deno
// stubbed) against a mock Supabase and a fake Google. Run: npm test
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { loadEdgeFunction } from "./fixtures/edge.mjs";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";
import { OCT_DAYS, SEP_DAYS, buildTab, HOW_TO, fakeGoogle, fakeServiceAccount } from "./fixtures/timesheets.mjs";

const SB = "http://sb.test";
const sa = await fakeServiceAccount();
const users = [{ id: "u-owner", email: "owner@test.local", password: "pw", app_metadata: { role: "owner" } }, { id: "u-staff", email: "staff@test.local", password: "pw" }];
const sb = mockSupabase({ users });
const sheets = { S1: { title: "Mike Test - Timesheet 2026", tabs: [{ title: "How to fill in", raw: HOW_TO }, { title: "Sep 2026", raw: buildTab({ month: "2026-09", wage: 38, days: SEP_DAYS, old: true }) }, { title: "Oct 2026", raw: buildTab({ month: "2026-10", days: OCT_DAYS }) }] } };
const google = fakeGoogle({ sheets, shared: new Set(["S1"]), publicKey: sa.publicKey });
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith(SB)) return sb.handle(input instanceof Request ? input : new Request(url, init));
  return google(url, init);
};
const handler = await loadEdgeFunction("timesheet-sync", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: "anon-key", SUPABASE_SERVICE_ROLE_KEY: "service-key", GOOGLE_SA_JSON: sa.json });
const call = async (headers = {}, body = { action: "sync" }) => { const r = await handler(new Request(SB + "/functions/v1/timesheet-sync", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };
const staff = sb.session(users[1]).access_token;
sb.db.set("rc:timesheetSources", [{ id: 1, sheetUrl: "https://docs.google.com/spreadsheets/d/S1/edit", sheetId: "S1", employeeId: 7 }]);

test("refuses callers that aren't a signed-in user, the service role or the cron secret", async () => {
  assert.equal((await call()).status, 401);
  assert.equal((await call({ Authorization: "Bearer anon-key" })).status, 401);
  assert.equal((await call({ "x-brief-secret": "wrong" })).status, 401);
});
test("info: the service account email to share the sheets with", async () => {
  const r = await call({ Authorization: "Bearer " + staff }, { action: "info" });
  assert.deepEqual(r.body, { ok: true, configured: true, saEmail: "timesheet-reader@rollin-coal-timesheets.iam.gserviceaccount.com" });
});
test("Sync now from a staff login: rows stored, wages stored owner-only, none in the reply", async () => {
  const r = await call({ Authorization: "Bearer " + staff });
  assert.equal(r.status, 200); assert.equal(r.body.by, "user");
  assert.equal(r.body.results[0].ok, true); assert.equal(r.body.results[0].added, 61);
  assert.equal(sb.db.get("rc:timesheets").length, 61);
  assert.deepEqual(sb.db.get("rc:owner:tsPay").map((p) => [p.month, p.wage]), [["2026-09", 38], ["2026-10", 40]]);
  assert.ok(!/wage|otRate|gross/i.test(JSON.stringify(r.body)));
  assert.equal(sb.db.get("rc:timesheetSources")[0].lastError, null);
  const again = await call({ Authorization: "Bearer " + staff });
  assert.equal(again.body.results[0].added, 0); assert.equal(sb.db.get("rc:timesheets").length, 61);
});
test("an approved month: a later change on the sheet is flagged, not written over", async () => {
  sb.db.set("rc:payPeriods", [{ id: 5, emp: 7, start: "2026-10-01", end: "2026-10-31", kind: "monthly", approvedAt: "2026-11-02T15:00:00Z" }]);
  sheets.S1.tabs[2].raw = buildTab({ month: "2026-10", days: OCT_DAYS, edit: { "2026-10-06": { finish: "6:30 PM" } } });
  const r = await call({ Authorization: "Bearer service-key" });
  assert.equal(r.body.by, "service"); assert.equal(r.body.results[0].flagged, 1);
  const row = sb.db.get("rc:timesheets").find((x) => x.date === "2026-10-06");
  assert.equal(row.finish, "4:30 PM"); assert.equal(row.pending.vals.finish, "6:30 PM");
});
test("the daily cron call only works in the 6 o'clock hour, Edmonton time, summer and winter", async () => {
  const at = async (iso) => { mock.timers.enable({ apis: ["Date"], now: new Date(iso) }); try { return await call({ "x-brief-secret": "cron-secret" }); } finally { mock.timers.reset(); } };
  const summerRun = await at("2026-10-06T12:05:00Z"), summerSkip = await at("2026-10-06T13:05:00Z");
  const winterSkip = await at("2026-12-01T12:05:00Z"), winterRun = await at("2026-12-01T13:05:00Z");
  assert.equal(summerRun.body.by, "cron"); assert.equal(summerRun.body.ok, true);
  assert.match(summerSkip.body.skipped, /6 o'clock/); assert.match(winterSkip.body.skipped, /6 o'clock/);
  assert.equal(winterRun.body.by, "cron");
});
test("a sheet that isn't shared: the error is saved on the source, the rows stay", async () => {
  sb.db.set("rc:timesheetSources", [{ id: 1, sheetId: "S1", employeeId: 7 }, { id: 2, sheetId: "S2", employeeId: 8 }]);
  sheets.S2 = { title: "Bob", tabs: [{ title: "Oct 2026", raw: buildTab({ month: "2026-10", employee: "Bob", days: OCT_DAYS }) }] };
  const r = await call({ Authorization: "Bearer " + staff });
  const src = sb.db.get("rc:timesheetSources");
  assert.equal(r.body.results.find((x) => x.id === 2).ok, false);
  assert.match(src.find((x) => x.id === 2).lastError, /isn't shared with the service account/);
  assert.equal(src.find((x) => x.id === 1).lastError, null);
  assert.equal(sb.db.get("rc:timesheets").length, 61);
});
