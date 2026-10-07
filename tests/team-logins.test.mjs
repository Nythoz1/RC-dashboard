// The team-logins Edge Function run in Node (esbuild bundle, Deno stubbed)
// against the mock Supabase: only the owner manages logins, an employee login is
// tied to their Team member, and owner logins can't be touched. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { loadEdgeFunction } from "./fixtures/edge.mjs";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";

const SB = "http://sb.test";
let sb, fn, ownerTok, staffTok;
const users = [
  { email: "owner@shop.test", password: "owner-pass-1", app_metadata: { role: "owner" } },
  { email: "office@shop.test", password: "office-pass-1", app_metadata: { role: "staff" } },
  { email: "new@shop.test", password: "new-pass-1" },   // made in Supabase, no role yet
];
const call = async (tok, body) => { const r = await fn(new Request(SB + "/functions/v1/team-logins", { method: "POST", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };

before(async () => {
  sb = await mockSupabase({ users });
  await sb.sql("insert into app_state (key, value) values ('rc:employees', $1::jsonb)", [JSON.stringify([{ id: 101, name: "Mike Test", rate: 40 }, { id: 102, name: "Bob Jones", rate: 25 }])]);
  globalThis.fetch = async (input, init) => sb.handle(input instanceof Request ? input : new Request(String(input), init));
  fn = await loadEdgeFunction("team-logins", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey });
  ownerTok = sb.session(users[0]).access_token;
  staffTok = sb.session(users[1]).access_token;
});

test("only the owner's login can manage logins", async () => {
  assert.equal((await call(null, { action: "list" })).status, 401);
  assert.equal((await call(sb.anonKey, { action: "list" })).status, 401);
  const r = await call(staffTok, { action: "list" });
  assert.equal(r.status, 403); assert.match(r.body.error, /Only the owner/);
});
test("the owner gives Mike an employee login tied to his Team member", async () => {
  const r = await call(ownerTok, { action: "create", employeeId: 101, email: "Mike@Shop.test", password: "coal-4821-turbo", role: "employee" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.login.email, r.body.login.role, r.body.login.employeeId, r.body.login.name], ["mike@shop.test", "employee", 101, "Mike Test"]);
  const u = sb.users.find((x) => x.email === "mike@shop.test");
  assert.deepEqual(u.app_metadata, { role: "employee", employeeId: 101, name: "Mike Test" });
  const list = await call(ownerTok, { action: "list" });
  assert.deepEqual(list.body.logins.map((l) => l.role).sort(), ["employee", "none", "owner", "staff"]);
});
test("plain answers for a second login, a taken email, a short password, no Team member", async () => {
  assert.match((await call(ownerTok, { action: "create", employeeId: 101, email: "mike2@shop.test", password: "coal-4821-turbo", role: "employee" })).body.error, /Mike Test already has a login/);
  assert.match((await call(ownerTok, { action: "create", employeeId: 102, email: "mike@shop.test", password: "coal-4821-turbo", role: "employee" })).body.error, /already has a login/);
  assert.match((await call(ownerTok, { action: "create", employeeId: 102, email: "bob@shop.test", password: "short", role: "employee" })).body.error, /at least 8/);
  assert.match((await call(ownerTok, { action: "create", employeeId: 999, email: "x@shop.test", password: "coal-4821-turbo", role: "employee" })).body.error, /Pick the team member/);
  assert.match((await call(ownerTok, { action: "create", employeeId: 102, email: "bob@shop.test", password: "coal-4821-turbo", role: "owner" })).body.error, /employee or office staff/);
});
test("reset a password, change access, remove; owner logins are off limits", async () => {
  const mike = sb.users.find((x) => x.email === "mike@shop.test");
  assert.equal((await call(ownerTok, { action: "password", userId: mike.id, password: "new-pass-2026" })).body.ok, true);
  assert.equal(mike.password, "new-pass-2026");
  const owner = sb.users.find((x) => x.email === "owner@shop.test");
  assert.match((await call(ownerTok, { action: "password", userId: owner.id, password: "hijack-123" })).body.error, /Owner logins/);
  assert.match((await call(ownerTok, { action: "remove", userId: owner.id })).body.error, /Owner logins/);
  const r = await call(ownerTok, { action: "access", userId: mike.id, role: "staff" });
  assert.equal(r.body.login.role, "staff");
  assert.equal((await call(ownerTok, { action: "remove", userId: mike.id })).body.ok, true);
  assert.equal(sb.users.some((x) => x.email === "mike@shop.test"), false);
});
