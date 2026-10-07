// ─────────────────────────────────────────────────────────────
// ECM job files: data logs and reports (INSITE, DiagnosticLink, DAVIE, Cat ET,
// Premium Tech Tool exports, dyno sheets, photos).
//
// Cloud: the private `ecm-files` Storage bucket (migration 0010), one object per
// file at `<jobId>/<filename>`. Only signed-in staff can read or write it, and
// files open through short-lived signed URLs.
//
// localStorage mode (no Supabase) has no bucket, so files go to IndexedDB in
// this browser instead: logs run to megabytes, far past what localStorage holds.
//
// The job records only metadata (`ecmFiles` list: path, name, size, type); the
// bytes never go into app_state.
// ─────────────────────────────────────────────────────────────
import { supabase, usingCloud } from "./storage";

export const ECM_BUCKET = "ecm-files";
export const ECM_MAX_BYTES = 10 * 1024 * 1024;          // per file — our own cap
export const ECM_FREE_BYTES = 1024 * 1024 * 1024;       // Supabase free plan storage (1 GB)

// Accepted extensions → the content type we store. The bucket allows exactly
// these types, so a browser that reports a CSV as application/vnd.ms-excel or a
// ZIP as application/x-zip-compressed still uploads cleanly.
const TYPES = {
  csv: "text/csv", txt: "text/plain", xml: "application/xml", pdf: "application/pdf", zip: "application/zip",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};
export const ECM_ACCEPT = Object.keys(TYPES).map((e) => "." + e).join(",");
export const ecmFileType = (name) => TYPES[(String(name || "").split(".").pop() || "").toLowerCase()] || null;
export const ecmIsText = (type) => type === "text/csv" || type === "text/plain" || type === "application/xml";

// ── IndexedDB (local mode only) ──
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("rc-ecm-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("IndexedDB unavailable"));
  });
}
async function idbRun(mode, fn) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const rq = fn(tx.objectStore("files"));
    tx.oncomplete = () => resolve(rq ? rq.result : undefined);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB error"));
  });
}

// Upload one file to `path` (`<jobId>/<stamp>-<filename>`: the stamp makes every
// upload its own object, so two people uploading "image.jpg" to the same job at
// once can't overwrite each other). Throws a plain-English Error when the type
// or size is wrong or the upload fails.
export async function uploadEcmFile(path, file) {
  const type = ecmFileType(file && file.name);
  if (!type) throw new Error("That file type isn't accepted. Use CSV, TXT, XML, PDF, ZIP or an image.");
  if (file.size > ECM_MAX_BYTES) throw new Error("Files are limited to 10 MB each.");
  if (usingCloud && supabase) {
    // Never overwrite: every upload has its own path.
    const { error } = await supabase.storage.from(ECM_BUCKET).upload(path, file, { contentType: type, upsert: false });
    if (error) {
      const m = String(error.message || error);
      if (/bucket not found/i.test(m)) throw new Error("File storage isn't set up yet: run migration 0010_ecm_files_bucket.sql.");
      throw new Error(m);
    }
    return { path, type, size: file.size };
  }
  await idbRun("readwrite", (st) => st.put(file, path));
  return { path, type, size: file.size };
}

async function getBlob(path) {
  if (usingCloud && supabase) {
    const { data, error } = await supabase.storage.from(ECM_BUCKET).download(path);
    if (error) throw new Error(error.message || "Download failed");
    return data;
  }
  return idbRun("readonly", (st) => st.get(path));
}

// Open a file in a new tab. The tab is opened synchronously (inside the click)
// so popup blockers allow it, then pointed at the file once its URL is ready.
export async function openEcmFile(path) {
  const w = window.open("", "_blank");
  try {
    let url;
    if (usingCloud && supabase) {
      const { data, error } = await supabase.storage.from(ECM_BUCKET).createSignedUrl(path, 300);
      if (error) throw new Error(error.message || "Couldn't open the file");
      url = data.signedUrl;
    } else {
      const b = await getBlob(path);
      if (!b) throw new Error("File not found in this browser");
      url = URL.createObjectURL(b);
    }
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    if (w) w.close();
    throw e;
  }
}

// First `max` characters of a text log (CSV / TXT / XML), for the AI review.
export async function readEcmText(path, max = 4000) {
  const b = await getBlob(path);
  if (!b) return "";
  const t = await b.text();
  return t.length > max ? t.slice(0, max) + "\n…(truncated)" : t;
}

// Best-effort removal. Never throws: a file left behind only costs storage.
export async function removeEcmFiles(paths) {
  try {
    const ps = (paths || []).filter(Boolean);
    if (!ps.length) return;
    if (usingCloud && supabase) {
      await supabase.storage.from(ECM_BUCKET).remove(ps);
      return;
    }
    await idbRun("readwrite", (st) => {
      ps.forEach((p) => st.delete(p));
      return null;
    });
  } catch (e) {
    console.warn("ECM file cleanup skipped:", e && e.message ? e.message : e);
  }
}
