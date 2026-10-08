// Merged saves (src/lib/merge.js + migration 0014): two people saving close
// together keep both their changes. The SQL merge is held to the JavaScript one
// over random edits, then two signed-in devices go through the real storage
// layer against the mock Supabase (real Postgres and row-level security).
// Run: npm test
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { diffList, applyList, diffItem, applyItem } from "../src/lib/merge.js";
import { mockSupabase } from "./fixtures/mock-supabase.mjs";
import { loadDevice } from "./fixtures/client.mjs";

const SB = "http://sb.test";
const J = JSON.stringify, P = JSON.parse;
let sb, owner, office, mike;
const users = [
  { email: "owner@shop.test", password: "owner-pass-1", app_metadata: { role: "owner" } },
  { email: "office@shop.test", password: "office-pass-1", app_metadata: { role: "staff" } },
  { email: "mike@shop.test", password: "mike-pass-1", app_metadata: { role: "employee", employeeId: 101, name: "Mike Test" } },
];
before(async () => {
  sb = await mockSupabase({ users });
  globalThis.fetch = async (input, init) => sb.handle(input instanceof Request ? input : new Request(String(input), init));
  const dev = (u) => loadDevice({ url: SB, anonKey: sb.anonKey, email: u.email, password: u.password });
  [owner, office, mike] = [await dev(users[0]), await dev(users[1]), await dev(users[2])];
});
const stored = async (key) => { const r = await sb.sql("select value from app_state where key = $1", [key]); return r.length ? r[0].value : null; };
const engine = async (id) => (await sb.sql("select data, price from inventory where id = $1", [id]))[0];

// ── the merge itself ──
// A small random generator, seeded so a failure can be replayed.
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function randomRecord(r, id) {
  const o = { id };
  if (r() < 0.8) o.name = "n" + Math.floor(r() * 100);
  if (r() < 0.6) o.qty = Math.floor(r() * 10) - 2;
  if (r() < 0.4) o.tags = Array.from({ length: Math.floor(r() * 3) }, (_, i) => "t" + i);
  if (r() < 0.5) o.rows = { L1: { d: r() < 0.5 ? "reuse" : "", cost: Math.floor(r() * 500) }, ...(r() < 0.5 ? { L2: { d: "mach" } } : {}) };
  if (r() < 0.2) o.note = null;
  return o;
}
function editRecord(r, o) {
  const x = P(J(o));
  if (r() < 0.4) x.name = "e" + Math.floor(r() * 100);
  if (r() < 0.3) delete x.qty;
  if (r() < 0.3) x.price = Math.floor(r() * 9000) / 4;
  if (r() < 0.3) x.rows = { ...(x.rows || {}), ["L" + Math.floor(r() * 4)]: { d: "miss", meas: String(Math.floor(r() * 99)) } };
  if (r() < 0.2 && x.rows && x.rows.L1) delete x.rows.L1.cost;
  if (r() < 0.2) x.tags = ["x"];
  return x;
}
// A list edited the way the dashboard edits lists: records added anywhere, changed, removed; never reordered.
function editList(r, list, ids) {
  const out = [];
  for (const it of list) {
    const roll = r();
    if (roll < 0.15) continue;
    out.push(roll < 0.45 ? editRecord(r, it) : it);
    if (r() < 0.15) out.push(randomRecord(r, ids()));
  }
  if (r() < 0.5) out.unshift(randomRecord(r, ids()));
  return out;
}

