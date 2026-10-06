// ─────────────────────────────────────────────────────────────
// Rollin Coal — timesheets: read an employee's Google Sheets timesheet, recompute
// the hours with Alberta's overtime rule, merge them into the shop's synced rows,
// and pull them from Google with a service account.
//
// One plain ES module with no imports, shared by:
//   supabase/functions/timesheet-sync  (Deno)  the daily + "Sync now" sync
//   src/RollinCoalDashboard.jsx        (Vite)  Team → Timesheets, CSV / Excel import
//   tests/timesheet.test.mjs           (node --test)
//
// The sheet (both template versions): labels "Employee:", "Hourly Wage:",
// "Month:", "OT Rate:" with the value in the next non-empty cell to the right;
// a header row found by the cell that says "Date"; columns mapped by header text
// (Date, Day, Start, Finish, [Unpaid Break (min)], Total Hrs, Regular Hrs,
// Daily OT (over 8), Week of (Mon), Notes); one row per calendar day; the first
// row whose Date cell isn't a day ends the table (the totals sit below it).
//
// The sheet's math is never trusted: hours come from Start → Finish less any
// unpaid break (breaks and lunch are paid at Rollin Coal), and overtime is
// Alberta's rule: hours over 8 in a day or over 44 in a week (weeks start on
// Monday), whichever gives more overtime for that week. The sheet's own
// Total / Regular / OT cells are kept only to flag days where they disagree.
// ─────────────────────────────────────────────────────────────

const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_MIN = 480;    // 8 h a day
export const WEEK_MIN = 2640;  // 44 h a week
export const LONG_SHIFT_H = 14;
export const TOL_H = 0.02;     // sheet vs our numbers: about a minute either way

const str = (v) => (v == null ? "" : String(v).trim());
const isDash = (t) => /^[-–—]+$/.test(t);
const pad2 = (n) => String(n).padStart(2, "0");
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ── cell values ──
// Hours cells: 8, "8.00", "8:30" (h:mm), "-" / blank → null.
export function hrs(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  const t = str(v).replace(/,/g, "");
  if (!t || isDash(t)) return null;
  const hm = t.match(/^(\d+):(\d{2})(?::\d{2})?$/);
  if (hm) return +hm[1] + +hm[2] / 60;
  const m = t.match(/^-?\d*\.?\d+/);
  return m ? +m[0] : null;
}
// "$40.00", "40/hr", 40 → 40.
export function money(v) {
  if (typeof v === "number") return isFinite(v) && v > 0 ? v : null;
  const m = str(v).replace(/[,\s]/g, "").match(/\d*\.?\d+/);
  const n = m ? +m[0] : NaN;
  return isFinite(n) && n > 0 ? n : null;
}
// "1.5x", "x1.5", 1.5, "150%", "time and a half" → 1.5. Anything outside 1–3× is ignored.
export function otRateOf(v) {
  if (typeof v === "number") return v >= 1 && v <= 3 ? v : null;
  const t = str(v).toLowerCase();
  if (!t) return null;
  if (/time and a half/.test(t)) return 1.5;
  if (/double/.test(t)) return 2;
  const m = t.match(/\d*\.?\d+/);
  if (!m) return null;
  const n = /%/.test(t) ? +m[0] / 100 : +m[0];
  return n >= 1 && n <= 3 ? n : null;
}
// Minutes after midnight: "8:00 AM", "4:30pm", "16:00", "0730", "8 am", a day
// fraction (0.3333) or a date-time serial. A bare number like 8 isn't a time.
export function timeMin(v) {
  if (typeof v === "number") {
    if (!isFinite(v) || v < 0) return null;
    if (v < 1) return Math.round(v * 1440);
    if (v >= 20000) return Math.round((v - Math.floor(v)) * 1440);
    return null;
  }
  const t = str(v).toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (!t || isDash(t)) return null;
  if (t === "noon") return 720;
  if (t === "midnight") return 0;
  let m = t.match(/(?:^|\s|t)(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|a|p)?$/);
  let h, mi, ap;
  if (m) { h = +m[1]; mi = +m[2]; ap = m[3]; }
  else if ((m = t.match(/^(\d{1,2})\s*(am|pm|a|p)$/))) { h = +m[1]; mi = 0; ap = m[2]; }
  else if ((m = t.match(/^(\d{1,2})(\d{2})$/))) { h = +m[1]; mi = +m[2]; }
  else return null;
  if (mi > 59) return null;
  if (ap) { if (h < 1 || h > 12) return null; if (h === 12) h = 0; if (ap[0] === "p") h += 12; }
  if (h > 24 || (h === 24 && mi > 0)) return null;
  return h * 60 + mi;
}
export function fmtTime(min) {
  if (min == null) return "";
  const h = Math.floor(min / 60) % 24;
  return ((h + 11) % 12) + 1 + ":" + pad2(min % 60) + " " + (h < 12 ? "AM" : "PM");
}
export const fmtH = (min) => ((+min || 0) / 60).toFixed(2);

