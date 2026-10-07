// ─────────────────────────────────────────────────────────────
// Timesheets: hours, Alberta overtime, pay periods, and who may change a day.
// Plain functions, no imports. Used by the dashboard (each employee's own
// timesheet, Team → Timesheets, Reports) and by tests/timesheet.test.mjs.
//
// Employees fill in their own hours in the app. A full day is 8:00 AM to
// 4:00 PM, Monday to Friday; lunch is paid, so nothing is taken off. Overtime
// follows Alberta's rule: hours over 8 in a day or over 44 in a week (weeks
// start on Monday), whichever gives more overtime for that week.
// The same rules about which days can be changed are enforced by the database
// (supabase/migrations/0011_timesheets.sql); these copies drive the screens.
// ─────────────────────────────────────────────────────────────

export const DAY_MIN = 480;    // 8 h a day
export const WEEK_MIN = 2640;  // 44 h a week
export const LONG_SHIFT_H = 14;
export const FULL_DAY = { start: "8:00 AM", finish: "4:00 PM" };
export const SHOP_TZ = "America/Edmonton";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const str = (v) => (v == null ? "" : String(v).trim());
const pad2 = (n) => String(n).padStart(2, "0");
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ── times ──
// Minutes after midnight from "8:00 AM", "4:30pm", "16:00" or "0730".
export function timeMin(v) {
  const t = str(v).toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (!t) return null;
  let m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm|a|p)?$/);
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
// <input type="time"> speaks "08:00"; entries keep "8:00 AM".
export const toTimeInput = (v) => { const m = timeMin(v); return m == null ? "" : pad2(Math.floor(m / 60) % 24) + ":" + pad2(m % 60); };
export const fromTimeInput = (v) => { const m = timeMin(v); return m == null ? "" : fmtTime(m); };

