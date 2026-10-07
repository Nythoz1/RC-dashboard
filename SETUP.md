# Setup

## Timesheets: employees fill in their own hours

Each employee gets a login. When they sign in they see their timesheet and nothing else: the whole month, today at the top with a **Full day** button (8:00 AM to 4:00 PM, Monday to Friday), and any earlier day they can fix. Days that haven't happened yet can't be filled in. The database enforces these rules, not just the screen, so they hold even if someone goes around the app.

Steps 1 to 3 are done once. Step 4 is done for each employee. On the shop's Supabase project, steps 1 and 2 were done on October 6, 2026.

### Step 1. Update the database

Ask Claude to "apply migrations 0010 to 0013". Or do it yourself:

1. In Supabase, click **SQL Editor** → **New query**.
2. Open `supabase/migrations/0010_ecm_files_bucket.sql` from the repo, copy all of it, paste it in, and click **Run**.
3. Do the same with `supabase/migrations/0011_timesheets.sql`, then `0012_ts_locked_invoker.sql`, then `0013_known_roles_only.sql`.

Run each one once, in that order. Each should finish without an error. Never run an older migration again later: 0001, 0004 and 0010 would loosen access if they ran after the newer ones.

### Step 2. Deploy the functions

Ask Claude to "deploy team-logins and redeploy ai and brief". Or, with the Supabase command-line tool:

```
supabase functions deploy team-logins --no-verify-jwt --project-ref ssvcappeflsgickdzmpw
supabase functions deploy ai --no-verify-jwt --project-ref ssvcappeflsgickdzmpw
supabase functions deploy brief --no-verify-jwt --project-ref ssvcappeflsgickdzmpw
```

- `team-logins` creates the employees' logins from the Team tab.
- `ai` and `brief` are redeployed so they turn employee logins away.
- `--no-verify-jwt` is correct for all three. Each function checks the login itself.

### Step 3. Make your login the owner

The owner login gives out logins, sees wages and gross pay, and approves pay periods. There can be more than one owner.

If the login doesn't exist yet, make it first: in Supabase, click **Authentication** → **Users** → **Add user** → **Create new user**, type the email and a password, tick **Auto Confirm User**, and click **Create user**.

1. In Supabase, click **SQL Editor** → **New query**, paste this, and put your own login email in it:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
   where email = 'YOUR-LOGIN-EMAIL';
   ```

2. Click **Run**. It should report 1 row changed.
3. In the dashboard, **Sign out** and sign back in. The owner role arrives with the new sign-in.

To check: the **Team** tab shows a **Login** column on your login.

Nobody can make themselves the owner. Only you, in Supabase, can set it.

### Step 4. Give each employee a login

1. Go to **Team**. If the employee isn't there yet, add them with **+ Employee**, including their pay rate.
2. In their row, click **Give a login**.
3. Type their email. A temporary password is already filled in.
4. Leave **Employee: their own timesheet only** picked, and click **Create login**.
5. Click **Copy** and send them the website, email and password.

If they already have a login, for example one made in Supabase earlier, their email shows under **Already has a login?**. Tap it, pick their access, and click **Link this login**. Their password stays the same.

They can change the password after signing in, with **Password** at the top right.

Office staff can get a login the same way: pick **Office staff** in step 4. They get the whole dashboard without wages, and they can look at timesheets but not change them.

A login made straight in Supabase has no access at all until you give it some here: open **Give a login** on that person's row and tap the email under **Already has a login?**.

---

### How employees use it

- **Today:** tap **✓ Full day** for 8:00 AM to 4:00 PM. Lunch is paid, so that's 8 hours.
- **Different hours:** tap **Other times** and enter Start and Finish. Overtime works itself out.
- **A mistake on an earlier day:** tap **Edit** on that day and fix it. They can go back to the first of last month; older days are yours to fix.
- **Sick, vacation or a stat holiday:** tap **Other times**, pick it under Notes, and leave the times empty.
- **Weekends** have no Full day button. If they worked, they tap **Times** and enter the hours.
- **On a phone**, the browser's **Add to Home Screen** makes it open like an app.

### What the owner sees

- **Team → Timesheets:** who has filled in today, then one person's pay period day by day, with weekly subtotals, overtime and gross pay.
- **Changed after the day:** a day filled in late or changed later gets an **edited** badge. Click it to see every version, with who saved it and when.
- **Approving:** once a pay period has ended, click **✓ Approve**. Its days lock for the employee. You can still fix a day yourself, and **Reopen** unlocks the period.
- **See what they see:** **👁 See Mike's screen** shows exactly what that employee's login shows.
- **Pay periods** are monthly by default. **⚙ Settings** has twice a month and every two weeks, and the overtime rate (1.5× unless you change it).
- **Overtime** follows Alberta's rule: hours over 8 in a day or over 44 in a week (Monday to Sunday), whichever gives more that week.
- **Gross pay** is regular hours × the Team pay rate, plus overtime hours × the rate × the overtime rate. It's before CPP, EI and tax. Stat holiday pay isn't worked out: a day marked Stat holiday counts 0 hours unless times are entered.

### If something goes wrong

| What you see | What to do |
|---|---|
| No **Login** column on the Team tab | Step 3, then sign out and back in. |
| "The team-logins function isn't deployed yet" | Step 2. |
| "That email already has a login." | Use another email, or delete the old login in Supabase under **Authentication → Users**. |
| Someone sees "This login doesn't have access yet" | The login has no role. Open **Give a login** on their row in the Team tab and tap their email under **Already has a login?**. |
| An employee sees "This login isn't linked to a team member yet" | The login was made in Supabase directly. Delete it there and use **Give a login** on the Team tab instead. |
| An employee can't fill in a day | Days that haven't happened yet are closed, and so are days before the first of last month and days in an approved pay period. Reopen the period, or fix the day yourself. |
| "Couldn't save Sep 2: that pay period is approved" | The period was approved while their screen was open. The day went back to what was saved. Reopen the period if it needs fixing, or fix it yourself. |
| "Not saved yet · retrying" at the top of the screen | That device lost its connection. It keeps trying and saves as soon as it's back; don't close the page until the message goes away. |
| An employee forgot their password | Click **Timesheet login** in their row, then **New password**, and send it to them. |
| Someone leaves | Click **Timesheet login** in their row, then **Remove login** twice. Their timesheet days stay. |
