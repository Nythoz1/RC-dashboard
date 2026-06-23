-- ─────────────────────────────────────────────────────────────
-- Photos → Storage. Engine/part photos used to be inlined into the inventory
-- row as base64, which bloated every save past the request-size limit (photos
-- silently failed to persist). They now live in a dedicated Storage bucket and
-- the record holds only a public URL.
--
-- Creates a public `engine-photos` bucket (public read so plain <img src> works)
-- plus RLS policies on storage.objects: any logged-in staff member can upload /
-- replace / delete photos in that bucket — same shared-workspace model as
-- app_state and the inventory table.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('engine-photos', 'engine-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read (bucket is public; this also allows the API to list objects).
drop policy if exists "engine_photos_read" on storage.objects;
create policy "engine_photos_read" on storage.objects
  for select using (bucket_id = 'engine-photos');

-- Authenticated staff can upload / update / delete within the bucket.
drop policy if exists "engine_photos_insert" on storage.objects;
create policy "engine_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'engine-photos');

drop policy if exists "engine_photos_update" on storage.objects;
create policy "engine_photos_update" on storage.objects
  for update to authenticated using (bucket_id = 'engine-photos') with check (bucket_id = 'engine-photos');

drop policy if exists "engine_photos_delete" on storage.objects;
create policy "engine_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'engine-photos');
