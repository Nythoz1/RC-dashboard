// Timesheet fixtures shaped like the real Rollin Coal sheet, plus a fake Google
// (token endpoint + Sheets API) so the sync can run end to end with no network.
// Used by tests/timesheet.test.mjs and smoke.mjs.
//
// Layout (both versions): B4 "Employee:" C4 name · G4 "Month:" H4 month ·
// B5 "Hourly Wage:" C5 wage · G5 "OT Rate:" H5 rate · header on row 7 · one row
// per calendar day · totals underneath. The old version has an extra
// "Unpaid Break (min)" column after Finish.

const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad2 = (n) => String(n).padStart(2, "0");
const mins = (t) => { const m = String(t).match(/^(\d{1,2}):(\d{2}) (AM|PM)$/); let h = +m[1] % 12; if (m[3] === "PM") h += 12; return h * 60 + +m[2]; };
const utc = (iso) => new Date(iso + "T12:00:00Z");
const short = (iso) => MON3[+iso.slice(5, 7) - 1] + " " + +iso.slice(8, 10);
const monday = (iso) => { const d = utc(iso); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const serial = (iso) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);

// October 2026, current template. Expected (with the September tab synced too):
// 181.00 h = 160.00 regular + 21.00 OT; at $40.00 and 1.5× that's $7,660.00.
export const OCT_DAYS = {
  "2026-10-01": { start: "8:00 AM", finish: "4:00 PM" },                         // 8.00 h
  "2026-10-02": { start: "7:00 AM", finish: "5:30 PM" },                         // 10.50 h = 8 + 2.5 OT
  "2026-10-05": { start: "7:00 AM", finish: "4:30 PM" },                         // five 9.5-h days:
  "2026-10-06": { start: "7:00 AM", finish: "4:30 PM" },                         //   daily OT 7.5 vs weekly 3.5
  "2026-10-07": { start: "7:00 AM", finish: "4:30 PM" },
  "2026-10-08": { start: "7:00 AM", finish: "4:30 PM" },
  "2026-10-09": { start: "7:00 AM", finish: "4:30 PM" },
  "2026-10-12": { start: "8:00 AM", finish: "4:00 PM" },                         // six 8-h days:
  "2026-10-13": { start: "8:00 AM", finish: "4:00 PM" },                         //   daily 0 vs weekly 4
  "2026-10-14": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-15": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-16": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-17": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-19": { start: "8:00 AM", finish: "4:00 PM", notes: "Unit 412 injectors" },
  "2026-10-20": { start: "8:00 AM", finish: "12:00 PM", notes: "Sick" },         // times on a sick day
  "2026-10-21": { start: "6:00 AM", finish: "9:00 PM" },                         // 15 h: over 14
  "2026-10-22": { start: "4:00 PM", finish: "8:00 AM" },                         // finish before start
  "2026-10-23": { start: "8:00 AM", finish: "4:00 PM", sheetTotal: 9 },          // the sheet's math is off
  "2026-10-26": { notes: "Stat" },
  "2026-10-27": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-28": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-29": { start: "8:00 AM", finish: "4:00 PM" },
  "2026-10-30": { start: "8:00 AM", finish: "4:00 PM" },
};
// September 2026, the older template with the Unpaid Break column, $38.00.
// Expected: 43.00 h = 40.00 regular + 3.00 OT → $1,691.00.
export const SEP_DAYS = {
  "2026-09-01": { start: "8:00 AM", finish: "4:30 PM", brk: 30 },               // 8.00
  "2026-09-02": { start: "7:00 AM", finish: "6:00 PM", brk: 30 },               // 10.50
  "2026-09-03": { start: "8:00 AM", finish: "4:30 PM", brk: 30 },               // 8.00
  "2026-09-04": { start: "8:00 AM", finish: "4:30 PM" },                         // 8.50, break paid
  "2026-09-28": { start: "8:00 AM", finish: "4:30 PM", brk: 30 },               // 8.00
  "2026-09-29": { notes: "Vacation" },
  "2026-09-30": { notes: "Vacation" },
};

