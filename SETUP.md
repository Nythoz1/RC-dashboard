# Setup

## Timesheet sync: Google Sheets → Team → Timesheets

Each employee keeps filling in their own Google Sheets timesheet. The dashboard reads those sheets, works out regular and overtime hours itself, and shows them under **Team → Timesheets**. It syncs once a day at about 6 AM Mountain, and any time you click **Sync now**.

The sheets are read by a Google "service account": a robot Google user that can only read the sheets you share with it. Nothing is published to the web. Everything here is free: the Google Sheets API has no charge, and Supabase's free plan includes the Edge Function and the daily timer.

It takes about 20 minutes. You need your Google account and the Supabase dashboard for the **RC-dashboard** project.

**Claude can do steps 6, 7 and 8 for you** (it has access to the Supabase project); just ask. Steps 1 to 5 and 9 to 10 need you, because they involve your Google account and a private key.

---

### Step 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com> and sign in with your Google account. Accept the terms if it's your first time.
2. At the top left, click the project picker (it may say **Select a project**).
3. Click **New project**.
4. Project name: `Rollin Coal Timesheets`. Leave the rest as is. Click **Create**.
5. When it's done, make sure **Rollin Coal Timesheets** is the project shown in the picker.

You don't need to add billing. The Sheets API is free.

### Step 2. Turn on the Google Sheets API

1. In the search bar at the top, type `Google Sheets API` and click the result.
2. Click **Enable**.

### Step 3. Create the service account

1. Open the menu **☰** → **IAM & Admin** → **Service Accounts**.
2. Click **+ Create service account**.
3. Service account name: `timesheet-reader`. Click **Create and continue**.
4. Skip "Grant this service account access to project": click **Continue**, then **Done**.
5. The list now shows an email like `timesheet-reader@rollin-coal-timesheets.iam.gserviceaccount.com`. Copy it. You'll share each timesheet with this address in step 9.

### Step 4. Make a key for it

1. Click the service account's email to open it.
2. Open the **Keys** tab.
3. Click **Add key** → **Create new key** → **JSON** → **Create**.
4. A `.json` file downloads. Treat it like a password: don't email it, and don't put it in a sheet or in the code. You'll paste it into Supabase in the next step, then delete it.

**If Google says "Service account key creation is disabled":** your Google Workspace has a security policy that blocks keys (Google turns it on for newer organizations). Either:

- Turn it off for this project: **☰** → **IAM & Admin** → **Organization Policies** → search for **Disable service account key creation** → **Manage policy** → **Override parent's policy** → set enforcement to **Off** → **Set policy**. This needs the "Organization Policy Administrator" role; a Workspace super admin can give it to themselves under **IAM**. Or:
- Do steps 1 to 4 signed in with a personal Gmail account instead. That account has no organization, so there's no policy. Sharing your work sheets with that service account still works.

### Step 5. Put the key in Supabase

