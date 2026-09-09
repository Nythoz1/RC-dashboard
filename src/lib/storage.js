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
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const usingCloud = !!supabase;

const TABLE = "app_state";

// ── Per-list relational table adapters (cloud only) ──
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const TABLE_ADAPTERS = {
  "rc:inventory": {
    table: "inventory",
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

async function tableGet(a) {
  const { data, error } = await supabase.from(a.table).select("data").order("id");
  if (error) throw error;
  return JSON.stringify((data || []).map((r) => r.data));
}

// The dashboard saves the whole list; write only what changed vs the caller's
// previous snapshot: upsert new/modified rows, delete only ids the user
// actually removed locally. A stale client can therefore never mass-delete
// rows it hasn't seen (the old delete-anything-missing behavior). With no
// snapshot available we upsert everything and delete nothing — safe default.
async function tableSet(a, valueString, prevString) {
  const arr = JSON.parse(valueString);
  const cur = (Array.isArray(arr) ? arr : []).filter((it) => it && it.id != null);
  let prev = null;
  try { prev = prevString != null ? JSON.parse(prevString) : null; } catch (e) { prev = null; }
  const rows = cur.map(a.toRow);
  let upserts = rows, removed = [];
  if (Array.isArray(prev)) {
    const prevBy = new Map(prev.filter((p) => p && p.id != null).map((p) => [Number(p.id), p]));
    upserts = [];
    cur.forEach((it, idx) => {
      const p = prevBy.get(Number(it.id));
      if (!p || JSON.stringify(p) !== JSON.stringify(it)) upserts.push(rows[idx]);
    });
    const curIds = new Set(cur.map((it) => Number(it.id)));
    removed = [...prevBy.keys()].filter((id) => !curIds.has(id));
  }
  if (upserts.length) {
    const up = await supabase.from(a.table).upsert(upserts);
    if (up.error) throw up.error;
  }
  if (removed.length) {
    const del = await supabase.from(a.table).delete().in("id", removed);
    if (del.error) throw del.error;
  }
}

async function tableDel(a) {
  const { data, error } = await supabase.from(a.table).select("id");
  if (error) throw error;
  const ids = (data || []).map((r) => r.id);
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
  async setItem(key, valueString, prevString) {
    if (!supabase) {
      localStorage.setItem(key, valueString);
      return;
    }
    const a = TABLE_ADAPTERS[key];
    if (a) return tableSet(a, valueString, prevString);
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value: JSON.parse(valueString), updated_at: new Date().toISOString() });
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
