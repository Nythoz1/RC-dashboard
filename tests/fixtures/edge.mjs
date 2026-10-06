// Run a Supabase Edge Function (Deno) in Node for tests: bundle it with esbuild
// (already installed with Vite), point its esm.sh supabase-js import at the
// local package, stub the two Deno APIs it uses, and hand back its request
// handler. Network calls go through globalThis.fetch, so a test can route them.
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let n = 0;

export async function loadEdgeFunction(name, env = {}) {
  const res = await build({
    entryPoints: [join(ROOT, "supabase", "functions", name, "index.ts")],
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{ name: "esm-sh", setup(b) { b.onResolve({ filter: /^https:\/\/esm\.sh\/@supabase\/supabase-js/ }, () => ({ path: "@supabase/supabase-js", external: true })); } }],
  });
  const dir = join(ROOT, "node_modules", ".cache", "edge-test");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, name + "-" + process.pid + "-" + ++n + ".mjs");
  writeFileSync(file, res.outputFiles[0].text);
  let handler = null;
  globalThis.Deno = { env: { get: (k) => (env[k] === undefined ? undefined : String(env[k])) }, serve: (h) => { handler = h; } };
  await import(pathToFileURL(file).href);
  if (!handler) throw new Error(name + " didn't call Deno.serve");
  return handler;
}
