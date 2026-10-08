// ─────────────────────────────────────────────────────────────
// Storage adapter for Rollin Coal dashboard
//
// Replaces the artifact-only `window.storage` API with a real backend.
// - If Supabase env vars are present  → reads/writes Supabase (cloud, multi-device)
// - If they are NOT present           → falls back to localStorage (works offline / in dev)
//
// The dashboard stores each STORE_KEY ("rc:customers", "rc:inventory", ...) and is
// unaware of the storage shape — it just calls db.getItem/setItem/removeItem.
//
// P4 relational migration (incremental): most lists still live as one JSON blob
// per key in the `app_state` table. Lists that have graduated to their own real
// table get an adapter in TABLE_ADAPTERS below; the dashboard keeps calling the
// same "rc:<list>" key. Each row stores the full object in a `data` jsonb column
// (exact round-trip — the app reads this back verbatim) plus a few projected,
// typed columns for SQL/queries and a real `id` PK that child tables' foreign
// keys (engine_id, ...) will reference. localStorage mode is unaffected (no
// tables) — it always uses the whole-blob path.
//
// Timesheet days and pay-period approvals live in tables from the start
// (migration 0011) because the database enforces who may write which day; a
// timesheet day's id is text ("<employee id>|<date>"), hence `textId`.
//
// Merged saves (migration 0014, src/lib/merge.js): a save sends only what this
// device changed since it last saved, and the database merges it into what's
// stored, so two people working at once don't overwrite each other. The app_state
// lists go through public.merge_list, inventory rows through
// public.merge_inventory (an adapter's `merge`); a timesheet day is one person's
// row and still goes up whole.
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";
import { diffItem, diffList, mergeable } from "./merge.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const usingCloud = !!supabase;

const TABLE = "app_state";

// ── Per-list relational table adapters (cloud only) ──
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const TABLE_ADAPTERS = {
  "rc:timesheets": {
    table: "timesheet_entries",
    textId: true,
    toRow: (it) => ({ id: String(it.id), employee_id: Number(it.emp), work_date: it.date, data: it }),
  },
  "rc:payPeriods": {
    table: "timesheet_approvals",
    toRow: (it) => {
      const id = Number(it.id);
      return { id, employee_id: Number(it.emp), start_date: it.start, end_date: it.end, data: { ...it, id } };
    },
  },
  "rc:inventory": {
    table: "inventory",
    merge: "merge_inventory",
    // Full object in `data`; a few projected columns for querying + the id PK.
    toRow: (it) => {
      // Coerce id to a number everywhere: the edit form stringifies numeric
      // fields for its inputs, and a string id here would make the keep-set
      // miss the numeric DB id below and wrongly delete the row.
      const id = it.id == null ? null : Number(it.id);
      return {
        id,
        sku: it.sku ?? null,
        name: it.name ?? null,
        cat: it.cat ?? null,
        status: it.status ?? null,
        price: num(it.price),
        cost: num(it.cost),
        data: { ...it, id },
      };
    },
  },
};

// Supabase returns at most 1,000 rows per request, so read in pages until a
// short page comes back (a year of timesheets for five people passes 1,000).
const PAGE = 1000;
async function tableGet(a) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(a.table).select("data").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    (data || []).forEach((r) => all.push(r.data));
    if (!data || data.length < PAGE) break;
  }
  return JSON.stringify(all);
}

// The database turned a row down on purpose (row-level security, a duplicate
// approval, a check): retrying won't help. Anything else (no connection, a
// timeout) is worth retrying later.
const REFUSALS = new Set(["42501", "23505", "23514", "P0001"]);
export const isRefusal = (e) => !!(e && REFUSALS.has(String(e.code || "")));

