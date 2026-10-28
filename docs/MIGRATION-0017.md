# Going live with shops (migration 0017)

0017 turns the one-shop database into a many-shop one. Rollin Coal becomes the first shop. Every login with a role joins it. Its data moves from `app_state` to `tenant_state`, and every table, function and file path checks the shop.

This happens once, on the live project (`ssvcappeflsgickdzmpw`), in a window the owner picks. **Nothing here runs without the owner's go-ahead.**

## What's already safe to have live before the window

The dashboard build on this branch works both before and after 0017.
- `src/lib/storage.js` asks for the login's shop first.
- With no `tenants` table, it uses `app_state` and plain file paths, exactly as today (`tests/storage.test.mjs`).
- So the client can deploy any time. The window is only the database and the three functions.

## Before the window (the day before)

1. **Backup.** The free plan has no point-in-time restore, so take the copies yourself:
   - In the dashboard, sidebar → **Backup** (the JSON of every list).
   - In the SQL Editor, keep table copies. These add tables and change nothing:
     ```sql
     create table backup_0017_app_state as select * from public.app_state;
     create table backup_0017_inventory as select * from public.inventory;
     create table backup_0017_ts_entries as select * from public.timesheet_entries;
     create table backup_0017_ts_approvals as select * from public.timesheet_approvals;
     ```
   - Note the counts. You'll compare against them afterwards:
     ```sql
     select (select count(*) from app_state) app_state, (select count(*) from inventory) inventory,
            (select count(*) from timesheet_entries) days, (select count(*) from timesheet_approvals) approvals,
            (select count(*) from auth.users where raw_app_meta_data->>'role' in ('owner','staff','employee')) logins,
            (select count(*) from storage.objects) files;
     ```
2. **Rehearse.** `npm test` runs 0017 and the undo against a real Postgres:
   - `tests/shops.test.mjs`: two shops can't see or change each other.
   - `tests/undo.test.mjs`: the undo keeps what was saved.
   - For a closer rehearsal, a Supabase branch of the project can run the same SQL first. That's a paid feature; ask before creating one.
3. **Check the file has no `DROP`**, so it goes straight through the Supabase MCP: `grep -ci drop supabase/migrations/0017_shops.sql` prints `0`.

## The window (about 15 minutes, after 4:30 PM so the timesheet autofill has run)

1. Tell the crew to save and close the dashboard.
2. **Apply** `supabase/migrations/0017_shops.sql`, then `0018_quote_links.sql` (customer quote links; it needs 0017), either with `apply_migration` or pasted into the SQL Editor. Each runs as one statement batch.
3. **Deploy the three functions** from this commit, all with `--no-verify-jwt`:
   - `brief`: runs each shop on its own data, and stores into `tenant_state`.
   - `team-logins`: the owner manages only their own shop, and new logins join it.
   - `ai`: requires a shop.
4. **Reload** the dashboard (a browser left open still on `app_state` shows "Not saved yet" until it reloads).

## Check right after

```sql
select (select count(*) from tenant_state where tenant_id = 'c0a10000-0000-4000-8000-000000000001') lists,
       (select count(*) from memberships) memberships,
       (select count(*) from inventory where tenant_id is null) engines_without_shop,
       (select count(*) from timesheet_entries where tenant_id is null) days_without_shop;
```

What each number should be:
- `lists` equals the old `app_state` count.
- `memberships` equals `logins`.
- Both "without shop" counts are 0.

Then in the app:
- **Owner:** Engines list, open a passport, upload an ECM file (it lands under `c0a10000-…/`), and open an old one.
- **Overview:** Morning Brief → Send now.
- **Team:** the Team tab lists the logins.
- **Mike's login:** today's Full day, and the engine pick list.
- **Staff login:** no dollars.

Last, run the Supabase security advisor.

## If something's wrong: undo

`supabase/rollback/0017_undo.sql` is DROP-free and keeps everything saved since 0017. Quote links (0018) stop working after it, since they read the shops; the quotes and their answers stay. It does four things:
- copies Rollin Coal's lists back into `app_state`;
- reopens `app_state` to owner and staff;
- puts `merge_list` and `ts_autofill` back;
- renames `tenants` so the dashboard falls back by itself.

After running it:
- Redeploy `brief`, `team-logins` and `ai` from the commit before 0017 (8ba5421).
- Everyone reloads.

The backup tables from the day before are the last resort.

## Afterwards

- Keep the `backup_0017_*` tables for 30 days, then remove them in the SQL Editor.
- `app_state` stays, closed to every login, until the shops have run cleanly for a month.

## Known limits (next steps, not blockers)

- **Ids are unique across all shops, not within each one.** This applies to engine ids, timesheet day ids and approval ids. Ids are `Date.now()`, so a clash is very unlikely, and a clash is refused rather than leaked. Per-shop keys come with the relational phase.
- **`shop_today()` still uses Medicine Hat time** for every shop's "no days ahead" rule. The autofill already uses each shop's own time zone.
- **A role still comes from the login's `app_metadata`.** The shop comes from `memberships`, and `team-logins` keeps the two in step.
- **New shops are made by hand for now** (a `tenants` row plus the owner's membership). A platform-admin "create shop" function is on the Phase 1 list.