// ── dates ──
// Today in Medicine Hat, whatever the device's clock zone.
export function shopToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map((x) => [x.type, x.value]));
  return p.year + "-" + p.month + "-" + p.day;
}
const utc = (iso) => new Date(iso + "T12:00:00Z");
export const dow = (iso) => DOW[utc(iso).getUTCDay()];
export const isWeekday = (iso) => { const d = utc(iso).getUTCDay(); return d >= 1 && d <= 5; };
export function addDaysISO(iso, n) { const d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
// The Monday on or before the date.
export function weekStart(iso) { const d = utc(iso); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
export const monthLabel = (ym) => (ym ? MONTH_NAMES[+ym.slice(5, 7) - 1] + " " + ym.slice(0, 4) : "");
export const monthEnd = (ym) => ym + "-" + pad2(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate());
export const addMonths = (ym, n) => { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1); };
export const shortDate = (iso) => (iso ? MONTH_NAMES[+iso.slice(5, 7) - 1].slice(0, 3) + " " + +iso.slice(8, 10) : "");
export const longDate = (iso) => (iso ? DOW_LONG[utc(iso).getUTCDay()] + ", " + MONTH_NAMES[+iso.slice(5, 7) - 1] + " " + +iso.slice(8, 10) : "");
export function rangeDays(start, end) { const out = []; for (let d = start; d <= end; d = addDaysISO(d, 1)) out.push(d); return out; }
export const monthDays = (ym) => rangeDays(ym + "-01", monthEnd(ym));

// ── one day, one week ──
export const entryId = (emp, date) => String(emp) + "|" + date;
export function shift(r) {
  const sb = str(r && r.start), fb = str(r && r.finish);
  if (!sb && !fb) return { min: 0, err: "" };
  if (!sb || !fb) return { min: 0, err: "missing" };
  const s = timeMin(sb), f = timeMin(fb);
  if (s == null || f == null) return { min: 0, err: "time" };
  if (f <= s) return { min: 0, err: "order" };
  const m = f - s - (+r.unpaidBreakMin || 0);
  return m < 0 ? { min: 0, err: "break" } : { min: m, err: "" };
}
// One employee's days (any months) → each day split into regular and overtime,
// and each Monday-to-Sunday week with the rule that applied. All in whole minutes.
// Under the weekly rule each day keeps its own over-8 hours as OT and the rest of
// the week's overage lands on the last days worked.
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
// What the owner should look at on a day. lv "bad": not counted; "warn": check it.
export function dayFlags(r, d) {
  const out = [];
  if (!r || !d) return out;
  if (d.err === "order") out.push({ k: "order", lv: "bad", msg: "Finish is before Start, so this day isn't counted." });
  if (d.err === "time") out.push({ k: "time", lv: "bad", msg: "Start or Finish isn't a time we can read, so this day isn't counted." });
  if (d.err === "missing") out.push({ k: "missing", lv: "bad", msg: "Only one of Start and Finish is filled in, so this day isn't counted." });
  if (d.min > LONG_SHIFT_H * 60) out.push({ k: "long", lv: "warn", msg: "The shift is over " + LONG_SHIFT_H + " hours." });
  if (LEAVE.test(r.notes || "") && (str(r.start) || str(r.finish))) out.push({ k: "leave", lv: "warn", msg: "Times are filled in on a day marked sick, stat or vacation." });
  return out;
}
// Checks for the day editor. ok:false blocks saving; warn is shown but allowed.
export function checkTimes(start, finish) {
  const s = str(start), f = str(finish);
  if (!s && !f) return { ok: true, min: 0, msg: "", warn: "" };
  if (!s || !f) return { ok: false, min: 0, msg: "Fill in both Start and Finish, or leave both empty.", warn: "" };
  const sh = shift({ start: s, finish: f });
  if (sh.err === "order") return { ok: false, min: 0, msg: "Finish has to be after Start.", warn: "" };
  if (sh.err) return { ok: false, min: 0, msg: "Use times like 8:00 AM.", warn: "" };
  return { ok: true, min: sh.min, msg: "", warn: sh.min > LONG_SHIFT_H * 60 ? "That's over " + LONG_SHIFT_H + " hours. Double-check the times." : "" };
}
// Gross pay. payFor(date) → {wage, otRate} or null.
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

// ── pay periods and approvals ──
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
// Periods holding any of the dates, plus the one holding `today`; newest first.
export function periodList(dates, kind, anchor, today) {
  const m = new Map();
  [...(dates || []), today].filter(Boolean).forEach((iso) => { const p = periodOf(iso, kind, anchor); m.set(p.start, p); });
  return [...m.values()].sort((a, b) => cmp(b.start, a.start));
}
// The approved pay period covering this employee's date, if any.
export const lockedBy = (periods, emp, date) => (periods || []).find((p) => p && String(p.emp) === String(emp) && date >= p.start && date <= p.end) || null;

// ── who may change a day ──
// The first day an employee may still fill in or change: the first of last
// month. Mirrors public.ts_floor() in migration 0013.
export const editFloor = (today) => addMonths(today.slice(0, 7), -1) + "-01";

// role: "employee" (their own days), "owner" (anyone's), "staff" (look only).
// Nobody fills in a day that hasn't happened yet. Employees can't go back
// before editFloor, and an approved pay period locks its days for them; the
// owner can still correct any of those.
export function dayAccess({ date, today, locked, role }) {
  if (date > today) return { can: false, why: "future" };
  if (role !== "owner" && role !== "employee") return { can: false, why: "staff" };
  if (role === "employee" && date < editFloor(today)) return { can: false, why: "old" };
  if (locked && role !== "owner") return { can: false, why: "locked" };
  return { can: true, why: locked ? "locked" : "" };
}

// ── saving a day ──
// The record the editor saves. In the cloud the database stamps the times and
// keeps the history itself (a trigger in 0011), so history is kept here only for
// the local, no-backend mode.
export function nextEntry(prev, vals, { emp, date, by = "", now = new Date().toISOString(), keepHistory = false } = {}) {
  const v = { start: str(vals.start), finish: str(vals.finish), notes: str(vals.notes) };
  const changed = !prev || prev.start !== v.start || prev.finish !== v.finish || (prev.notes || "") !== v.notes;
  const history = (prev && prev.history) || [];
  return {
    ...(prev || {}),
    id: entryId(emp, date), emp, date, ...v,
    createdAt: (prev && prev.createdAt) || now,
    updatedAt: changed ? now : (prev && prev.updatedAt) || now,
    by: changed ? by : (prev && prev.by) || by,
    history: keepHistory && prev && changed ? [...history, { at: prev.updatedAt || prev.createdAt || "", by: prev.by || "", start: prev.start || "", finish: prev.finish || "", notes: prev.notes || "" }] : history,
  };
}
// A day with times or a note. A cleared day stays as an empty row so its history is kept.
export const isFilled = (e) => !!(e && (str(e.start) || str(e.finish) || str(e.notes)));
// Filled in after the day, or changed since: the owner sees a marker and the old versions.
export const enteredLate = (e) => !!(e && e.createdAt && e.date && shopToday(new Date(e.createdAt)) > e.date);
export const wasEdited = (e) => !!(e && ((e.history || []).length > 0 || enteredLate(e)));