// ── dates ──
// Sheets / Excel day number (days since 1899-12-30) → "2026-10-01".
export const serialISO = (n) => new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 864e5).toISOString().slice(0, 10);
const validYMD = (y, m, d) => {
  if (!(y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? y + "-" + pad2(m) + "-" + pad2(d) : null;
};
const monWord = (w) => MON.indexOf(String(w).toLowerCase().slice(0, 3)) + 1;
const yr = (y) => (+y < 100 ? 2000 + +y : +y);
const MW = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";

// "October 2026", "Oct 2026", "2026-10", "10/2026", a date serial → "2026-10".
export function monthOf(v) {
  if (typeof v === "number") return v >= 20000 && v < 80000 ? serialISO(v).slice(0, 7) : null;
  const t = str(v).toLowerCase();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return m[1] + "-" + pad2(+m[2]);
  m = t.match(new RegExp("\\b" + MW + ",?\\s*(?:\\d{1,2},?\\s+)?(?:'(\\d{2})|(\\d{4}))\\b"));
  if (m) return yr(m[2] || m[3]) + "-" + pad2(monWord(m[1]));
  m = t.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return m[2] + "-" + pad2(+m[1]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + pad2(+m[1] <= 12 ? +m[1] : +m[2]);
  return null;
}
export const monthLabel = (ym) => (ym ? MONTH_NAMES[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4) : "");
export const monthEnd = (ym) => ym + "-" + pad2(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate());

// A Date cell → "2026-10-01", or null when it isn't a day (that ends the table).
// ctx = the tab's month ("2026-10") or just a year ("2026"): supplies the year for
// "Oct 1" and settles 1/10 vs 10/1.
export function dayISO(v, ctx) {
  const cy = ctx ? +String(ctx).slice(0, 4) : null;
  const cm = ctx && String(ctx).length >= 7 ? +String(ctx).slice(5, 7) : null;
  const yFor = (mo) => (cy == null ? null : cm === 12 && mo === 1 ? cy + 1 : cm === 1 && mo === 12 ? cy - 1 : cy);
  if (typeof v === "number") {
    if (v >= 20000 && v < 80000) return serialISO(v);
    if (cm && Number.isInteger(v) && v >= 1 && v <= 31) return validYMD(cy, cm, v);
    return null;
  }
  const t = str(v).toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validYMD(+m[1], +m[2], +m[3]);
  m = t.match(new RegExp("^(?:[a-z]+,?\\s+)?" + MW + "\\s*(\\d{1,2})(?:,?\\s+(\\d{4}))?$"));
  if (m) { const mo = monWord(m[1]); const y = m[3] ? +m[3] : yFor(mo); return y ? validYMD(y, mo, +m[2]) : null; }
  m = t.match(new RegExp("^(?:[a-z]+,?\\s+)?(\\d{1,2})[\\s\\-]+" + MW + "(?:[\\s\\-,]+(\\d{4}|\\d{2}))?$"));
  if (m) { const mo = monWord(m[2]); const y = m[3] ? yr(m[3]) : yFor(mo); return y ? validYMD(y, mo, +m[1]) : null; }
  m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (m) {
    let mo = +m[1], d = +m[2];
    if ((cm && d === cm && mo !== cm) || (mo > 12 && d <= 12)) { mo = +m[2]; d = +m[1]; }
    const y = m[3] ? yr(m[3]) : yFor(mo);
    return y ? validYMD(y, mo, d) : null;
  }
  m = t.match(/^(\d{1,2})$/);
  if (m && cm) return validYMD(cy, cm, +m[1]);
  return null;
}
export const dow = (iso) => DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
export function addDaysISO(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
// The Monday on or before the date.
export function weekStart(iso) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
export const shortDate = (iso) => (iso ? MONTH_NAMES[+iso.slice(5, 7) - 1].slice(0, 3) + " " + +iso.slice(8, 10) : "");

// ── one month tab → rows ──
const LBL = {
  employee: /^(employee|employee name|name)$/,
  wage: /^(hourly wage|hourly rate|wage|pay rate|rate of pay)$/,
  month: /^(month|pay month|period|pay period)$/,
  otRate: /^(ot rate|overtime rate)$/,
};
// Where the current template keeps them (C4, C5, H4, H5): used only when a label is missing.
const FIXED = { employee: [3, 2], wage: [4, 2], month: [3, 7], otRate: [4, 7] };
const COLS = [
  ["notes", /^(notes?|comments?)\b/],
  ["brk", /\bbreak\b/],
  ["ot", /\b(ot|overtime)\b/],
  ["total", /^(total|hours|hrs)\b/],
  ["reg", /^reg(ular)?\b/],
  ["start", /^(start|time in|in)\b/],
  ["finish", /^(finish|end|stop|time out|out)\b/],
  ["week", /^week\b/],
  ["day", /^day\b/],
];
const lblName = (raw) => { const i = raw.indexOf(":"); return { name: (i >= 0 ? raw.slice(0, i) : raw).trim().toLowerCase().replace(/\s+/g, " "), inline: i >= 0 ? raw.slice(i + 1).trim() : "", colon: i >= 0 }; };
const isLabelCell = (v) => { const raw = str(v); if (!raw) return false; const l = lblName(raw); return l.colon && !l.inline && Object.values(LBL).some((re) => re.test(l.name)); };

// grid: rows of cell values (strings and/or numbers), as Google, a CSV or an
// .xlsx gives them. year: the year to assume when the tab never says one.
export function parseTab(grid, tab = "", { year } = {}) {
  const res = { tab, employee: "", wage: null, otRate: 1.5, otRateSet: false, month: null, rows: [], warnings: [], header: false, oldTemplate: false };
  if (!Array.isArray(grid) || !grid.length) { res.warnings.push("The tab is empty."); return res; }
  const cell = (r, c) => { const row = grid[r]; return Array.isArray(row) && c >= 0 && c < row.length && row[c] != null ? row[c] : ""; };
  let hr = -1, dc = -1;
  for (let r = 0; r < grid.length && hr < 0; r++) (grid[r] || []).forEach((v, c) => { if (hr < 0 && /^date:?$/i.test(str(v))) { hr = r; dc = c; } });
  // labels above the header: the value is the next non-empty cell to the right
  const found = {};
  const top = hr < 0 ? Math.min(grid.length, 40) : hr;
  for (let r = 0; r < top; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const raw = str(row[c]);
      if (!raw) continue;
      const l = lblName(raw);
      for (const k in LBL) {
        if (found[k] !== undefined || !LBL[k].test(l.name)) continue;
        if (l.inline) { found[k] = l.inline; break; }
        let val = "";
        for (let j = c + 1; j < row.length; j++) if (str(row[j]) !== "") { val = isLabelCell(row[j]) ? "" : row[j]; break; }
        found[k] = val;
        break;
      }
    }
  }
  for (const k in FIXED) if (found[k] === undefined) { const v = cell(FIXED[k][0], FIXED[k][1]); if (str(v) && !isLabelCell(v)) found[k] = v; }
  res.employee = str(found.employee);
  res.wage = money(found.wage);
  const rate = otRateOf(found.otRate);
  if (rate != null) { res.otRate = rate; res.otRateSet = true; }
  if (rate != null && rate < 1.5) res.warnings.push("The OT rate on the sheet is " + rate + "×, below Alberta's 1.5×.");
  const mLabel = monthOf(found.month), mTab = monthOf(tab);
  res.month = mLabel || mTab || null;
  if (mLabel && mTab && mLabel !== mTab) res.warnings.push("The Month cell says " + monthLabel(mLabel) + " but the tab is named " + tab + ". Using the Month cell.");
  if (!res.employee) res.warnings.push("No employee name on the sheet.");
  if (res.wage == null) res.warnings.push("No hourly wage on the sheet.");
  if (hr < 0) { res.warnings.push("No header row with a \"Date\" cell, so there are no days to read."); return res; }
  res.header = true;
  const cols = { date: dc };
  (grid[hr] || []).forEach((v, c) => { const t = str(v).toLowerCase(); if (!t || c === dc) return; for (const [k, re] of COLS) if (re.test(t)) { if (cols[k] == null) cols[k] = c; break; } });
  res.cols = cols;
  res.oldTemplate = cols.brk != null;
  if (cols.start == null || cols.finish == null) res.warnings.push("No Start and Finish columns, so hours can't be worked out.");
  const brkInHours = cols.brk != null && /\b(hr|hrs|hour|hours)\b/i.test(str(cell(hr, cols.brk)));
  const ctx = res.month || (year ? String(year) : null);
  if (!res.month) res.warnings.push("No month on the sheet" + (year ? "; assumed " + year + "." : "."));
  const get = (r, k) => (cols[k] == null ? "" : cell(r, k === "date" ? dc : cols[k]));
  const timeCell = (v) => { const m = timeMin(v); const t = str(v); return m != null ? fmtTime(m) : isDash(t) ? "" : t; };
  let started = false, lead = 0, dayMismatch = 0;
  const seen = new Set();
  for (let r = hr + 1; r < grid.length; r++) {
    const iso = dayISO(cell(r, dc), ctx);
    if (!iso) { if (!started && lead++ < 3) continue; break; }
    started = true;
    let brk = null;
    if (cols.brk != null) {
      const bv = get(r, "brk");
      const hm = typeof bv === "string" && bv.trim().match(/^(\d+):(\d{2})(?::\d{2})?$/);
      const n = hm ? +hm[1] * 60 + +hm[2] : hrs(bv);
      brk = n == null ? 0 : hm ? n : brkInHours ? Math.round(n * 60) : Math.round(n);
    }
    const sd = str(get(r, "day")).toLowerCase().slice(0, 3);
    if (sd && DOW.some((x) => x.toLowerCase() === sd) && sd !== dow(iso).toLowerCase()) dayMismatch++;
    if (seen.has(iso)) res.warnings.push(shortDate(iso) + " appears twice; the lower row is used.");
    seen.add(iso);
    res.rows.push({
      date: iso, day: dow(iso), start: timeCell(get(r, "start")), finish: timeCell(get(r, "finish")), unpaidBreakMin: brk,
      notes: str(get(r, "notes")), sTotal: hrs(get(r, "total")), sReg: hrs(get(r, "reg")), sOT: hrs(get(r, "ot")),
    });
  }
  if (dayMismatch) res.warnings.push("The Day column doesn't match the dates on " + dayMismatch + " row" + (dayMismatch === 1 ? "" : "s") + ". Check the Month cell" + (res.month ? " (it reads " + monthLabel(res.month) + ")" : "") + ".");
  if (!res.rows.length) res.warnings.push("No day rows under the header.");
  const byDate = new Map(res.rows.map((x) => [x.date, x]));
  res.rows = [...byDate.values()];
  return res;
}

// ── hours and Alberta overtime ──
export function shift(r) {
  const sb = str(r.start), fb = str(r.finish);
  if (!sb && !fb) return { min: 0, err: "" };
  if (!sb || !fb) return { min: 0, err: "missing" };
  const s = timeMin(sb), f = timeMin(fb);
  if (s == null || f == null) return { min: 0, err: "time" };
  if (f <= s) return { min: 0, err: "order" };
  const m = f - s - (+r.unpaidBreakMin || 0);
  if (m < 0) return { min: 0, err: "break" };
  return { min: m, err: "" };
}
// One employee's rows (any months) → per-day hours split into regular / OT, and
// per-week totals with the rule that applied. All in whole minutes.
// Under the weekly rule each day keeps its own over-8 hours as OT and the rest
// of the week's overage lands on the last days worked.
export function computeDays(rows) {
  const days = {}, weeks = {};
  [...(rows || [])].filter((r) => r && r.date).sort((a, b) => cmp(a.date, b.date)).forEach((r) => {
    const sh = shift(r);
    days[r.date] = { date: r.date, min: sh.min, err: sh.err, dailyOtMin: Math.max(0, sh.min - DAY_MIN), otMin: 0, regMin: 0 };
    const w = weekStart(r.date);
    (weeks[w] = weeks[w] || { start: w, end: addDaysISO(w, 6), dates: [] }).dates.push(r.date);
  });
  Object.values(weeks).forEach((w) => {
    const ds = w.dates.map((x) => days[x]);
    w.min = ds.reduce((a, x) => a + x.min, 0);
    w.dailyMin = ds.reduce((a, x) => a + x.dailyOtMin, 0);
    w.weeklyMin = Math.max(0, w.min - WEEK_MIN);
    ds.forEach((x) => { x.otMin = x.dailyOtMin; });
    if (w.weeklyMin > w.dailyMin) {
      w.rule = "weekly";
      let extra = w.weeklyMin - w.dailyMin;
      for (let i = ds.length - 1; i >= 0 && extra > 0; i--) { const take = Math.min(ds[i].min - ds[i].otMin, extra); ds[i].otMin += take; extra -= take; }
    } else w.rule = w.dailyMin > 0 ? "daily" : "none";
    ds.forEach((x) => { x.regMin = x.min - x.otMin; });
    w.otMin = Math.max(w.dailyMin, w.weeklyMin);
    w.regMin = w.min - w.otMin;
  });
  return { days, weeks };
}
const LEAVE = /\b(sick|stat|vacation|vac|holiday)\b/i;
// Why a day needs a look. lv: "bad" (not counted), "warn", "info" (the 44-hour
// rule moved hours to OT that the sheet counts as regular — expected). short: a
// few words for the printed sheet.
export function dayFlags(r, d) {
  const out = [];
  if (!d) return out;
  const near = (a, b) => Math.abs(a - b) <= TOL_H;
  const f2 = (n) => (+n || 0).toFixed(2);
  if (d.err === "order") out.push({ k: "order", lv: "bad", short: "Finish before Start, not counted", msg: "Finish is before Start, so this day isn't counted." });
  if (d.err === "time") out.push({ k: "time", lv: "bad", short: "Time not readable, not counted", msg: "Start or Finish isn't a time we can read (" + [r.start, r.finish].filter(Boolean).join(" to ") + "), so this day isn't counted." });
  if (d.err === "missing") out.push({ k: "missing", lv: "bad", short: "Only one time, not counted", msg: "Only one of Start and Finish is filled in, so this day isn't counted." });
  if (d.err === "break") out.push({ k: "break", lv: "bad", short: "Break longer than the shift", msg: "The unpaid break is longer than the shift." });
  if (d.min > LONG_SHIFT_H * 60) out.push({ k: "long", lv: "warn", short: "Over " + LONG_SHIFT_H + " h", msg: "The shift is over " + LONG_SHIFT_H + " hours." });
  if (LEAVE.test(r.notes || "") && (str(r.start) || str(r.finish))) out.push({ k: "leave", lv: "warn", short: "Times on a sick / stat / vacation day", msg: "Times are filled in on a day marked sick, stat or vacation." });
  const h = d.min / 60, reg = d.regMin / 60, ot = d.otMin / 60;
  if ((r.sTotal != null || h > 0) && !near(r.sTotal == null ? 0 : r.sTotal, h)) {
    out.push({ k: "total", lv: "warn", short: "Sheet says " + (r.sTotal == null ? "no total" : f2(r.sTotal) + " h"), msg: (r.sTotal == null ? "The sheet shows no total" : "The sheet says " + f2(r.sTotal) + " h") + "; Start to Finish" + (r.unpaidBreakMin ? " less the break" : "") + " is " + f2(h) + " h." });
  } else if (r.sReg != null || r.sOT != null) {
    const sr = r.sReg == null ? 0 : r.sReg, so = r.sOT == null ? 0 : r.sOT;
    if (!near(sr, reg) || !near(so, ot)) {
      const dReg = Math.min(d.min, DAY_MIN) / 60, dOt = Math.max(0, d.min - DAY_MIN) / 60;
      if (near(sr, dReg) && near(so, dOt)) out.push({ k: "weekly", lv: "info", short: "OT by the 44-h week", msg: "Over 44 hours that week, so " + f2(ot) + " h of this day is overtime. The sheet only counts daily overtime." });
      else out.push({ k: "split", lv: "warn", short: "Sheet says " + f2(sr) + " reg / " + f2(so) + " OT", msg: "The sheet says " + f2(sr) + " regular and " + f2(so) + " OT; we count " + f2(reg) + " and " + f2(ot) + "." });
    }
  }
  return out;
}
// Gross pay for a set of computed days. payFor(date) → {wage, otRate} or null.
export function payTotals(dayList, payFor) {
  let reg = 0, ot = 0, regMin = 0, otMin = 0;
  const missing = new Set();
  (dayList || []).forEach((d) => {
    regMin += d.regMin; otMin += d.otMin;
    const p = payFor ? payFor(d.date) : null;
    if (!p || !(+p.wage > 0)) { if (d.regMin || d.otMin) missing.add(d.date.slice(0, 7)); return; }
    reg += (d.regMin / 60) * p.wage;
    ot += (d.otMin / 60) * p.wage * (+p.otRate || 1.5);
  });
  const c = (x) => Math.round(x * 100) / 100;
  return { regMin, otMin, regPay: c(reg), otPay: c(ot), gross: c(reg + ot), missing: [...missing].sort() };
}

// ── pay periods ──
export function periodOf(iso, kind = "monthly", anchor = "") {
  if (kind === "semimonthly") { const ym = iso.slice(0, 7); return +iso.slice(8, 10) <= 15 ? { start: ym + "-01", end: ym + "-15", kind } : { start: ym + "-16", end: monthEnd(ym), kind }; }
  if (kind === "biweekly") {
    const a = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(anchor || "") ? anchor : "2026-01-05");
    const k = Math.floor(Math.round((Date.parse(iso + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5) / 14);
    const start = addDaysISO(a, k * 14);
    return { start, end: addDaysISO(start, 13), kind };
  }
  const ym = iso.slice(0, 7);
  return { start: ym + "-01", end: monthEnd(ym), kind: "monthly" };
}
export const periodLabel = (p) => (!p ? "" : p.kind === "monthly" ? monthLabel(p.start.slice(0, 7)) : shortDate(p.start) + " to " + shortDate(p.end) + ", " + p.end.slice(0, 4));
// Periods that hold any of the dates, plus the one holding `today`; newest first.
export function periodList(dates, kind, anchor, today) {
  const m = new Map();
  [...(dates || []), today].filter(Boolean).forEach((iso) => { const p = periodOf(iso, kind, anchor); m.set(p.start, p); });
  return [...m.values()].sort((a, b) => cmp(b.start, a.start));
}

// ── merging synced rows ──
// A row's id is employee + date, so a re-sync updates rows instead of adding them.
export const rowKey = (emp, date) => String(emp) + "|" + date;
const SIG = ["start", "finish", "unpaidBreakMin", "notes", "sTotal", "sReg", "sOT"];
const nz = (v) => (v === undefined || v === "" ? null : v);
export const rowSig = (r) => JSON.stringify(SIG.map((k) => nz(r[k])));
export const rowVals = (r) => { const o = {}; SIG.forEach((k) => { o[k] = r[k] === undefined ? (k === "start" || k === "finish" || k === "notes" ? "" : null) : r[k]; }); return o; };
// The approved pay period that covers this employee's date, if any.
export const lockedBy = (periods, emp, date) => (periods || []).find((p) => p && String(p.emp) === String(emp) && date >= p.start && date <= p.end) || null;

// existing: the stored rows (every employee). incoming: parsed rows carrying
// emp, employee, sheetId, tab, src. Rows in an approved period are never
// overwritten: a change is parked on the row as `pending` (old values stay on the
// row, new values in pending.vals) for the owner to keep or accept. `keep` remembers
// a change the owner chose not to take, so the same change isn't flagged again.
// scope(row): the rows this sync answers for (one sheet's rows); a row in scope
// that the sheet no longer has is removed, or flagged when it's approved.
export function mergeRows(existing, incoming, { periods = [], now = new Date().toISOString(), scope = null } = {}) {
  const map = new Map((existing || []).map((r) => [String(r.id), r]));
  const seen = new Set();
  const st = { added: 0, updated: 0, same: 0, flagged: 0, removed: 0 };
  (incoming || []).forEach((inc) => {
    const id = rowKey(inc.emp, inc.date);
    seen.add(id);
    const cur = map.get(id);
    const meta = { id, emp: inc.emp, employee: inc.employee || "", sheetId: inc.sheetId || null, tab: inc.tab || "", src: inc.src || "google", date: inc.date, day: dow(inc.date), syncedAt: now };
    if (!cur) { map.set(id, { ...meta, ...rowVals(inc) }); st.added++; return; }
    const sig = rowSig(inc);
    if (rowSig(cur) === sig) { const { pending, keep, ...rest } = cur; map.set(id, { ...rest, ...meta }); st.same++; return; }
    if (lockedBy(periods, cur.emp, cur.date)) {
      if (cur.keep === sig || (cur.pending && cur.pending.sig === sig)) { st.same++; return; }
      map.set(id, { ...cur, pending: { at: now, sig, vals: rowVals(inc), tab: inc.tab || cur.tab || "", src: inc.src || "google", sheetId: inc.sheetId || null } });
      st.flagged++;
      return;
    }
    map.set(id, { ...meta, ...rowVals(inc) });
    st.updated++;
  });
  if (scope) [...map.values()].forEach((cur) => {
    const id = String(cur.id);
    if (seen.has(id) || !scope(cur)) return;
    if (lockedBy(periods, cur.emp, cur.date)) {
      if (cur.keep !== "removed" && !(cur.pending && cur.pending.removed)) { map.set(id, { ...cur, pending: { at: now, sig: "removed", removed: true } }); st.flagged++; }
    } else { map.delete(id); st.removed++; }
  });
  const rows = [...map.values()].sort((a, b) => cmp(String(a.emp), String(b.emp)) || cmp(a.date, b.date));
  return { rows, stats: st };
}
// The owner's answer to a parked change: take the sheet's new values, or keep the approved ones.
export function acceptPending(row, now = new Date().toISOString()) {
  if (!row || !row.pending) return row;
  const { pending, keep, ...rest } = row;
  if (pending.removed) return null;
  return { ...rest, ...pending.vals, tab: pending.tab || rest.tab, src: pending.src || rest.src, sheetId: pending.sheetId !== undefined ? pending.sheetId : rest.sheetId, syncedAt: now, acceptedAt: now };
}
export function keepApproved(row) {
  if (!row || !row.pending) return row;
  const { pending, ...rest } = row;
  return { ...rest, keep: pending.sig };
}

// Wages live in their own owner-only list, one entry per employee and month
// (id "emp|2026-10"). A wage that changes in a month with approved days is
// parked as `pending` the same way.
export function mergePay(pay, tabs, { periods = [], now = new Date().toISOString() } = {}) {
  const map = new Map((pay || []).map((p) => [String(p.id), p]));
  (tabs || []).forEach((t) => {
    if (!t || !t.month || t.emp == null) return;
    const id = String(t.emp) + "|" + t.month, cur = map.get(id);
    const wage = t.wage != null ? t.wage : cur ? cur.wage : null;
    const otRate = t.otRateSet ? t.otRate : cur ? cur.otRate : 1.5;
    const next = { id, emp: t.emp, month: t.month, wage, otRate, sheetId: t.sheetId || null, tab: t.tab || "", at: now };
    if (!cur) { map.set(id, next); return; }
    if ((cur.wage == null ? null : +cur.wage) === (wage == null ? null : +wage) && (+cur.otRate || 1.5) === (+otRate || 1.5)) {
      const { pending, keep, ...rest } = cur;
      map.set(id, { ...rest, sheetId: next.sheetId, tab: next.tab, at: now });
      return;
    }
    const locked = (periods || []).some((p) => p && String(p.emp) === String(t.emp) && p.start <= monthEnd(t.month) && p.end >= t.month + "-01");
    if (locked) {
      const sig = wage + "|" + otRate;
      if (cur.keep === sig || (cur.pending && cur.pending.sig === sig)) return;
      map.set(id, { ...cur, pending: { at: now, sig, wage, otRate } });
      return;
    }
    map.set(id, next);
  });
  return [...map.values()].sort((a, b) => cmp(a.id, b.id));
}
export function payFor(pay, emp, date) {
  const p = (pay || []).find((x) => String(x.emp) === String(emp) && x.month === date.slice(0, 7));
  return p && +p.wage > 0 ? { wage: +p.wage, otRate: +p.otRate || 1.5 } : null;
}

// A CSV / Excel export of one tab, merged straight in (never removes rows).
export function applyImport(state, tab, { emp, now = new Date().toISOString(), withPay = true } = {}) {
  const inc = (tab.rows || []).map((r) => ({ ...r, emp, employee: tab.employee, sheetId: null, tab: tab.tab, src: "upload" }));
  const m = mergeRows(state.timesheets, inc, { periods: state.payPeriods, now });
  const tsPay = withPay ? mergePay(state.tsPay, [{ emp, month: tab.month, wage: tab.wage, otRate: tab.otRate, otRateSet: tab.otRateSet, tab: tab.tab }], { periods: state.payPeriods, now }) : state.tsPay;
  return { timesheets: m.rows, tsPay, stats: m.stats };
}

// ── Google Sheets ──
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/";
export const SKIP_TAB = /how to|instruction|read ?me|template/i;
// Google adds rtpof=true to links of Office files (.xlsx) opened in Sheets; the
// Sheets API can't read those until they're saved as Google Sheets.
export const looksLikeExcelLink = (input) => /[?&#]rtpof=true\b/i.test(str(input));
// A pasted link or a bare id → the spreadsheet id.
export function extractSheetId(input) {
  const t = str(input);
  const m = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) || t.match(/^([a-zA-Z0-9_-]{25,})$/);
  return m ? m[1] : "";
}
const utf8 = (t) => new TextEncoder().encode(t);
const b64url = (buf) => { const a = new Uint8Array(buf); let s = ""; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
function pemDer(pem) {
  const b = String(pem || "").replace(/-----[^-]+-----/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  const bin = atob(b), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function readServiceAccount(json) {
  if (json == null || (typeof json === "string" && !json.trim())) throw new Error("Google access isn't set up yet: the GOOGLE_SA_JSON secret is missing (see SETUP.md).");
  let sa = json;
  if (typeof sa === "string") { try { sa = JSON.parse(sa); } catch (e) { throw new Error("The GOOGLE_SA_JSON secret isn't valid JSON. Paste the whole key file into it."); } }
  if (!sa || !sa.client_email || !sa.private_key) throw new Error("The GOOGLE_SA_JSON secret is missing client_email or private_key. Paste the whole key file into it.");
  return sa;
}
export const saEmailOf = (json) => { try { return readServiceAccount(json).client_email; } catch (e) { return ""; } };
// OAuth access token from the service account key (JWT grant, RS256, read-only Sheets scope).
export async function googleToken(sa, { fetch: f = globalThis.fetch, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const aud = sa.token_uri || "https://oauth2.googleapis.com/token";
  const head = b64url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(utf8(JSON.stringify({ iss: sa.client_email, scope: SHEETS_SCOPE, aud, iat, exp: iat + 3600 })));
  let key;
  try { key = await crypto.subtle.importKey("pkcs8", pemDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]); }
  catch (e) { throw new Error("The private key in GOOGLE_SA_JSON couldn't be read. Paste the whole key file again."); }
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(head + "." + claim));
  const r = await f(aud, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + head + "." + claim + "." + b64url(sig) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) {
    const why = d.error_description || d.error || "HTTP " + r.status;
    throw new Error(/invalid_grant|account not found|invalid jwt signature/i.test(why) ? "Google turned the key down (" + why + "). The key may have been deleted; make a new one (SETUP.md step 4)." : "Couldn't sign in to Google: " + why);
  }
  return d.access_token;
}
export function sheetsError(d, status, saEmail) {
  const msg = (d && d.error && d.error.message) || "";
  if (/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(msg + JSON.stringify((d && d.error && d.error.details) || ""))) return "The Google Sheets API is turned off for the Google Cloud project. Turn it on (SETUP.md step 2), wait a minute, then sync again.";
  if (/not supported for this document/i.test(msg)) return "This link is an Excel file (.xlsx) stored in Google Drive, and the sync reads Google Sheets only. Open it, choose File, then Save as Google Sheets, and connect the new sheet's link instead.";
  if (status === 403) return "This sheet isn't shared with the service account. Open the sheet, click Share and add " + (saEmail || "the service account email") + " as a Viewer.";
  if (status === 404) return "Google can't find this sheet. Check the link in Timesheet settings.";
  if (status === 429) return "Google says too many requests. Wait a minute and sync again.";
  return "Google Sheets error" + (status ? " " + status : "") + (msg ? ": " + msg : ".");
}
async function gget(f, url, token, saEmail) {
  const r = await f(url, { headers: { Authorization: "Bearer " + token } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(sheetsError(d, r.status, saEmail));
  return d;
}
const colIdx = (L) => [...L.toUpperCase()].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
// Google drops the empty rows / columns before the first value; put them back so
// the template's fixed cells (C4 …) still line up.
function padGrid(values, range) {
  const m = String(range || "").match(/!\$?([A-Z]+)\$?(\d+)/i);
  if (!m) return values;
  const c0 = colIdx(m[1]), r0 = +m[2] - 1;
  if (!c0 && !r0) return values;
  const pre = new Array(c0).fill("");
  return [...Array.from({ length: r0 }, () => []), ...values.map((row) => [...pre, ...(row || [])])];
}
const quoteTab = (t) => "'" + String(t).replace(/'/g, "''") + "'";
const badCount = (p) => p.rows.filter((r) => (r.start && timeMin(r.start) == null) || (r.finish && timeMin(r.finish) == null)).length;
// One spreadsheet → its title and parsed month tabs (the instructions tab is skipped).
export async function readSheet(sheetId, { token, fetch: f = globalThis.fetch, year, saEmail } = {}) {
  const base = SHEETS + encodeURIComponent(sheetId);
  const meta = await gget(f, base + "?fields=" + encodeURIComponent("properties(title),sheets(properties(title,index))"), token, saEmail);
  const names = (meta.sheets || []).map((x) => x && x.properties && x.properties.title).filter((t) => t && !SKIP_TAB.test(t));
  const grab = async (tabs, render) => {
    if (!tabs.length) return [];
    const qs = tabs.map((t) => "ranges=" + encodeURIComponent(quoteTab(t))).join("&") + "&majorDimension=ROWS&valueRenderOption=" + render + (render === "UNFORMATTED_VALUE" ? "&dateTimeRenderOption=FORMATTED_STRING" : "");
    const d = await gget(f, base + "/values:batchGet?" + qs, token, saEmail);
    return (d.valueRanges || []).map((vr, i) => parseTab(padGrid(vr.values || [], vr.range), tabs[i], { year }));
  };
  let parsed = await grab(names, "UNFORMATTED_VALUE");
  // Fall back to the values as shown when the raw ones didn't read cleanly.
  const weak = parsed.filter((p) => p.header && (!p.rows.length || badCount(p) > 0)).map((p) => p.tab);
  if (weak.length) {
    const again = await grab(weak, "FORMATTED_VALUE");
    parsed = parsed.map((p) => { const q = again.find((x) => x.tab === p.tab); return q && q.rows.length >= p.rows.length && badCount(q) <= badCount(p) ? q : p; });
  }
  return { title: (meta.properties && meta.properties.title) || "", tabs: parsed.filter((p) => p.header), skipped: parsed.filter((p) => !p.header).map((p) => p.tab) };
}
// Every connected sheet (or just `only`) → results, one sheet at a time so a
// shop's worth of timesheets stays far inside Google's free per-minute quota.
export async function fetchSources(sources, { saJson, fetch: f = globalThis.fetch, now = new Date(), only = null } = {}) {
  now = now instanceof Date ? now : new Date(now);
  const list = (sources || []).filter((x) => x && x.sheetId && (only == null || String(x.id) === String(only)));
  let saEmail = "", token = "";
  try { const sa = readServiceAccount(saJson); saEmail = sa.client_email; token = await googleToken(sa, { fetch: f, now: +now }); }
  catch (e) { return { saEmail, error: e.message, results: list.map((x) => ({ id: x.id, ok: false, error: e.message })) }; }
  const results = [];
  for (const x of list) {
    try { results.push({ id: x.id, ok: true, ...(await readSheet(x.sheetId, { token, fetch: f, year: now.getUTCFullYear(), saEmail })) }); }
    catch (e) { results.push({ id: x.id, ok: false, error: e.message }); }
  }
  return { saEmail, error: null, results };
}
// Fold fetched sheets into the stored lists. state: {sources, timesheets, payPeriods, tsPay}.
export function applySync(state, fetched, { now = new Date().toISOString() } = {}) {
  let rows = state.timesheets || [], pay = state.tsPay || [];
  const sources = (state.sources || []).map((x) => ({ ...x }));
  const results = [];
  ((fetched && fetched.results) || []).forEach((res) => {
    const src = sources.find((x) => String(x.id) === String(res.id));
    if (!src) return;
    src.lastTried = now;
    if (!res.ok) { src.lastError = res.error; results.push({ id: src.id, ok: false, error: res.error }); return; }
    if (src.employeeId == null || src.employeeId === "") { src.lastError = "Pick which Team member this timesheet belongs to (Timesheet settings)."; results.push({ id: src.id, ok: false, error: src.lastError }); return; }
    const emp = src.employeeId, inc = [], tabs = [];
    res.tabs.forEach((t) => {
      t.rows.forEach((r) => inc.push({ ...r, emp, employee: t.employee, sheetId: src.sheetId, tab: t.tab, src: "google" }));
      tabs.push({ emp, month: t.month, wage: t.wage, otRate: t.otRate, otRateSet: t.otRateSet, sheetId: src.sheetId, tab: t.tab });
    });
    // A tab that's there but didn't read keeps its rows; rows from deleted tabs go.
    const unread = new Set(res.skipped || []);
    const m = mergeRows(rows, inc, { periods: state.payPeriods, now, scope: (r) => r.sheetId === src.sheetId && !unread.has(r.tab) });
    rows = m.rows;
    pay = mergePay(pay, tabs, { periods: state.payPeriods, now });
    const warnings = [...res.tabs.flatMap((t) => t.warnings.map((w) => t.tab + ": " + w)), ...[...unread].map((t) => t + ": no header row with a \"Date\" cell, so it was skipped.")];
    const name = (res.tabs.find((t) => t.employee) || {}).employee || "";
    Object.assign(src, { lastSynced: now, lastError: null, title: res.title || src.title || "", tabs: res.tabs.map((t) => t.tab), days: inc.length, warnings: warnings.slice(0, 20), sheetName: name });
    results.push({ id: src.id, ok: true, ...m.stats, tabs: res.tabs.length, warnings });
  });
  return { timesheets: rows, tsPay: pay, sources, results };
}
// Fetch + fold in one go (the Edge Function splits the two so it can read the
// stored lists fresh after the slow Google calls).
export async function runSync(state, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
  const fetched = await fetchSources(state.sources, { ...opts, now });
  return { ...applySync(state, fetched, { now: now.toISOString() }), saEmail: fetched.saEmail, error: fetched.error };
}
