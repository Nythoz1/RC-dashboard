// Employee logins only reach their timesheet: the AI and Morning Brief functions
// turn them away, office staff still get through. Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { loadEdgeFunction } from "./fixtures/edge.mjs";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";

const SB = "http://sb.test";
let sb, employee, office;
before(async () => {
  sb = await mockSupabase({ users: [{ email: "mike@shop.test", password: "x", app_metadata: { role: "employee", employeeId: 101 } }, { email: "office@shop.test", password: "x" }] });
  globalThis.fetch = async (input, init) => { const u = String(input instanceof Request ? input.url : input); return u.startsWith(SB) ? sb.handle(input instanceof Request ? input : new Request(u, init)) : new Response(JSON.stringify({ error: { message: "no network in tests" } }), { status: 503 }); };
  employee = sb.session(sb.users[0]).access_token;
  office = sb.session(sb.users[1]).access_token;
});
const post = (h, tok, body) => h(new Request(SB + "/functions/v1/x", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(body) }));

test("the AI function refuses an employee login", async () => {
  const ai = await loadEdgeFunction("ai", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, ANTHROPIC_API_KEY: "test" });
  assert.equal((await post(ai, employee, { prompt: "hi" })).status, 403);
  assert.ok(![401, 403].includes((await post(ai, office, { prompt: "hi" })).status));
});
test("the Morning Brief's Send now refuses an employee login", async () => {
  const brief = await loadEdgeFunction("brief", { SUPABASE_URL: SB, SUPABASE_ANON_KEY: sb.anonKey, SUPABASE_SERVICE_ROLE_KEY: sb.serviceKey });
  assert.equal((await post(brief, employee, {})).status, 401);
  assert.ok(![401, 403].includes((await post(brief, office, {})).status));
});
