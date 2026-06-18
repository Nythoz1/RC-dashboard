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

2. **Create the database tables & security policy.** In the Supabase SQL editor, run the migrations **in order**: first `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_auth.sql` (the second locks the data to logged-in users).

3. **Deploy the AI function** (keeps the Anthropic key server-side):
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy ai      # do NOT use --no-verify-jwt — the function requires a signed-in user
   ```

4. **Set up staff logins (invite-only).** The app requires an email/password login once Supabase is configured.
   - In **Authentication → Providers → Email**, turn **off** "Allow new users to sign up" (there is no sign-up form by design).
   - In **Authentication → Users → Add user**, create an account for each staff member.

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

## What runs where

| Concern        | File                                  |
|----------------|---------------------------------------|
| UI + all logic | `src/RollinCoalDashboard.jsx`         |
| Data storage   | `src/lib/storage.js` (Supabase ⇄ localStorage) |
| AI calls       | `src/lib/ai.js` → `supabase/functions/ai` |
| DB schema      | `supabase/migrations/0001_init.sql`, `0002_auth.sql` |
| Auth           | `src/lib/auth.js` (email/password login gate) |

## Notes

- **Security:** with Supabase configured, the app requires an email/password login and the database is locked to authenticated users (`0002_auth.sql`); the AI function rejects anyone who isn't signed in. Accounts are invite-only — create them in the Supabase dashboard and keep public sign-up disabled. On localStorage (no `.env`) the app runs open for local dev. See `CLAUDE.md` → Auth & security.
- **Data model:** the app stores each entity list as one JSON row. The roadmap for a fully relational schema (real foreign keys for the engine ↔ invoice/core/warranty/shipment links) is documented in `CLAUDE.md`.

See `CLAUDE.md` for architecture, conventions, and how to extend safely.
