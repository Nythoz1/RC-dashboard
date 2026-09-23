# CLAUDE.md — Rollin Coal Shop Management System

Guidance for Claude Code (and any agent) working on this repo. Read this fully before editing.

## Project overview

React + Vite single-page app for **Rollin Coal — Canada's Diesel Engine Specialists**, a diesel engine sales & service business in **Medicine Hat, Alberta**. Rollin Coal buys, remanufactures, and sells diesel engines Canada-wide, plus does HD service work.

- ~20 engines in live inventory (Caterpillar, Cummins, Detroit, International, Paccar, Mercedes, Mack, etc.) — the 80-row seed in `EMPTY` is only for fresh/local installs
- Phone 1-587-863-0505 · rollin-coal.ca · 2040 11th Ave NW, Medicine Hat, AB
- Brand: **Daylight** — light by default (warm off-white `#f3f2ef`, white cards, near-black text) with burnt orange (`#d4581a`) reserved for actions, the active nav item and alerts; a **Night** theme swaps the same tokens for dark surfaces. Public Sans (UI text) + Barlow Condensed (page titles, big numbers)

This was originally a Claude artifact (single `.jsx` using `window.storage` and a keyless Anthropic call). It has been converted to a real Vite project with a Supabase backend. **Do not reintroduce `window.storage`, `localStorage` directly in the component, `confirm()`, `alert()`, or a client-side API key.**

## Stack & layout

```
package.json                     Vite + React + @supabase/supabase-js
vite.config.js
index.html
.env.example                     copy to .env
src/
  main.jsx                       entry (no StrictMode — avoids double storage effects)
  RollinCoalDashboard.jsx        the entire app (one file by design)
  issuesSeed.js                  starter rows for the common-issues knowledge base (ISSUE_SEED)
  bomSeed.js                     ISX15/X15 CM2350 long block parts order + decision sheet, REV 5.0 (BOM_SEED) + suppliers (VENDOR_SEED)
  lib/
    storage.js                   db adapter: Supabase app_state table ⇄ localStorage fallback
    ai.js                        askClaude() → calls the Supabase Edge Function (sends the user's token)
    auth.js                      email/password auth + login gate (Supabase); no-op on localStorage
    brief.js                     requestBriefNow() → calls the brief Edge Function (Overview "Send now")
    prefs.js                     getPref/setPref — per-device UI prefs (the colour theme); never shop data
supabase/
  functions/ai/index.ts          Deno function; holds ANTHROPIC_API_KEY, requires a logged-in user
  migrations/0001_init.sql       app_state key-value table + RLS
  migrations/0002_auth.sql       swaps anon access for an authenticated-only RLS policy
  migrations/0003_inventory_table.sql  P4 phase 1: inventory → its own table (data jsonb + columns)
  functions/brief/index.ts       Morning Brief: computes + emails the daily brief; stores it as app_state rc:brief
  migrations/0008_morning_brief_cron.sql  pg_cron hourly trigger + Vault-only shared secret + brief_secret() RPC
```

Run: `npm install` → `npm run dev`. Build: `npm run build`. See README.md for Supabase setup.

## Architecture of `RollinCoalDashboard.jsx`