// One month tab as Google returns it. style "raw" = UNFORMATTED_VALUE with
// dateTimeRenderOption=FORMATTED_STRING (numbers stay numbers, dates and times
// are text); "shown" = FORMATTED_VALUE / a CSV download (everything is text).
export function buildTab({ month, employee = "Mike Test", wage = 40, otRate = "1.5x", days = {}, old = false, style = "raw", edit = {} }) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const num = (n) => (style === "raw" ? Math.round(n * 100) / 100 : n.toFixed(2));
  const grid = [
    ["Rollin Coal - Employee Timesheet"],
    [],
    ["", "Fill in Start and Finish every day you work. Write stat, sick or vacation in Notes."],
    ["", "Employee:", employee, "", "", "", "Month:", MONTHS[m - 1] + " " + y],
    ["", "Hourly Wage:", style === "raw" ? wage : "$" + wage.toFixed(2), "", "", "", "OT Rate:", otRate],
    [],
    old
      ? ["Date", "Day", "Start", "Finish", "Unpaid Break (min)", "Total Hrs", "Regular Hrs", "Daily OT (over 8)", "Week of (Mon)", "Notes (job, stat, sick, vacation)"]
      : ["Date", "Day", "Start", "Finish", "Total Hrs", "Regular Hrs", "Daily OT (over 8)", "Week of (Mon)", "Notes (job, stat, sick, vacation)"],
  ];
  let T = 0, R = 0, O = 0;
  for (let d = 1; d <= last; d++) {
    const iso = y + "-" + pad2(m) + "-" + pad2(d);
    const x = { ...(days[iso] || {}), ...(edit[iso] || {}) };
    const worked = x.start && x.finish;
    const h = worked ? (mins(x.finish) - mins(x.start) - (x.brk || 0)) / 60 : 0;
    const tot = x.sheetTotal != null ? x.sheetTotal : h;
    const reg = Math.min(tot, 8), ot = Math.max(0, tot - 8);
    if (worked) { T += tot; R += reg; O += ot; }
    const hours = worked ? [num(tot), num(reg), num(ot)] : ["-", "-", "-"];
    const row = [short(iso), DOW[utc(iso).getUTCDay()], x.start || "", x.finish || ""];
    if (old) row.push(x.brk ? (style === "raw" ? x.brk : String(x.brk)) : "");
    row.push(...hours, short(monday(iso)), x.notes || "");
    while (row.length && row[row.length - 1] === "") row.pop();        // Google drops trailing blanks
    grid.push(row);
  }
  grid.push(old ? ["Totals", "", "", "", "", num(T), num(R), num(O)] : ["Totals", "", "", "", num(T), num(R), num(O)]);
  return grid;
}
export const HOW_TO = [["How to fill in your timesheet"], ["1. Pick the month tab."], ["2. Type Start and Finish for each day you work."], ["Date", "means the day of the month"]];
export const csvOf = (grid) => grid.map((r) => r.map((v) => { const t = String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(",")).join("\r\n") + "\r\n";

// ── a fake Google: OAuth token endpoint + Sheets API v4 ──
// sheets: {id: {title, tabs: [{title, raw, shown}]}}; shared: ids the service
// account can open. Verifies the service account JWT with the public key.
export function fakeGoogle({ sheets, shared, publicKey, apiOff = false, calls = [] }) {
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  return async function fetch(url, init = {}) {
    const u = new URL(String(url));
    calls.push(u.pathname + u.search);
    if (u.host === "oauth2.googleapis.com") {
      const body = new URLSearchParams(String(init.body || ""));
      const jwt = body.get("assertion") || "";
      const [h, c, s] = jwt.split(".");
      const head = JSON.parse(new TextDecoder().decode(fromB64(h))), claim = JSON.parse(new TextDecoder().decode(fromB64(c)));
      const ok = publicKey && (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, fromB64(s), new TextEncoder().encode(h + "." + c)));
      if (body.get("grant_type") !== "urn:ietf:params:oauth:grant-type:jwt-bearer" || head.alg !== "RS256" || !ok || !/spreadsheets\.readonly$/.test(claim.scope) || claim.exp - claim.iat !== 3600) return reply(400, { error: "invalid_grant", error_description: "Invalid JWT Signature." });
      return reply(200, { access_token: "fake-token", expires_in: 3599, token_type: "Bearer" });
    }
    if (u.host !== "sheets.googleapis.com") return reply(404, {});
    if ((init.headers || {}).Authorization !== "Bearer fake-token") return reply(401, { error: { code: 401, message: "Request had invalid authentication credentials." } });
    if (apiOff) return reply(403, { error: { code: 403, message: "Google Sheets API has not been used in project 123 before or it is disabled.", status: "PERMISSION_DENIED", details: [{ reason: "SERVICE_DISABLED" }] } });
    const m = u.pathname.match(/^\/v4\/spreadsheets\/([^/]+)(\/values:batchGet)?$/);
    const id = m && decodeURIComponent(m[1]);
    const sh = id && sheets[id];
    if (!sh) return reply(404, { error: { code: 404, message: "Requested entity was not found.", status: "NOT_FOUND" } });
    if (!shared.has(id)) return reply(403, { error: { code: 403, message: "The caller does not have permission", status: "PERMISSION_DENIED" } });
    if (sh.excel) return reply(400, { error: { code: 400, message: "This operation is not supported for this document", status: "FAILED_PRECONDITION" } });
    if (!m[2]) return reply(200, { properties: { title: sh.title }, sheets: sh.tabs.map((t, i) => ({ properties: { title: t.title, index: i } })) });
    const shown = u.searchParams.get("valueRenderOption") === "FORMATTED_VALUE";
    const ranges = u.searchParams.getAll("ranges").map((r) => r.replace(/^'(.*)'$/, "$1").replace(/''/g, "'"));
    return reply(200, { spreadsheetId: id, valueRanges: ranges.map((title) => { const t = sh.tabs.find((x) => x.title === title); const g = (t && (shown ? t.shown || t.raw : t.raw)) || []; return { range: "'" + title + "'!A1:J" + Math.max(1, g.length), majorDimension: "ROWS", values: g }; }) });
  };
}
// A throwaway service account key pair, as Google's JSON key file would hold it.
export async function fakeServiceAccount() {
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const der = Uint8Array.from(atob(publicKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const pub = await crypto.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const json = JSON.stringify({ type: "service_account", project_id: "rollin-coal-timesheets", private_key_id: "abc123", private_key: privateKey, client_email: "timesheet-reader@rollin-coal-timesheets.iam.gserviceaccount.com", client_id: "1", token_uri: "https://oauth2.googleapis.com/token" });
  return { json, publicKey: pub };
}
export { serial };

// The shop's real template as of October 2026 (Rollin_Coal_Timesheet_Oct_2026.xlsx),
// cell for cell as an .xlsx reader returns it: the name box is B4:E4 (merged), the
// Month cell H4 is the 1st of the month as a date, no wage or OT rate cells, Unpaid
// Break pre-filled with 30 on every day, hour formulas that show "-" but hold 0, and a
// weekly summary and signature lines under MONTH TOTAL.
export function buildRealTab({ month = "2026-10", employee = "", days = {} } = {}) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const r2 = (n) => Math.round(n * 100) / 100;
  const grid = [
    ["ROLLIN COAL  —  EMPLOYEE TIMESHEET"],
    ["Rollin-Coal Pro Diesel LTD  ·  2040 11th Ave NW, Medicine Hat, AB  ·  1-587-863-0505"],
    [],
    ["Employee:", employee, "", "", "", "", "Month:", month + "-01"],
    ["Yellow cells = you fill in. Times like 8:00 AM / 4:30 PM. Unpaid break defaults to 30 min (lunch) — change if different. Paid 15-min breaks are NOT deducted."],
    [],
    ["Date", "Day", "Start", "Finish", "Unpaid Break (min)", "Total Hrs", "Regular Hrs", "Daily OT\n(over 8)", "Week of\n(Mon)", "Notes (job, stat, sick, vacation)"],
  ];
  let T = 0, R = 0, O = 0;
  for (let d = 1; d <= last; d++) {
    const iso = y + "-" + pad2(m) + "-" + pad2(d);
    const x = days[iso] || {};
    const brk = x.brk === undefined ? 30 : x.brk;
    const tot = x.start && x.finish ? Math.max(0, r2((mins(x.finish) - mins(x.start)) / 60 - brk / 60)) : 0;
    const reg = Math.min(tot, 8), ot = r2(Math.max(0, tot - 8));
    T += tot; R += reg; O += ot;
    const row = [iso, DOW[utc(iso).getUTCDay()], x.start || "", x.finish || "", brk, tot, reg, ot, monday(iso)];
    if (x.notes) row.push(x.notes);
    grid.push(row);
  }
  grid.push(["MONTH TOTAL", "", "", "", "", r2(T), r2(R), r2(O)], [], ["WEEKLY SUMMARY  —  Alberta OT: over 8 hrs/day or 44 hrs/week, whichever is greater"], ["Week of", "", "Total Hrs", "Daily OT", "Over 44", "OT Hrs", "Regular Hrs"], [], ["Employee signature:", "", "", "", "", "", "Date:"], ["Approved by:", "", "", "", "", "", "Date:"]);
  return grid;
}
