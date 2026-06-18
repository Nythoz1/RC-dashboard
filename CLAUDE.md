# CLAUDE.md — Rollin Coal Shop Management System

Guidance for Claude Code (and any agent) working on this repo. Read this fully before editing.

## Project overview

React + Vite single-page app for **Rollin Coal — Canada's Diesel Engine Specialists**, a diesel engine sales & service business in **Medicine Hat, Alberta**. Rollin Coal buys, remanufactures, and sells diesel engines Canada-wide, plus does HD service work.

- ~80 engines in inventory (Caterpillar, Cummins, Detroit, International, Paccar, Mercedes, Mack, etc.)
- Phone 1-587-863-0505 · rollin-coal.ca · 2040 11th Ave NW, Medicine Hat, AB
- Brand: industrial dark theme, matte black (`#0a0a0a`) + burnt orange (`#d4581a`); Barlow Condensed (display) + IBM Plex Mono (mono)

This was originally a Claude artifact (single `.jsx` using `window.storage` and a keyless Anthropic call). It has been converted to a real Vite project with a Supabase backend. **Do not reintroduce `window.storage`, `localStorage` directly in the component, `confirm()`, `alert()`, or a client-side API key.**

## Stack & layout

```
package.json                     Vite + React + @supabase/supabase-js
vite.config.js
index.html
.env.example                     copy to .env
src/
  main.jsx                       entry (no StrictMode — avoids double storage effects)
  RollinCoalDashboard.jsx        the entire app (~606 lines, one file by design)
  lib/
    storage.js                   db adapter: Supabase app_state table ⇄ localStorage fallback
    ai.js                        askClaude() → calls the Supabase Edge Function (sends the user's token)
    auth.js                      email/password auth + login gate (Supabase); no-op on localStorage
supabase/
  functions/ai/index.ts          Deno function; holds ANTHROPIC_API_KEY, requires a logged-in user
  migrations/0001_init.sql       app_state key-value table + RLS
  migrations/0002_auth.sql       swaps anon access for an authenticated-only RLS policy
```

Run: `npm install` → `npm run dev`. Build: `npm run build`. See README.md for Supabase setup.

## Architecture of `RollinCoalDashboard.jsx`

