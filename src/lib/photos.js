// ─────────────────────────────────────────────────────────────
// Photo upload for Rollin Coal dashboard
//
// Engine/part photos used to be stored as a base64 string inlined into the
// inventory row's `data` jsonb. Because the whole inventory list is re-sent on
// every save, that pushed each write past Supabase's request-size limit — so
// photo saves failed (silently) and never persisted login-to-login.
//
// Now: compress the image to a small JPEG and upload it to the `engine-photos`
// Storage bucket; the record holds only the resulting public URL. Rows stay
// tiny and the save always fits.
//
// localStorage mode (no Supabase) has no bucket, so we fall back to an inline
// base64 data URL there — same as before, and fine for single-machine dev.
// ─────────────────────────────────────────────────────────────
import { supabase, usingCloud } from "./storage";

const BUCKET = "engine-photos";

// Draw the image onto a canvas scaled to <= maxPx on its long edge, return a
// compressed JPEG Blob.
function compressToBlob(file, maxPx = 480, quality = 0.6) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxPx) { h = Math.round((h * maxPx) / w); w = maxPx; }
        else if (h >= w && h > maxPx) { w = Math.round((w * maxPx) / h); h = maxPx; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))),
          "image/jpeg",
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not encode image"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Compress `file` and return a URL string to store on the record.
//  - Cloud:  upload to the engine-photos Storage bucket, return its public URL.
//  - Local:  return an inline base64 data URL (no bucket available).
export async function uploadPhoto(file) {
  const blob = await compressToBlob(file);
  if (!usingCloud || !supabase) return blobToDataUrl(blob);
  const path = `engines/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Best-effort removal of a photo we uploaded to the bucket, so replacing or
// clearing a photo doesn't leave the old file orphaned in Storage. Only acts
// on URLs that point into our bucket — static assets (/engine-photos/*.jpg in
// the repo) and data: URLs are left alone. Fire-and-forget: never throws.
export async function deletePhoto(url) {
  try {
    if (!usingCloud || !supabase || !url) return;
    const marker = "/storage/v1/object/public/" + BUCKET + "/";
    const i = url.indexOf(marker);
    if (i === -1) return;
    const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.warn("photo cleanup skipped:", e && e.message ? e.message : e);
  }
}