Single file, intentionally. React with `useReducer`. Approximate map (search by the landmark strings, don't trust line numbers — they drift):

- `const FONTS` / `const EMPTY` — initial state, incl. 80-engine inventory seed + injector `parts` seed
- `const STORE_KEYS` — the persisted lists (see below)
- `function reducer` — actions: `TAB, MODAL, BACK, CLOSE, LOAD, ADD, UPDATE, DELETE, UNDO, TOAST, SPLASH, RESET`. Modals keep a back stack in `mstack`: `MODAL` pushes the current modal (re-opening the same modal only refreshes `md`; opening one already in the stack unwinds to it; opening from no modal starts a fresh chain), `BACK` pops, `CLOSE`/`TAB` clear. The modal wrapper `W` shows a Back button when there is history.
- Helpers — `$$, $K, invTot, stk, cn`, engine helpers (`isEngine, engStatus, costBasis, trueMargin, marginPct, engLinks`), `CHANNELS`, `compressImg`
- `saveAll / loadAll / clearAll` — call `db` from `lib/storage`. `loadAll` seeds `EMPTY` only for keys that were **never persisted**; a stored empty list stays empty (deleting every row no longer re-seeds it).
- Shared UI — `Badge, Stat, SH, Fil, Empty, Tbl, BtnRow`
- Views — `Overview, Customers, Quotes, Inv, Parts, Issues, Invoicing, Operations, Marketing, Schedule, Emps, Reports`
- `function Modals` — every add/edit/detail modal; helpers `F, CS, ES, TS, PH, FM, EFM, LI, W, X, C`
- `const CSS` — full stylesheet string injected via `<style>`
- `export default function App` — load/save effects, theme, the shell (sidebar `rc-side` + `rc-main` with the page header `rc-top`), tab routing, toast UI. `ICO`/`Ico` are the sidebar's inline SVG icons; `THEMES` the Day/Night/Auto switch

### State shape (`STORE_KEYS`, all arrays)
`customers, jobs, timeEntries, quotes, inventory, invoices, schedule, employees, expenses, leads, social, campaigns, contentCalendar, cores, shipments, commsLog, purchaseOrders, warranties, parts, wins, activity, settings, diagnoses, issues, brief, boms, bomSheets, vendors`

Transient state (NOT persisted): `tab, modal, md, mstack, toast, lastDel, soldSplash`. `saveAll` only writes `STORE_KEYS`, so these never hit the DB. `brief` is the one `STORE_KEY` the app never mutates (server-written by the brief function), so it is never dirty and never saved by the client.

### Navigation
A left sidebar (`NAV` in `App`) lists every view, grouped: Overview · **Shop** (Engines, BOM, Parts, Issues) · **Sales** (Marketing, Quotes, Invoicing) · **Operations** (Customers & Jobs, Operations, Schedule) · **Business** (Team, Reports). The page title in `rc-top` comes from `TABL[s.tab]`. At ≤900px the sidebar becomes a slide-out drawer opened by the ☰ button (`navOpen`, `.rc-shell.nav-open`) and closes on navigation or a tap on the scrim. The sidebar footer holds the theme switch, the signed-in email, Backup, Reset and Sign out. Tab keys (`s.tab`: overview, inventory, parts, boms, social, issues, customers, operations, schedule, quotes, invoices, employees, reports) are unchanged, so `TAB` dispatches still target individual views.

### Theme (Daylight + Night)
All colour comes from CSS custom properties on `.rc-root`: `--bg` page, `--sf`/`--sf2` surfaces, `--in` inputs, `--ln`/`--ln2` borders, `--tx`/`--tx2`/`--mt`/`--ft` text from strongest to faintest, `--ac`/`--act`/`--acs`/`--ach` accent (fill / text / soft background / hover), status pairs `--g/--gs` good, `--w/--ws` warn, `--r/--rs` bad, `--b/--bs` info, `--p/--ps` AI, plus `--sh1`/`--sh2` shadows and `--ov` modal scrim. The bare `.rc-root` block is Day; `.rc-root[data-theme="night"]` redefines the same tokens. `App` computes `theme` from the per-device preference `rc:theme` (`lib/prefs.js`: `day` default, `night`, or `auto` = follow the device's `prefers-color-scheme`) and stamps it on every root (`App`, `Login`, the splash and the load-error screen). Printing always uses Day tokens. The SOLD splash deliberately keeps its own dark backdrop in both themes. The printed engine sheet and the brief email are separate documents with their own fixed styling.

## Key domain concepts (important — this is an engine shop, not a parts store)

- **Engine unit record (the "passport").** Each engine in `inventory` with `cat==="Complete Engine"` (or `"Core"`) is a serialized unit. Fields: `serial`/`esn`, `cpl`, `arrangement`, `year`, `ratedHp`, `oilCap`, `sourceCore`, `status`, `photo`, `listedOn`, and a cost-basis breakdown (`costCore, costFreight, costParts, costLabor`). Opening an engine shows the full passport (in `Modals`, `s.modal==="part-detail"`), laid out as five tabs — Overview (identity, total-in/list/margin strip, lifecycle, notes) · Costs (cost basis + pricing, parts log, reman labor) · BOM (long block parts order + decision sheet) · Diagnosis (history + known issues) · Sell (channels, linked records) — with header/photo/underwater banner/actions always visible. Tab state is `ptab` in `Modals`; it persists across re-renders and Back for the same engine, and callers can land on a tab by passing `ptab` on the modal payload (e.g. `{...eng, ptab:"diagnosis"}`).
- **Lifecycle status** (`ENG_STATUSES`): `core → in-reman → available → on-hold → sold`. Use `engStatus(i)` (reads `i.status`; falls back to "available", or "core" for cores). Don't store status as free text in `notes`. Engine availability/stock derives from `status`, **never `qty`** — `qty`/`reorder`/`stk()` are parts-only. The **Reman Board** (Inventory tab → toggle, `view==="board"` in `Inv`) is a kanban of the five stages: drag a card or use ←/→ to set `status`, click a card to open its passport, and the header surfaces WIP capital (cost basis tied up in `core`/`in-reman`/`on-hold`). Reuses the `rc-bcol`/`rc-bh`/`rc-jc` board classes plus `rc-rboard` (5-col).
- **True margin.** `costBasis(i)` sums the breakdown (falls back to flat `cost`); `trueMargin`/`marginPct` use it. A returned core can erase margin — keep cost basis honest.
- **Linked records.** Invoices, cores, warranties, shipments may carry `engineId` pointing at the inventory item. `engLinks(s, id)` resolves them; the passport renders them. The "Sell Engine" button in the passport opens a pre-filled invoice and flips the engine to `sold`.
- **Labor / time tracking.** `timeEntries` (`{id, jobId, tech, date, hours, rate, notes}`) logs labor against a work order, linked by `jobId` (a separate list, not embedded on the job). The Work Order modal (`job-detail`) shows logged time + hour/$ totals, with **Log Time** (→ `add-time`; the tech picker prefills `rate` from the employee) and **Bill Labor** (→ pre-filled invoice, one line per entry). Reports rolls it up as *Labor by Technician* (hours + billable $). `rate` is snapshotted onto each entry so historical labor cost survives employee rate changes.
- **Diagnosis history.** `diagnoses` (`{id, engineId, date, tech, symptoms:[], codes, findings, fix, outcome(open/monitoring/resolved), hours, rate, parts:[{d,v}], jobId, issueId, notes}`) is the per-engine record of what was found and done. The passport renders it (section *Diagnosis history*, modals `add-dx / edit-dx / dx-detail`); the Issues tab has a shop-wide *Diagnosis log*. Diagnosis `hours × rate` and `parts` are folded into the engine by `syncLabor` (→ `laborLogged` and `dxParts`) and counted by `costBasis` — never copy them into `partsLog`/`timeEntries` or they'd double-count. `dxMatches(s, eng, symptoms)` gives the "seen N× before on this family" count. **AI**: *Suggest causes* in the diagnosis form calls `askClaude` with symptoms/codes/findings + the matching known issues + prior family diagnoses as context.
- **Common-issues knowledge base.** `issues` (`{id, models:[], title, symptoms:[], severity(high/medium/low), causes, confirm, fix, parts, notes, source(seed/shop)}`) is seeded from `issuesSeed.js` on first load. `models` are match tokens compared against the *normalized engine name* (`normM` strips everything but A–Z0–9; `issueFits(issue, engine)`), so `ISX` matches every ISX and `[]` means every engine. `familyKey(engine)` picks the engine's family from `FAMILIES` (longest tokens first — ISX15 before ISX, DD13 before D13); `famLabel` prettifies a few. The passport shows *known issues for this family*; the diagnosis detail has **Add to common issues** (prefills an issue from the findings and links the diagnosis via `issueId`). Browse in the Issues tab by model or by symptom (`SYMPTOMS` is the shared tag list for both records).
- **Bill of materials — long block parts order + decision sheet.** `boms` are per-family templates transcribed from the shop's own paper form (seed: ISX15 CM2350 Long Block, REV 5.0, in `bomSeed.js`): `{id, label, family, model, rev, match:[], note, rule, watch, lines:[{id, sec, qty, part, kind, note, mach}]}`. Lines come in two kinds (`lineKind`), mirroring the form's two pages. **`order`** lines are always new and ordered the day the job opens — never ticked, only struck out for a job that doesn't need them (`d:"skip"`). **`decide`** lines get `reuse` (measured, in spec, number written down), `miss` (not there when opened — money back on the core) or `mach` (machine shop); **blank means replace**, but only once the tech signs the sheet off (`sh.decidedAt`) — before that a blank is just undecided. `bomSheets` is one filled-in form per engine: `{id, engineId, bomId, engName, date, tech, wo, coreSource, notes, supplier, po, orderedDate, orderedBy, backorders, decidedAt, decidedBy, rows:{[lineId]:{d, cost, pn, url, meas, logged}}}`. Nothing is pre-ticked (`newRows` returns `{}`). Helpers: `bomStats` (order/skip/decide/reuse/miss/mach/repl/open + `signed`/`ordered`), `rowD` (reads a legacy `"repl"` as blank), `bomPick` (decision lines by tick), `bomBuy` (everything to buy, tagged `order`/`miss`/`repl`), `bomSecs`, `bomCost`; older `tier`-based templates still load (tier 1 → order, else decide). The passport's **BOM** tab shows two status rows (parts order placed? decisions signed off?) over the line list. **Long Block Parts Order** (`bom-shop`) groups `bomBuy` by why, carries supplier / PO / backorders + ETA / Mark ordered, buy links and cost boxes, and *Log to cost basis* appends to the engine's `partsLog` (marking `logged` so nothing double-counts). **Machine shop** (`bom-mach`) lists decisions ticked MACH with their measurements. Out-of-scope parts (turbo, EGR, fuel system, ECM, harness, starter, alternator, air compressor) are deliberately absent — the buyer picks their own; the template's `watch` says so. The seed's match token is **`X15`**, which catches both the older ISX15 and the 2017+ X15 (same 15L family, CM2350-era ECM) but deliberately not the CM870/871 ISX — clone the worksheet for those. Manage templates and suppliers in Inventory → BOM (`Boms` view): each template shows exactly which engines on the lot it matches, a **Put this worksheet on an engine** picker starts a sheet and jumps to that engine's passport, and **What The Shop Needs** rolls every worksheet into one list (to buy / missing from the core / to the machine shop / reusing). The passport never dead-ends: when no template matches, it offers the other worksheets to use anyway plus a Build one shortcut. Put the wrong worksheet on an engine? **✕ Remove worksheet** (BOM tab header, or ✕ on *Worksheets In Progress*) is a plain `DELETE`, undoable from the toast. **Sheet info → Wrong worksheet? Swap it** moves the sheet to another template, carrying ticks, measurements and part numbers across by normalized part name.
- **Suppliers** (`vendors`): `{id, name, site, search, note}` where `search` carries a `{q}` placeholder. `buyQ` builds the query from the line's part number when one is saved, otherwise family + model + part name; `buyUrl` substitutes it. Suppliers without a stable search URL of their own use a Google search scoped to their domain, which does not rot — saving a direct `url` + `pn` on a line turns it into a one-tap reorder.
- **Cost basis rule** (`fixedCost` + `costBasis`): the breakdown (`costCore/costFreight/costParts/costLabor`) or, when none was entered, the flat `cost`, **plus** itemized `partsLog`, `dxParts` and `laborLogged`. The flat cost is the acquisition cost — adding a $50 part never makes the basis $50.
- **Advertising channels** (`CHANNELS`): facebook, kijiji, marketbook. Each engine has `listedOn: []`. The **1-Post Funnel** (Marketing tab) generates platform-tailored listings via AI, opens all three posting pages, and stamps `listedOn`. Inventory shows channel chips + a "Not Listed" filter.

## Autonomy — Morning Brief & event automations

- **Morning Brief** (`supabase/functions/brief/index.ts`): a scheduled Edge Function that computes yesterday (sales, hours, parts into builds, remans completed, diagnoses), today's attention list (underwater/stale engines, overdue invoices, unlisted engines, cores pending, missing cost basis, open diagnoses), the shop-level Daily 3 and month-vs-goal, then emails it via Resend to `MAIL_TO` (default wayne@rollin-coal.ca) and stores it in `app_state` as `rc:brief`. `0008_morning_brief_cron.sql` enables pg_cron/pg_net (`0009_pg_net_schema.sql` moves pg_net out of `public` for the security advisor), generates a shared secret **in Vault only** (`brief_secret` — never in the repo or an env var), exposes it to the function through the service-role-only RPC `public.brief_secret()`, and schedules an hourly `net.http_post`; the function applies the real gate (07:00 America/Edmonton, once per day, DST-proof; the 08:00/09:00 runs retry only if that day's email didn't go out). Accepted callers: cron (`x-brief-secret`), the service role, or a signed-in user (`?force=1`, any time — the Overview **Send now** button via `lib/brief.js`). Secrets: `RESEND_API_KEY` (until set, the brief is generated + stored but not emailed and the reason shows in-app), optional `MAIL_FROM`, `DASHBOARD_URL`. Deploy with `--no-verify-jwt` (in-function auth, same as `ai`). Its mirrored helpers (`costBasis`, `uwLevel`, `daily3`) must be kept in sync with the dashboard.
- **Event automations** (reducer, `UPDATE` on inventory): engine → `sold` auto-creates an active **warranty** (`settings.warrantyMonths`, default 12; customer from the linked invoice if any; skipped if the engine already has one); engine → `in-reman` auto-opens a **reman work order** linked by `engineId` (skipped if an open one exists); any edit that pushes a WIP engine across the 75% / 90% cost-to-list thresholds logs an **underwater escalation** and toasts. Automation records carry `auto:true` and appear in the Shop Log as user `auto`.

## Conventions (follow these — they prevent regressions)

- IDs: `Date.now()`. Never sequential ints.
- Mutations go through the reducer (`ADD/UPDATE/DELETE`). Don't mutate state directly.
- Deletes are **undoable** via the toast (reducer stashes `lastDel`, `UNDO` restores). Don't add `confirm()`.
- Customer/tech/engine pickers are `<select>` dropdowns (`CS`, `TS`, `ES`), never raw ID text inputs.
- Date inputs: the `F` helper auto-renders `type="date"` for date-named keys (`DATEKEYS`). Defaults use `isoToday()`.
- Photos: `compressImg` (≤480px, JPEG q0.6) before storing; engines also accept an image URL.
- Type: UI text is Public Sans (`var(--fb)`), titles and big numbers Barlow Condensed (`var(--fd)`); numbers in tables use tabular figures. The scale was bumped once, globally (roughly +2px under 12px and +1.5px to 16px). Match the current sizes when adding UI — don't reintroduce 9–11px body text.
- Styling: add to the `CSS` string; reuse existing classes (`rc-card, rc-ba, rc-bs, rc-fi, rc-fg, rc-fl, rc-tn, rc-fb`...). **Never hard-code a colour in an inline style** — use the tokens (`color:"var(--mt)"`, `border:"1px solid var(--ln)"`), or both themes break. For a translucent fill or border of a status colour use `tint(c, pct)` (a `color-mix`), never a hex+alpha suffix like `col+"22"` — that stops working the moment `c` is a token. Only white text on the orange accent may be a literal (`#fff`). Print rules live in `@media print`.
- After edits, the build must pass: `npm run build`. Keep brackets balanced (the file is dense single-line JSX).

## Backend

- **Storage** (`lib/storage.js`): if `VITE_SUPABASE_*` set → Supabase. Else → localStorage. The component is unaware which; it just calls `db.getAll/getItem/setItem/removeItem`. `loadAll` uses `getAll`: every list in ~one round trip (one `IN(...)` query for the app_state blobs + one per table adapter, in parallel), and any failure marks the whole load untrusted (`__loadError`) instead of seeding over real data. Most lists are one JSON blob per key in `app_state`; lists that have graduated to a real table (see `TABLE_ADAPTERS`) route there instead — currently **`rc:inventory` → the `inventory` table** (per-row: a `data` jsonb the app reads verbatim + projected typed columns + a real `id` PK). localStorage mode always uses the blob path (the cloud adapter is dead-code-eliminated when no Supabase env is set).
- **AI** (`lib/ai.js` + `supabase/functions/ai`): `askClaude(prompt)` POSTs to the Edge Function, which calls Anthropic with the server-side key. Model via `ANTHROPIC_MODEL` secret (default `claude-sonnet-4-6`).

## Auth & security (implemented — P0)

Auth is wired up. When Supabase is configured the app requires an email/password login; on localStorage (no `.env`) it runs open for local dev — there is no shared backend to protect, so the gate is skipped.

- **Model: shared workspace.** `0002_auth.sql` replaces the old anon policy with one scoped to the `authenticated` role (`for all to authenticated using(true) with check(true)`). Any logged-in staff member reads/writes *all* shop data — no per-user isolation by design (it's one shop).
- **Invite-only.** Create users in Supabase Dashboard → Authentication → Users. Disable public sign-up (Authentication → Providers → Email → "Allow new users to sign up" OFF). There is deliberately **no sign-up form** — don't add one.
- **AI function requires a real user.** `functions/ai` verifies the caller's token with `auth.getUser()` and rejects the anon key (the anon key is itself a valid JWT, so gateway JWT-verification would let it through). Deploy it **with** `--no-verify-jwt` (`verify_jwt: false`): the in-function check is the real, stronger gate, and disabling the gateway check lets the browser's credential-less CORS preflight through.
- **The UI login gate is convenience only.** Real enforcement is server-side: RLS + the function's user check. A client that bypasses the React gate still can't touch data without a session.
- **Client:** `lib/auth.js` exposes `getSession/signIn/signOut/onAuthChange` and re-exports `usingCloud`. `App` renders `<Login>` when `usingCloud && !session`; the header shows the email + a Sign Out button. Load/save effects are gated on `authed`, so nothing reads or writes while logged out.

Not yet done (future hardening): per-user audit columns, role-based admin (e.g. gating the Reset button), password policy.

## Relational migration (in progress — incremental)

Goal: move each list from a single JSON blob in `app_state` into its own real table with enforced FKs (the engine↔invoice/core/warranty/shipment links are currently app-resolved by `engineId`, not DB-enforced).

**Pattern (per entity):** add a table with a `data` jsonb column (the exact object the app reads back — perfect round-trip, no reducer changes) + a few projected typed columns for SQL + a real `id` PK that child tables' FKs will reference. Add an entry to `TABLE_ADAPTERS` in `lib/storage.js` so the matching `rc:<list>` key routes to the table. Migrate the live data and retire the old blob (renamed to `rc:_bak:<list>_<nnnn>`). The dashboard/reducer don't change; the adapter syncs the whole list on each save (upsert + delete-missing).

**Done:** phase 1 — `inventory` (`0003_inventory_table.sql`). **Next, in order:** `customers`, then the linked cluster (`invoices, cores, warranties, shipments`) — once two linked entities are both tables, add the real `engine_id`/`customer_id` FK constraints. A later phase can refactor the reducer to true per-row async writes for efficiency/concurrency. Not required for the app to function.

## Safe-change checklist

1. `npm run dev` and reproduce the area you're changing.
2. Make the change; keep to existing patterns above.
3. `npm run build` must succeed.
4. Verify persistence (reload), and undo/toast still work for any list you touched.
5. If you added a `STORE_KEY`, add it to `STORE_KEYS`, `EMPTY`, and the save-effect dependency array in `App`. If the list affects an engine's cost, add it to `LABOR_LISTS` and fold it in `syncLabor`.
6. Printable modals (long block parts order, machine shop list) pass `"rc-pmod"` as the second argument to `W`; the print stylesheet re-shows that overlay only.
7. `node smoke.mjs` (after `npm run build`; needs `playwright` installed locally) walks the diagnosis/issues flow in localStorage mode and reports console/page errors.
