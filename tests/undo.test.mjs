// The undo for migration 0017 (supabase/rollback/0017_undo.sql), rehearsed: after shops
// and some work in them, undoing puts every list back in app_state, the dashboard's
// storage layer falls back to it by itself, and engines, timesheets and files keep
// working for the shop's logins. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";
import { loadDevice } from "./fixtures/client.mjs";
import { asLogin } from "./fixtures/pg.mjs";

const SB = "http://sb.test";
test("undoing 0017 keeps what was saved since, and the same build carries on", async () => {
  const users = [{ email: "owner@shop.test", password: "owner-pass-1", app_metadata: { role: "owner" } }];
  const sb = await mockSupabase({ users });
  globalThis.fetch = async (input, init) => sb.handle(input instanceof Request ? input : new Request(String(input), init));
  const before = await loadDevice({ url: SB, anonKey: sb.anonKey, email: users[0].email, password: users[0].password });
  await before.db.setItem("rc:customers", JSON.stringify([{ id: 1, name: "Saved after shops" }]), "[]");
  await before.db.setItem("rc:inventory", JSON.stringify([{ id: 7, sku: "RC-7", name: "C15" }]), "[]");
  await sb.db.exec(readFileSync(new URL("../supabase/rollback/0017_undo.sql", import.meta.url), "utf8"));
  assert.deepEqual((await sb.sql("select value from app_state where key = 'rc:customers'"))[0].value, [{ id: 1, name: "Saved after shops" }]);
  // a fresh page load: no shops found, so app_state; saves merge there
  const after = await loadDevice({ url: SB, anonKey: sb.anonKey, email: users[0].email, password: users[0].password });
  assert.equal((await after.getShop()).pre, true);
  const got = await after.db.getAll(["rc:customers", "rc:inventory"]);
  assert.equal(JSON.parse(got["rc:customers"])[0].name, "Saved after shops");
  assert.equal(JSON.parse(got["rc:inventory"])[0].sku, "RC-7");
  await after.db.setItem("rc:customers", JSON.stringify([{ id: 1, name: "Saved after shops" }, { id: 2, name: "After undo" }]), got["rc:customers"]);
  assert.equal((await sb.sql("select jsonb_array_length(value) as n from app_state where key = 'rc:customers'"))[0].n, 2);
  // files on the old paths still work for the owner
  const owner = { id: sb.users[0].id, email: users[0].email, app_metadata: { role: "owner" }, noShop: true };
  await asLogin(sb.db, owner, "insert into storage.objects (bucket_id, name) values ('ecm-files', '12/log.csv')");
  assert.equal((await asLogin(sb.db, owner, "select name from storage.objects")).rows.length, 1);
  // the autofill is back on app_state's Team list
  await sb.sql("insert into app_state (key, value) values ('rc:employees', '[{\"id\":101,\"name\":\"Mike\",\"status\":\"active\"}]') on conflict (key) do update set value = excluded.value");
  assert.equal((await sb.sql("select public.ts_autofill('2026-10-14T22:30:00Z'::timestamptz) as n"))[0].n, 1);
});