test("a device's changes, applied to the list it last saved, give back exactly its list", () => {
  const r = rng(7);
  let n = 0; const ids = () => (r() < 0.5 ? 1000 + ++n : "id-" + ++n);
  for (let k = 0; k < 300; k++) {
    const prev = Array.from({ length: Math.floor(r() * 8) }, () => randomRecord(r, ids()));
    const cur = editList(r, prev, ids);
    assert.deepEqual(applyList(prev, diffList(prev, cur)), cur);
  }
  assert.equal(diffList([{ id: 1, a: 1 }], [{ id: 1, a: 1 }]), null);
  // A field inside a nested object is its own change; arrays go whole.
  assert.deepEqual(diffItem({ id: 1, rows: { L1: { d: "" }, L2: { d: "x" } }, tags: [1] }, { id: 1, rows: { L1: { d: "reuse" }, L2: { d: "x" } }, tags: [1, 2] }),
    { set: [[["rows", "L1", "d"], "reuse"], [["tags"], [1, 2]]], unset: [] });
  assert.deepEqual(applyItem({ id: 1, a: { b: 1, c: 2 } }, [[["a", "d", "e"], 5]], [["a", "b"]]), { id: 1, a: { c: 2, d: { e: 5 } } });
});

test("the database merges exactly like lib/merge.js, whatever else is stored", async () => {
  const r = rng(42);
  let n = 0; const ids = () => (r() < 0.5 ? 5000 + ++n : "s-" + ++n);
  for (let k = 0; k < 120; k++) {
    const key = "rc:_merge_" + k;
    const base = Array.from({ length: Math.floor(r() * 7) }, () => randomRecord(r, ids()));
    const mine = editList(r, base, ids);               // this device, from the list it last saved
    const theirs = editList(r, base, ids);             // what someone else saved meanwhile
    const ch = diffList(base, mine);
    if (!ch) continue;
    const full = r() < 0.15 ? mine : null;
    const missing = r() < 0.1;
    if (!missing) await sb.sql("insert into app_state (key, value) values ($1, $2::jsonb)", [key, J(theirs)]);
    const res = await owner.supabase.rpc("merge_list", { p_key: key, p_changes: ch, p_full: full });
    assert.equal(res.error, null, k + ": " + (res.error && res.error.message));
    const want = applyList(missing ? null : theirs, ch, full);
    const same = await sb.sql("select value = $2::jsonb as eq, value from app_state where key = $1", [key, J(want)]);
    assert.ok(same[0].eq, "case " + k + ": " + J(same[0].value) + " vs " + J(want));
  }
});

// ── two people at once, through the real storage layer ──
test("two people add a customer from the same copy: both stay", async () => {
  await sb.sql("insert into app_state (key, value) values ('rc:customers', $1::jsonb)", [J([{ id: 1, name: "Base Hauling" }])]);
  const base = (await owner.db.getAll(["rc:customers"]))["rc:customers"];
  await owner.db.setItem("rc:customers", J([...P(base), { id: 1001, name: "Owner's new customer" }]), base);
  await office.db.setItem("rc:customers", J([...P(base), { id: 1002, name: "Office's new customer" }]), base);
  assert.deepEqual((await stored("rc:customers")).map((c) => c.name), ["Base Hauling", "Owner's new customer", "Office's new customer"]);
  // One removes Base Hauling while the other edits a different customer: the removal and the edit both land.
  const now = await stored("rc:customers");
  await office.db.setItem("rc:customers", J(now.filter((c) => c.id !== 1)), J(now));
  await owner.db.setItem("rc:customers", J(now.map((c) => (c.id === 1001 ? { ...c, phone: "587-863-0505" } : c))), J(now));
  assert.deepEqual((await stored("rc:customers")).map((c) => c.name + (c.phone ? " " + c.phone : "")), ["Owner's new customer 587-863-0505", "Office's new customer"]);
});

