// ─────────────────────────────────────────────────────────────
// Timesheet files: read a CSV or .xlsx export of a timesheet tab into plain
// grids (rows of cell values) for the shared parser in
// supabase/functions/_shared/timesheet.js. Used by the Team → Timesheets upload,
// the fallback for a sheet that isn't shared with the service account yet.
//
// No libraries: an .xlsx is a zip of XML files, so this unzips it with the
// browser's DecompressionStream and reads the few SpreadsheetML parts it needs.
// Excel stores dates and times as numbers; cells formatted as a date, time or
// elapsed time are turned into text the way Google shows them ("2026-10-01",
// "8:00 AM", "8:00"), so the parser reads every source the same way.
// ─────────────────────────────────────────────────────────────
import { fmtTime, serialISO } from "../../supabase/functions/_shared/timesheet.js";

const pad2 = (n) => String(n).padStart(2, "0");

// ── CSV (RFC 4180; commas, or semicolons / tabs when the file uses those) ──
export function readCsv(text) {
  const t = String(text == null ? "" : text).replace(/^﻿/, "");
  const first = t.slice(0, t.search(/\r?\n/) < 0 ? t.length : t.search(/\r?\n/));
  const cnt = (ch) => first.split(ch).length - 1;
  const sep = cnt("\t") > cnt(",") && cnt("\t") >= cnt(";") ? "\t" : cnt(";") > cnt(",") ? ";" : ",";
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") { q = true; continue; }
    if (ch === sep) { row.push(cell); cell = ""; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ── zip ──
async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function unzip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let e = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("This isn't an .xlsx file.");
  const count = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const dec = new TextDecoder(), files = {};
  for (let k = 0; k < count && p + 46 <= u8.length; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const n = dv.getUint16(p + 28, true), x = dv.getUint16(p + 30, true), c = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + n));
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    files[name] = { method, data: u8.subarray(start, start + size) };
    p += 46 + n + x + c;
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name];
      if (!f) return null;
      if (f.method === 0) return dec.decode(f.data);
      if (f.method === 8) return dec.decode(await inflateRaw(f.data));
      throw new Error("This .xlsx uses a compression we can't read. Save it again from Excel or Google Sheets.");
    },
  };
}

