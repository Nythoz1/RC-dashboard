# Rollin Coal — Shop Management Dashboard

Diesel engine shop management for **Rollin Coal — Canada's Diesel Engine Specialists** (Medicine Hat, AB). Engine sales Canada-wide + HD service. Single-page React app backed by Supabase.

## Quick start (local, no backend)

```bash
npm install
npm run dev
```

With no `.env`, the app runs on **localStorage** — fully functional on one browser, no cloud. Good for trying it out.

## Full setup (Supabase backend + AI)

1. **Create a Supabase project** at supabase.com.

2. **Create the database tables & security policy.** In the Supabase SQL editor, run every file in `supabase/migrations/` **in number order**, starting with `0001_init.sql` (`0002_auth.sql` locks the data to logged-in users; `0011_timesheets.sql` adds the timesheet tables and the owner / employee / staff rules).

3. **Deploy the AI function** (keeps the Anthropic key server-side):
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy ai --no-verify-jwt   # the function verifies the user itself (auth.getUser)
   ```
   It deploys with `--no-verify-jwt` on purpose: the function does its own auth
   check (which also rejects the anon key, unlike gateway JWT verification) and
   this lets the browser's CORS preflight through.

4. **Set up staff logins (invite-only).** The app requires an email/password login once Supabase is configured.
   - In **Authentication → Providers → Email**, turn **off** "Allow new users to sign up" (there is no sign-up form by design).
   - In **Authentication → Users → Add user**, create an account for each staff member.
   - Make your own login the owner, then give employees their logins from the **Team** tab. Click-by-click in `SETUP.md`.

5. **Configure the app.** Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   VITE_AI_FUNCTION_URL=https://<ref>.functions.supabase.co/ai
   ```

6. **Run:**
   ```bash
   npm run dev      # development
   npm run build    # production bundle in dist/
   npm run preview  # preview the production build
   ```

## Deploy to Vercel

The app is a static Vite SPA — any static host works; these steps are for Vercel
(`vercel.json` pins the framework + SPA fallback).

1. **Import the repo.** Vercel → *Add New… → Project* → import this GitHub repo.
   Vite is auto-detected (build `npm run build`, output `dist`).
2. **Set environment variables** under *Project → Settings → Environment
   Variables* (Production), the same three from step 5 above:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   VITE_AI_FUNCTION_URL=https://<ref>.functions.supabase.co/ai
   ```
3. **Deploy.** You get a `*.vercel.app` URL (add a custom domain under
   *Settings → Domains*). It redeploys on every push to the production branch.

> Set the env vars **before** the first build, or redeploy after adding them —
> Vite inlines `VITE_*` values at build time, not at runtime. Without them the
> app falls back to localStorage (no login, no cloud data).

## What runs where

| Concern        | File                                  |
|----------------|---------------------------------------|
| UI + all logic | `src/RollinCoalDashboard.jsx`         |
| Data storage   | `src/lib/storage.js` (Supabase ⇄ localStorage) |
| AI calls       | `src/lib/ai.js` → `supabase/functions/ai` |
| DB schema      | `supabase/migrations/` (run in number order) |
| Auth           | `src/lib/auth.js` (email/password login gate) |
| Timesheets     | entered in the app: hours and Alberta overtime in `src/lib/timesheet.js`; the tables and rules (employees fill in today and earlier days only, approval locks, history of every change) in `supabase/migrations/0011_timesheets.sql` |
| Logins         | `supabase/functions/team-logins` (the owner gives employees their logins from the Team tab) via `src/lib/logins.js` |
| Tests          | `npm test` (hours and overtime, the database rules in a real Postgres, the team-logins function) · `node smoke.mjs` (browser walk-through) |

## Notes

- **Security:** with Supabase configured, the app requires an email/password login and the database is locked to authenticated users (`0002_auth.sql`); the AI function rejects anyone who isn't signed in. Accounts are invite-only — create them in the Supabase dashboard and keep public sign-up disabled. On localStorage (no `.env`) the app runs open for local dev. See `CLAUDE.md` → Auth & security.
- **Timesheets:** employees sign in and see only their own timesheet. Setup (the migration, the functions, the owner login, the employees' logins) is click-by-click in `SETUP.md`.
- **Data model:** the app stores each entity list as one JSON row. The roadmap for a fully relational schema (real foreign keys for the engine ↔ invoice/core/warranty/shipment links) is documented in `CLAUDE.md`.

See `CLAUDE.md` for architecture, conventions, and how to extend safely.
