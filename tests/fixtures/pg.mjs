// A throwaway Postgres (PGlite, in-process) shaped like the shop's Supabase
// project: the anon / authenticated / service_role roles, auth.jwt() and
// auth.uid() reading the request's claims the way Supabase does, a stub storage
// schema, and the repo's migrations applied in order. Tests run SQL as a given
// login with asLogin(), so the real row-level security policies decide.
// (0006-0009 are left out: a view that's dropped again, pg_cron, pg_net, Vault.)
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGRATIONS = ["0001_init.sql", "0002_auth.sql", "0003_inventory_table.sql", "0004_engine_photos_storage.sql", "0005_narrow_photo_listing.sql", "0010_ecm_files_bucket.sql", "0011_timesheets.sql", "0012_ts_locked_invoker.sql", "0013_known_roles_only.sql"];

export async function freshDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage; create schema extensions;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id bigserial primary key, bucket_id text, name text, owner uuid);
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage, public, extensions to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
  `);
  for (const f of MIGRATIONS) await db.exec(readFileSync(new URL("../../supabase/migrations/" + f, import.meta.url), "utf8"));
  await db.exec(`grant all on all tables in schema public, storage to anon, authenticated, service_role;
                 grant all on all sequences in schema public, storage to anon, authenticated, service_role;`);
  return db;
}

// Claims for a login, like the access token Supabase issues.
export const claimsFor = (u) => (u === "anon" ? { role: "anon" } : u === "service" ? { role: "service_role" } : { sub: u.id, email: u.email, role: "authenticated", app_metadata: { provider: "email", ...(u.app_metadata || {}) } });

// Run one statement as a login ("anon", "service" or a user object). One at a
// time: PGlite has a single connection, so callers are queued.
let queue = Promise.resolve();
export function asLogin(db, who, sql, params = []) {
  const run = async () => {
    const role = who === "anon" ? "anon" : who === "service" ? "service_role" : "authenticated";
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claimsFor(who))]);
    await db.exec("set role " + role);
    try { return await db.query(sql, params); } finally { await db.exec("reset role"); }
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}