// The dashboard saves the whole list; write only what changed vs the caller's
// previous snapshot: new/modified rows, and deletes only for ids the user
// actually removed locally. A stale client can therefore never mass-delete
// rows it hasn't seen (the old delete-anything-missing behavior). With no
// snapshot available we write every row whole and delete nothing (safe default).
// A merging table (inventory) sends a changed row as just its changed fields,
// so a stale tab's labour total can't put back an old price.
async function tableSet(a, valueString, prevString) {
  const idOf = a.textId ? (v) => String(v) : (v) => Number(v);
  const arr = JSON.parse(valueString);
  const cur = (Array.isArray(arr) ? arr : []).filter((it) => it && it.id != null);
  let prev = null;
  try { prev = prevString != null ? JSON.parse(prevString) : null; } catch (e) { prev = null; }
  const rows = cur.map(a.toRow);
  // [row, patch for merge_inventory] for each new or changed record
  let changed = rows.map((row) => [row, { id: row.id, item: row.data }]), removed = [];
  if (Array.isArray(prev)) {
    const prevBy = new Map(prev.filter((p) => p && p.id != null).map((p) => [idOf(p.id), p]));
    changed = [];
    cur.forEach((it, idx) => {
      const p = prevBy.get(idOf(it.id)), row = rows[idx];
      if (!p) changed.push([row, { id: row.id, item: row.data }]);
      else if (JSON.stringify(p) !== JSON.stringify(it)) changed.push([row, { id: row.id, item: row.data, ...diffItem(p, it) }]);
    });
    const curIds = new Set(cur.map((it) => idOf(it.id)));
    removed = [...prevBy.keys()].filter((id) => !curIds.has(id));
  }
  const write = (list) => (a.merge
    ? supabase.rpc(a.merge, { p_rows: list.map(([, patch]) => patch) })
    : supabase.from(a.table).upsert(list.map(([row]) => row)));
  // One request for all of them; if the database refuses it (one timesheet day
  // in an approved period refuses the whole statement), go row by row so the
  // other rows still save, and report the refused ones to the caller.
  const refused = [];
  if (changed.length) {
    const up = await write(changed);
    if (up.error) {
      if (!isRefusal(up.error)) throw up.error;
      for (const one of changed) {
        const r = await write([one]);
        if (r.error) { if (!isRefusal(r.error)) throw r.error; refused.push({ id: one[0].id, code: r.error.code, message: r.error.message }); }
      }
    }
  }
  if (removed.length) {
    // Row-level security makes a refused delete look like a delete of nothing,
    // so ask for the deleted ids back and count the missing ones as refused.
    const del = await supabase.from(a.table).delete().in("id", removed).select("id");
    if (del.error) throw del.error;
    const gone = new Set((del.data || []).map((r) => idOf(r.id)));
    removed.filter((id) => !gone.has(idOf(id))).forEach((id) => refused.push({ id, code: "42501", message: "not allowed to remove" }));
  }
  return refused.length ? { refused } : undefined;
}

async function tableDel(a) {
  const ids = JSON.parse(await tableGet({ ...a })).map((it) => it.id);
  if (ids.length) {
    const del = await supabase.from(a.table).delete().in("id", ids);
    if (del.error) throw del.error;
  }
}

export const db = {
  async getItem(key) {
    if (!supabase) return localStorage.getItem(key);
    const a = TABLE_ADAPTERS[key];
    if (a) return tableGet(a);
    const { data, error } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? JSON.stringify(data.value) : null;
  },

  // Batched load: every requested key in ~one round trip instead of one
  // request per list. Blob keys come back from a single IN(...) query on
  // app_state; table-backed keys fan out to their adapters, all in parallel.
  // Returns { key: valueString | null } with the same per-key semantics as
  // getItem (null = never stored, "[]" = stored empty). Throws on any error so
  // the caller can refuse a partial load rather than seed over real data.
  async getAll(keys) {
    const out = {};
    if (!supabase) {
      keys.forEach((k) => { out[k] = localStorage.getItem(k); });
      return out;
    }
    const blobKeys = keys.filter((k) => !TABLE_ADAPTERS[k]);
    const tableKeys = keys.filter((k) => TABLE_ADAPTERS[k]);
    const [blobRes, ...tableVals] = await Promise.all([
      blobKeys.length
        ? supabase.from(TABLE).select("key,value").in("key", blobKeys)
        : Promise.resolve({ data: [], error: null }),
      ...tableKeys.map((k) => tableGet(TABLE_ADAPTERS[k])),
    ]);
    if (blobRes.error) throw blobRes.error;
    const byKey = new Map((blobRes.data || []).map((r) => [r.key, r.value]));
    blobKeys.forEach((k) => { out[k] = byKey.has(k) ? JSON.stringify(byKey.get(k)) : null; });
    tableKeys.forEach((k, i) => { out[k] = tableVals[i]; });
    return out;
  },
  // Resolves to undefined, or { refused: [{ id, code, message }] } when the
  // database turned some table rows down (the rest were saved). Throws when the
  // save didn't go through at all (no connection), so the caller can retry.
  // prevString is what this device last saved of the list; opts.fresh says the
  // list may never have been stored (a seed on its first save), so it goes up
  // whole as well, written only if the server has nothing (or an empty list).
  async setItem(key, valueString, prevString, opts = {}) {
    if (!supabase) {
      localStorage.setItem(key, valueString);
      return;
    }
    const a = TABLE_ADAPTERS[key];
    if (a) return tableSet(a, valueString, prevString);
    const cur = JSON.parse(valueString);
    let prev = null;
    try { prev = prevString != null ? JSON.parse(prevString) : null; } catch (e) { prev = null; }
    if (!mergeable(cur) || (prev != null && !mergeable(prev))) {
      // A record without an id can't be merged: the list goes up whole, as it used to.
      const { error } = await supabase.from(TABLE).upsert({ key, value: cur, updated_at: new Date().toISOString() });
      if (error) throw error;
      return;
    }
    const changes = diffList(prev, cur);
    if (!changes) return;
    const { error } = await supabase.rpc("merge_list", { p_key: key, p_changes: changes, p_full: opts.fresh ? cur : null });
    if (error) throw error;
  },

  async removeItem(key) {
    if (!supabase) {
      localStorage.removeItem(key);
      return;
    }
    const a = TABLE_ADAPTERS[key];
    if (a) return tableDel(a);
    const { error } = await supabase.from(TABLE).delete().eq("key", key);
    if (error) throw error;
  },
};
