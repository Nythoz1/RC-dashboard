-- ─────────────────────────────────────────────────────────────
-- Security advisor fix (public_bucket_allows_listing): the engine-photos
-- bucket is public, so object URLs are served without any SELECT policy on
-- storage.objects — the broad public read policy added in 0004 only enabled
-- anonymous LISTING of the bucket's contents. Scope SELECT to authenticated
-- staff. The app's upload/replace/delete flows still work (they run as the
-- signed-in user) and public <img src> URLs are unaffected.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "engine_photos_read" on storage.objects;
create policy "engine_photos_read" on storage.objects
  for select to authenticated using (bucket_id = 'engine-photos');
