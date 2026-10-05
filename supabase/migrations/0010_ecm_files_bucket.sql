-- ─────────────────────────────────────────────────────────────
-- ECM job files → a private Storage bucket.
--
-- The ECM module keeps its job records as an app_state blob (rc:ecmJobs, with
-- file metadata in rc:ecmFiles) like diagnoses, so no new table. The files
-- themselves (INSITE / DiagnosticLink / DAVIE / Cat ET / Premium Tech Tool
-- exports, dyno sheets, photos) go to `ecm-files`, one object per file at
-- `<jobId>/<filename>`.
--
-- Private: nothing is publicly readable. Signed-in staff can list, read,
-- upload, replace and delete (the same shared-workspace model as app_state);
-- the app opens files through short-lived signed URLs. 10 MB per file keeps
-- the shop well inside the free plan's 1 GB.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ecm-files', 'ecm-files', false, 10485760,
        array['text/csv','text/plain','application/xml','application/pdf','application/zip',
              'image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ecm_files_read" on storage.objects;
create policy "ecm_files_read" on storage.objects
  for select to authenticated using (bucket_id = 'ecm-files');

drop policy if exists "ecm_files_insert" on storage.objects;
create policy "ecm_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'ecm-files');

drop policy if exists "ecm_files_update" on storage.objects;
create policy "ecm_files_update" on storage.objects
  for update to authenticated using (bucket_id = 'ecm-files') with check (bucket_id = 'ecm-files');

drop policy if exists "ecm_files_delete" on storage.objects;
create policy "ecm_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'ecm-files');