Single file, intentionally. React with `useReducer`. Approximate map (search by the landmark strings, don't trust line numbers — they drift):

- `const FONTS` / `const EMPTY` — initial state, incl. 80-engine inventory seed + injector `parts` seed
- `const STORE_KEYS` — the 18 persisted lists (see below)
- `function reducer` — actions: `TAB, MODAL, CLOSE, LOAD, ADD, UPDATE, DELETE, UNDO, TOAST, RESET`
- Helpers — `$$, $K, invTot, stk, cn`, engine helpers (`isEngine, engStatus, costBasis, trueMargin, marginPct, engLinks`), `CHANNELS`, `compressImg`
- `saveAll / loadAll / clearAll` — call `db` from `lib/storage`
- Shared UI — `Badge, Stat, SH, Fil, Empty, Tbl, BtnRow`
- Views — `Overview, Customers, Quotes, Inv, Parts, Invoicing, Operations, Marketing, Schedule, Emps, Reports`
- `function Modals` — every add/edit/detail modal; helpers `F, CS, ES, TS, PH, FM, EFM, LI, W, X, C`
- `const CSS` — full stylesheet string injected via `<style>`
- `export default function App` — load/save effects, tab routing, toast UI

### State shape (`STORE_KEYS`, all arrays)
`customers, jobs, quotes, inventory, invoices, schedule, employees, expenses, leads, social, campaigns, contentCalendar, cores, shipments, commsLog, purchaseOrders, warranties, parts`

Transient state (NOT persisted): `tab, modal, md, toast, lastDel`. `saveAll` only writes `STORE_KEYS`, so these never hit the DB.

### Tabs
Overview · Customers · Quotes · Inventory · Parts · Invoicing · Operations · Marketing · Schedule · Team · Reports

## Key domain concepts (important — this is an engine shop, not a parts store)

- **Engine unit record (the "passport").** Each engine in `inventory` with `cat==="Complete Engine"` (or `"Core"`) is a serialized unit. Fields: `serial`/`esn`, `cpl`, `arrangement`, `year`, `ratedHp`, `oilCap`, `sourceCore`, `status`, `photo`, `listedOn`, and a cost-basis breakdown (`costCore, costFreight, costParts, costLabor`). Opening an engine shows the full passport (in `Modals`, `s.modal==="part-detail"`).
- **Lifecycle status** (`ENG_STATUSES`): `core → in-reman → available → on-hold → sold`. Use `engStatus(i)` (falls back to "available", or "core" for cores). Don't store status as free text in `notes`.
- **True margin.** `costBasis(i)` sums the breakdown (falls back to flat `cost`); `trueMargin`/`marginPct` use it. A returned core can erase margin — keep cost basis honest.
- **Linked records.** Invoices, cores, warranties, shipments may carry `engineId` pointing at the inventory item. `engLinks(s, id)` resolves them; the passport renders them. The "Sell Engine" button in the passport opens a pre-filled invoice and flips the engine to `sold`.
- **Advertising channels** (`CHANNELS`): facebook, kijiji, marketbook. Each engine has `listedOn: []`. The **1-Post Funnel** (Marketing tab) generates platform-tailored listings via AI, opens all three posting pages, and stamps `listedOn`. Inventory shows channel chips + a "Not Listed" filter.

## Conventions (follow these — they prevent regressions)

- IDs: `Date.now()`. Never sequential ints.
- Mutations go through the reducer (`ADD/UPDATE/DELETE`). Don't mutate state directly.
- Deletes are **undoable** via the toast (reducer stashes `lastDel`, `UNDO` restores). Don't add `confirm()`.
- Customer/tech/engine pickers are `<select>` dropdowns (`CS`, `TS`, `ES`), never raw ID text inputs.
- Date inputs: the `F` helper auto-renders `type="date"` for date-named keys (`DATEKEYS`). Defaults use `isoToday()`.
- Photos: `compressImg` (≤480px, JPEG q0.6) before storing; engines also accept an image URL.
- Styling: add to the `CSS` string; reuse existing classes (`rc-card, rc-ba, rc-bs, rc-fi, rc-fg, rc-fl, rc-tn, rc-fb`...). Keep the dark/orange theme. Print rules live in `@media print`.
- After edits, the build must pass: `npm run build`. Keep brackets balanced (the file is dense single-line JSX).

## Backend

- **Storage** (`lib/storage.js`): if `VITE_SUPABASE_*` set → Supabase `app_state` (key `rc:<list>`, JSONB value). Else → localStorage. The component is unaware which; it just calls `db.getItem/setItem/removeItem`.
- **AI** (`lib/ai.js` + `supabase/functions/ai`): `askClaude(prompt)` POSTs to the Edge Function, which calls Anthropic with the server-side key. Model via `ANTHROPIC_MODEL` secret (default `claude-sonnet-4-6`).

## Auth & security (implemented — P0)

Auth is wired up. When Supabase is configured the app requires an email/password login; on localStorage (no `.env`) it runs open for local dev — there is no shared backend to protect, so the gate is skipped.

- **Model: shared workspace.** `0002_auth.sql` replaces the old anon policy with one scoped to the `authenticated` role (`for all to authenticated using(true) with check(true)`). Any logged-in staff member reads/writes *all* shop data — no per-user isolation by design (it's one shop).
- **Invite-only.** Create users in Supabase Dashboard → Authentication → Users. Disable public sign-up (Authentication → Providers → Email → "Allow new users to sign up" OFF). There is deliberately **no sign-up form** — don't add one.
- **AI function requires a real user.** `functions/ai` verifies the caller's token with `auth.getUser()` and rejects the anon key (the anon key is itself a valid JWT, so gateway JWT-verification alone is not enough). Deploy it **without** `--no-verify-jwt`.
- **The UI login gate is convenience only.** Real enforcement is server-side: RLS + the function's user check. A client that bypasses the React gate still can't touch data without a session.
- **Client:** `lib/auth.js` exposes `getSession/signIn/signOut/onAuthChange` and re-exports `usingCloud`. `App` renders `<Login>` when `usingCloud && !session`; the header shows the email + a Sign Out button. Load/save effects are gated on `authed`, so nothing reads or writes while logged out.

Not yet done (future hardening): per-user audit columns, role-based admin (e.g. gating the Reset button), password policy.

## Future: relational migration (optional, larger)

The current backend stores each list as one JSON blob — simple and reliable, but the engine↔invoice/core/warranty/shipment links are app-resolved by `engineId`, not enforced by the DB. To make them real foreign keys, create per-entity tables (`customers, engines, invoices, cores, warranties, shipments, ...`) with `engine_id` FKs, then refactor `lib/storage.js` to map lists to tables and the reducer to per-row ops. Do this incrementally, one entity at a time, keeping `app_state` working until each table is migrated. Not required for the app to function.

## Safe-change checklist

1. `npm run dev` and reproduce the area you're changing.
2. Make the change; keep to existing patterns above.
3. `npm run build` must succeed.
4. Verify persistence (reload), and undo/toast still work for any list you touched.
5. If you added a `STORE_KEY`, add it to `STORE_KEYS`, `EMPTY`, and the save-effect dependency array in `App`.