// ── SpreadsheetML ──
const ent = (s) => String(s).replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k[0] === "#") return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[k];
});
const attr = (tag, name) => { const m = String(tag).match(new RegExp("\\s" + name + "=\"([^\"]*)\"")); return m ? ent(m[1]) : null; };
const texts = (xml) => { const out = []; String(xml).replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, "").replace(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g, (m, t) => { out.push(ent(t)); return m; }); return out.join(""); };
const colIdx = (L) => [...L.toUpperCase()].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
// What a number format shows: a date, a time of day, elapsed time, or a plain number.
function fmtKind(id, code) {
  if (id >= 14 && id <= 17) return "date";
  if ((id >= 18 && id <= 21) || id === 45 || id === 47) return "time";
  if (id === 22) return "datetime";
  if (id === 46) return "duration";
  if (!code) return "";
  const c = code.replace(/"[^"]*"/g, "").replace(/\\./g, "").replace(/\[(?![hms]+\])[^\]]*\]/gi, "").toLowerCase();
  if (/\[(h+|m+|s+)\]/.test(c)) return "duration";
  const date = /[dy]/.test(c), time = /[hs]/.test(c) || /am\/pm|a\/p/.test(c);
  return date && time ? "datetime" : date ? "date" : time ? "time" : "";
}
function shown(v, kind, d1904) {
  const n = d1904 ? v + 1462 : v;
  const tod = Math.round((v - Math.floor(v)) * 1440) % 1440;
  if (kind === "duration") { const m = Math.round(v * 1440); return Math.floor(m / 60) + ":" + pad2(m % 60); }
  if (kind === "time") return fmtTime(tod);
  if (kind === "date") return serialISO(n);
  if (kind === "datetime") return serialISO(n) + (tod ? " " + pad2(Math.floor(tod / 60)) + ":" + pad2(tod % 60) : "");
  return v;
}
// An .xlsx file → [{name, hidden, grid}] for every worksheet, in workbook order.
export async function readXlsx(buf) {
  const z = await unzip(buf);
  const wb = await z.text("xl/workbook.xml");
  if (!wb) throw new Error("This .xlsx has no workbook inside.");
  const rels = (await z.text("xl/_rels/workbook.xml.rels")) || "";
  const target = {};
  rels.replace(/<(?:\w+:)?Relationship\b([^>]*)\/?>/g, (m, a) => { const t = attr(a, "Target") || ""; target[attr(a, "Id")] = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, ""); return m; });
  const shared = [];
  const ss = await z.text("xl/sharedStrings.xml");
  if (ss) ss.replace(/<(?:\w+:)?si(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?si>)/g, (m, inner) => { shared.push(inner ? texts(inner) : ""); return m; });
  const kinds = [];
  const st = await z.text("xl/styles.xml");
  if (st) {
    const custom = {};
    st.replace(/<(?:\w+:)?numFmt\b([^>]*)\/?>/g, (m, a) => { custom[attr(a, "numFmtId")] = attr(a, "formatCode") || ""; return m; });
    const xfs = (st.match(/<(?:\w+:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:\w+:)?cellXfs>/) || [])[1] || "";
    xfs.replace(/<(?:\w+:)?xf\b([^>]*)\/?>/g, (m, a) => { const id = +(attr(a, "numFmtId") || 0); kinds.push(fmtKind(id, custom[id])); return m; });
  }
  const d1904 = /date1904="(1|true)"/i.test(wb);
  const out = [];
  const sheets = [];
  wb.replace(/<(?:\w+:)?sheet\b([^>]*?)\/?>/g, (m, a) => { sheets.push({ name: attr(a, "name") || "Sheet", rid: attr(a, "r:id"), hidden: /hidden/i.test(attr(a, "state") || "") }); return m; });
  for (const sh of sheets) {
    const xml = await z.text(target[sh.rid] || "");
    if (!xml) continue;
    const grid = [];
    let rAuto = 0;
    xml.replace(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g, (m, ra, body) => {
      const ri = attr(ra, "r") ? +attr(ra, "r") - 1 : rAuto;
      rAuto = ri + 1;
      let cAuto = 0;
      (body || "").replace(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, (m2, ca, inner) => {
        const ref = attr(ca, "r");
        const ci = ref ? colIdx(ref.replace(/\d+/g, "")) : cAuto;
        cAuto = ci + 1;
        const t = attr(ca, "t") || "n", vm = (inner || "").match(/<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/);
        const raw = vm ? ent(vm[1]) : "";
        let v = "";
        if (t === "s") v = shared[+raw] ?? "";
        else if (t === "inlineStr") v = texts(inner || "");
        else if (t === "str" || t === "e" || t === "d") v = raw;
        else if (t === "b") v = raw === "1" ? "TRUE" : "FALSE";
        else if (raw !== "") { const n = +raw; v = isFinite(n) ? shown(n, kinds[+(attr(ca, "s") || 0)] || "", d1904) : raw; }
        if (v === "") return m2;
        while (grid.length <= ri) grid.push([]);
        const row = grid[ri];
        while (row.length < ci) row.push("");
        row[ci] = v;
        return m2;
      });
      return m;
    });
    out.push({ name: sh.name, hidden: sh.hidden, grid });
  }
  return out;
}

// "Mike Timesheet - Oct 2026.csv" (how Google names a one-tab download) → "Oct 2026".
export const tabFromFileName = (name) => { const base = String(name || "").replace(/\.[^.]+$/, ""); const i = base.lastIndexOf(" - "); return (i >= 0 ? base.slice(i + 3) : base).trim(); };
// A picked file → [{name, grid}], one per tab.
export async function readSheetFile(file) {
  const nm = String((file && file.name) || "").toLowerCase();
  if (/\.(xlsx|xlsm)$/.test(nm)) return (await readXlsx(await file.arrayBuffer())).map(({ name, grid }) => ({ name, grid }));
  if (/\.(csv|tsv|txt)$/.test(nm)) return [{ name: tabFromFileName(file.name), grid: readCsv(await file.text()) }];
  if (/\.xls$/.test(nm)) throw new Error("That's an old .xls file. Save it as .xlsx or .csv and upload that.");
  throw new Error("Upload a .csv or .xlsx file.");
}