1. Go to <https://supabase.com/dashboard> and open the **RC-dashboard** project.
2. In the left menu, click **Edge Functions**, then **Secrets**. (In some versions it's **Project Settings** → **Edge Functions** → **Secrets**.)
3. Add a new secret:
   - Name: `GOOGLE_SA_JSON`
   - Value: open the downloaded `.json` file in Notepad (Windows) or TextEdit (Mac), select everything, copy, and paste it here.
4. Click **Save**.
5. Delete the downloaded `.json` file, and empty the trash.

### Step 6. Update the database

This keeps wages visible to the owner login only, and sets up the 6 AM sync. Do it before the first sync.

Ask Claude to "apply the timesheet migration", or do it yourself:

1. In Supabase, click **SQL Editor** → **New query**.
2. Open `supabase/migrations/0011_timesheets.sql` from the repo, copy all of it, paste it in, and click **Run**.
3. It should finish without an error.

### Step 7. Deploy the sync

Ask Claude to "deploy the timesheet-sync function". Or, with the Supabase command-line tool:

```
supabase functions deploy timesheet-sync --no-verify-jwt --project-ref ssvcappeflsgickdzmpw
```

`--no-verify-jwt` is correct: the function checks the login itself, the same way the AI and Morning Brief functions do.

### Step 8. Make your login the owner

Only the owner login sees wages and gross pay, and only the owner approves pay periods. Other staff logins see hours, never dollar amounts.

1. In Supabase, click **SQL Editor** → **New query**, paste this, and put your own login email in it:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
   where email = 'YOUR-LOGIN-EMAIL';
   ```

2. Click **Run**. It should report 1 row changed.
3. In the dashboard, **Sign out** and sign back in. The owner role arrives with the new sign-in.

To check: **Team → Timesheets** shows **Gross pay** on your login, and not on a staff login.

Only an admin can set this (staff can't make themselves the owner). To take it away, run the same query with `'{"role":"staff"}'`.

### Step 9. Share each timesheet with the service account

Each timesheet must be a real Google Sheet, not an Excel file stored in Drive. If the file name ends in `.xlsx`, or its link has `rtpof=true` in it, open it and choose **File → Save as Google Sheets**, then use the new sheet from here on. The employee fills in that Google Sheet, so nobody sends a file back at month end.

Before anyone fills one in, check who can open it: **Share → General access** should say **Restricted**, not "Anyone with the link". The sheets hold hours and wages.

For each employee's Google Sheet:

1. Open the sheet and click **Share** (top right).
2. Paste the service account email from step 3. (The dashboard shows it too: **Team → Timesheets → ⚙ Settings**.)
3. Set it to **Viewer**. Untick **Notify people**. Click **Share**. If Google warns that it's outside your organization, click **Share anyway**.

**Never** use **File → Share → Publish to the web**. The sheets have wages in them.

### Step 10. Connect the sheets in the dashboard

1. Go to **Team → Timesheets** and click **⚙ Settings**.
2. Copy the sheet's link from your browser's address bar, paste it into **Add a timesheet**, pick the team member, and click **+ Connect**. Do this for each employee.
3. Close Settings and click **⟳ Sync now**.

If a sheet can't be read, the reason shows in red at the top of the page and under that sheet in Settings.

---

### After setup

- **Every day** at about 6:05 AM Mountain the sync runs by itself. **Sync now** works any time.
- **Pay periods:** monthly by default (matching the month tabs). Change it in **⚙ Settings** to twice a month or every two weeks.
- **Approving:** on your login, **✓ Approve** locks that period's days. If someone changes an approved day on the sheet later, the dashboard doesn't take the change. It shows **Changed after approval** with the old and new values, and you pick **Keep approved** or **Use the new numbers**.
- **Before a sheet is shared**, upload it instead: **Upload CSV / Excel**. In the Google Sheet use **File → Download → Microsoft Excel (.xlsx)** for every month at once, or **Comma-separated values (.csv)** for the tab you're on.
- **How hours are worked out:** from Start and Finish, less the Unpaid Break column when an older sheet has one. Breaks and lunch are otherwise paid. Overtime follows Alberta's rule: hours over 8 in a day or over 44 in a week (Monday to Sunday), whichever gives more for that week. Overtime pay is the wage × the sheet's OT rate (1.5× when it's blank). The sheet's own Total, Regular and OT cells are only compared, and a badge marks any day where they disagree.

### If something goes wrong

| What you see | What to do |
|---|---|
| "This sheet isn't shared with the service account" | Step 9 for that sheet. |
| "This link is an Excel file (.xlsx)" | Open it, choose **File → Save as Google Sheets**, and connect the new sheet's link instead (step 9). |
| Every worked day is 30 minutes short | The older template's **Unpaid Break (min)** column is pre-filled with 30 for lunch, and a value there is taken off. If lunch is paid, set that column to 0 in the template. |
| "The Google Sheets API is turned off" | Step 2, in the same Google Cloud project as the service account. Wait a minute and sync again. |
| "Google access isn't set up yet: the GOOGLE_SA_JSON secret is missing" | Step 5. |
| "Google turned the key down" | The key was deleted or pasted wrong. Do step 4 again and replace the secret in step 5. |
| "The timesheet-sync function isn't deployed yet" | Step 7. |
| You don't see **Gross pay** | Step 8, then sign out and back in. |
| "No wage for October 2026" | Neither the sheet's **Hourly Wage** cell nor the team member's pay rate (Team tab) has a wage for that month. Fill in either one. |
| A sheet's days don't show | Open **⚙ Settings**: the notes under that sheet say which tab couldn't be read and why (for example, no row with a **Date** header). |
