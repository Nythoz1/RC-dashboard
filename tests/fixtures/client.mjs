// The dashboard's real storage layer (src/lib/storage.js) as a signed-in
// "device" in Node: bundled with esbuild with the cloud settings filled in, so
// each call gives a separate module instance, with its own Supabase client and
// session, talking to the mock Supabase through globalThis.fetch.
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let n = 0;

// A Map-backed localStorage, so supabase-js can keep each device's session.
class MemoryStorage { constructor() { this.m = new Map(); } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }

export async function loadDevice({ url, anonKey, email, password }) {
  const res = await build({
    entryPoints: [join(ROOT, "src", "lib", "storage.js")],
    bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent",
    external: ["@supabase/supabase-js"],
    define: { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url), "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(anonKey) },
  });
  const dir = join(ROOT, "node_modules", ".cache", "client-test");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "storage-" + process.pid + "-" + ++n + ".mjs");
  // Each device gets its own storage for its session.
  const store = new MemoryStorage();
  writeFileSync(file, res.outputFiles[0].text.replace(/createClient\(url, anonKey\)/, "createClient(url, anonKey, { auth: { storage: globalThis.__rcStorage" + n + ", persistSession: true, autoRefreshToken: false } })"));
  globalThis["__rcStorage" + n] = store;
  const mod = await import(pathToFileURL(file).href);
  if (email) {
    const { error } = await mod.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("sign-in failed for " + email + ": " + error.message);
  }
  return mod;
}