test("a tab left open logs labour on an engine: the owner's new price stays", async () => {
  const eng = { id: 1, sku: "BH-001", name: "ISX15", cat: "Complete Engine", status: "in-reman", price: 18000, cost: 9000, laborLogged: 0 };
  await owner.db.setItem("rc:inventory", J([eng]), J([]));
  const old = (await office.db.getAll(["rc:inventory"]))["rc:inventory"];   // the office tab, loaded now
  const fresh = (await owner.db.getAll(["rc:inventory"]))["rc:inventory"];
  await owner.db.setItem("rc:inventory", J(P(fresh).map((i) => ({ ...i, price: 21500 }))), fresh);
  await office.db.setItem("rc:inventory", J(P(old).map((i) => ({ ...i, laborLogged: 480 }))), old);
  const row = await engine(1);
  assert.equal(row.data.price, 21500);
  assert.equal(row.data.laborLogged, 480);
  assert.equal(Number(row.price), 21500);      // the typed column follows the merged record
});

test("two people tick different lines of the same teardown worksheet: both ticks stay", async () => {
  const sheet = { id: 77, engineId: 1, rows: { L1: { d: "" }, L2: { d: "" } } };
  await owner.db.setItem("rc:bomSheets", J([sheet]), J([]));
  const base = J([sheet]);
  await owner.db.setItem("rc:bomSheets", J([{ ...sheet, rows: { ...sheet.rows, L1: { d: "reuse", meas: "0.004" } } }]), base);
  await office.db.setItem("rc:bomSheets", J([{ ...sheet, rows: { ...sheet.rows, L2: { d: "mach" } } }]), base);
  assert.deepEqual((await stored("rc:bomSheets"))[0].rows, { L1: { d: "reuse", meas: "0.004" }, L2: { d: "mach" } });
});

test("a seeded list goes up whole on its first save, and a second device's first save merges into it", async () => {
  const seed = [1, 2, 3, 4, 5].map((i) => ({ id: "fleet-00" + i, name: "Fleet " + i, status: "" }));
  const ownerEdit = seed.map((x) => (x.id === "fleet-002" ? { ...x, status: "contacted" } : x));
  await owner.db.setItem("rc:prospects", J(ownerEdit), J(seed), { fresh: true });
  assert.deepEqual((await stored("rc:prospects")).map((x) => x.status), ["", "contacted", "", "", ""]);
  // The office loaded before that save, so its list is the seed too.
  await office.db.setItem("rc:prospects", J(seed.map((x) => (x.id === "fleet-004" ? { ...x, status: "interested" } : x))), J(seed), { fresh: true });
  assert.deepEqual((await stored("rc:prospects")).map((x) => x.status), ["", "contacted", "", "interested", ""]);
  // A list stored empty gets the seed back with the edit (the dashboard seeds research lists stored empty).
  await sb.sql("insert into app_state (key, value) values ('rc:competitors', '[]'::jsonb)");
  await owner.db.setItem("rc:competitors", J(ownerEdit), J(seed), { fresh: true });
  assert.equal((await stored("rc:competitors")).length, 5);
  // Without `fresh`, a device only ever sends its own changes.
  await owner.db.setItem("rc:compare", J(ownerEdit), J(seed));
  assert.deepEqual((await stored("rc:compare")).map((x) => x.id), ["fleet-002"]);
});

test("a list with a record that has no id goes up whole, like before", async () => {
  await owner.db.setItem("rc:contentCalendar", J([{ day: "Mon", post: "Engine Spotlight" }]), J([]));
  assert.deepEqual(await stored("rc:contentCalendar"), [{ day: "Mon", post: "Engine Spotlight" }]);
});

test("an employee login can't use the merge to reach shop data", async () => {
  const a = await mike.supabase.rpc("merge_list", { p_key: "rc:customers", p_changes: { put: [{ id: 9, item: { id: 9, name: "x" }, after: null }], del: [] }, p_full: null });
  assert.equal(a.error && a.error.code, "42501");
  const b = await mike.supabase.rpc("merge_inventory", { p_rows: [{ id: 1, item: { id: 1, price: 1 } }] });
  assert.equal(b.error && b.error.code, "42501");
  assert.equal((await engine(1)).data.price, 21500);
  assert.ok(!(await stored("rc:customers")).some((c) => c.id === 9));
});
