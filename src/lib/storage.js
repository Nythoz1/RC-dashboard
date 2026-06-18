// ─────────────────────────────────────────────────────────────
// Storage adapter for Rollin Coal dashboard
//
// Replaces the artifact-only `window.storage` API with a real backend.
// - If Supabase env vars are present  → reads/writes the `app_state` table (cloud, multi-device)
// - If they are NOT present           → falls back to localStorage (works offline / in dev)
//
// The dashboard stores each STORE_KEY ("rc:customers", "rc:inventory", ...) as one row.
// Value is kept as JSONB in Supabase; getItem returns a JSON string for drop-in
// compatibility with the original window.storage semantics.
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const usingCloud = !!supabase;

const TABLE = "app_state";

export const db = {
  async getItem(key) {
    if (!supabase) return localStorage.getItem(key);
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
    const { error } = await supabase.from(TABLE).delete().eq("key", key);
    if (error) throw error;
  },
};
