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
    toRow: (it) => ({
      id: it.id,
      sku: it.sku ?? null,
      name: it.name ?? null,
      cat: it.cat ?? null,
      status: it.status ?? null,
      price: num(it.price),
      cost: num(it.cost),
      data: it,
    }),
  },
};

async function tableGet(a) {
  const { data, error } = await supabase.from(a.table).select("data").order("id");
  if (error) throw error;
  return JSON.stringify((data || []).map((r) => r.data));
}

// The dashboard saves the whole list, so sync the table to it: upsert every
// present row, then delete rows whose id is no longer in the list.
async function tableSet(a, valueString) {
  const arr = JSON.parse(valueString);
  const rows = (Array.isArray(arr) ? arr : []).map(a.toRow).filter((r) => r.id != null);
  const keep = new Set(rows.map((r) => r.id));
  if (rows.length) {
    const up = await supabase.from(a.table).upsert(rows);
    if (up.error) throw up.error;
  }
  const { data: existing, error: selErr } = await supabase.from(a.table).select("id");
  if (selErr) throw selErr;
  const removed = (existing || []).map((r) => r.id).filter((id) => !keep.has(id));
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

  async setItem(key, valueString) {
    if (!supabase) {
      localStorage.setItem(key, valueString);
      return;
    }
    const a = TABLE_ADAPTERS[key];
    if (a) return tableSet(a, valueString);
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
