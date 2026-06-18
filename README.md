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

2. **Create the database table.** In the Supabase SQL editor, run the contents of `supabase/migrations/0001_init.sql`.

3. **Deploy the AI function** (keeps the Anthropic key server-side):
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy ai --no-verify-jwt
   ```

4. **Configure the app.** Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   VITE_AI_FUNCTION_URL=https://<ref>.functions.supabase.co/ai
   ```

5. **Run:**
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
| DB schema      | `supabase/migrations/0001_init.sql`   |

## Notes

- **Security:** the default DB policy allows anon access — fine for a private internal tool, but add Supabase Auth before exposing it publicly. See `CLAUDE.md`.
- **Data model:** the app stores each entity list as one JSON row. The roadmap for a fully relational schema (real foreign keys for the engine ↔ invoice/core/warranty/shipment links) is documented in `CLAUDE.md`.

See `CLAUDE.md` for architecture, conventions, and how to extend safely.
