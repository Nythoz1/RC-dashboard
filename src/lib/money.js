// ─────────────────────────────────────────────────────────────
// Money: sales tax, due dates and what's overdue, expense frequency, the profit and loss and
// break-even. Plain functions, used by the dashboard (imported as `Mny`) and tests/money.test.mjs;
// supabase/functions/brief/index.ts mirrors the ones the Morning Brief needs, so change both.
// All dates are YYYY-MM-DD in Medicine Hat (shopToday), whatever the device's time zone.
// ─────────────────────────────────────────────────────────────
import { shopToday, addDaysISO, monthEnd, addMonths } from "./timesheet.js";

export const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const sum = (a, f) => (a || []).reduce((t, x) => t + (+f(x) || 0), 0);
const same = (a, b) => a != null && b != null && a !== "" && String(a) === String(b);

// ── Sales tax ──
// GST is 5% everywhere; the HST provinces charge one harmonized rate instead. An engine is taxed
// where it's delivered, so each invoice and quote keeps its own rate (`taxRate`, a fraction) taken
// from the customer's province and changeable on the form. Ones made before that are 5% GST.
export const HST = { ON: 0.13, NS: 0.14, NB: 0.15, NL: 0.15, PE: 0.15 };
const PROVS = [["AB", "alberta"], ["BC", "british columbia"], ["MB", "manitoba"], ["NB", "new brunswick"], ["NL", "newfoundland"], ["NS", "nova scotia"], ["NT", "northwest"], ["NU", "nunavut"], ["ON", "ontario"], ["PE", "prince edward"], ["QC", "quebec"], ["SK", "saskatchewan"], ["YT", "yukon"]];
const PROV_ABBR = { PEI: "PE", NFLD: "NL", NF: "NL", LAB: "NL", QUE: "QC", PQ: "QC", ONT: "ON", ALTA: "AB", ALB: "AB", SASK: "SK", MAN: "MB", NWT: "NT", YK: "YT", YUK: "YT" };
export function provCode(p) {
  const t = String(p || "").trim(); if (!t) return "";
  const up = t.toUpperCase().replace(/[.\s]/g, "");
  if (PROVS.some(([k]) => k === up)) return up;
  if (PROV_ABBR[up]) return PROV_ABBR[up];
  const low = t.toLowerCase(); const hit = PROVS.find(([, n]) => low.includes(n));
  return hit ? hit[0] : "";
}
export const taxForProv = (p) => HST[provCode(p)] || 0.05;
// For the customer form's province picker.
export const PROVINCE_NAMES = [["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"]];
export const provName = (p) => (PROVINCE_NAMES.find(([k]) => k === provCode(p)) || [0, ""])[1];
export const TAX_OPTS = [[0.05, "GST 5%"], [0.13, "HST 13% · Ontario"], [0.14, "HST 14% · Nova Scotia"], [0.15, "HST 15% · NB, NL, PEI"]];
export const taxRateOf = (x) => { const v = x && x.taxRate; return v === undefined || v === null || v === "" || !isFinite(+v) ? 0.05 : +v; };
export const taxName = (x) => (taxRateOf(x) === 0.05 ? "GST" : "HST") + " " + r2(taxRateOf(x) * 100) + "%";
// Lines are {d, q, r}; the subtotal and the tax are each rounded to the cent once.
export const linesSub = (items) => r2(sum(items, (i) => (+i.q || 0) * (+i.r || 0)));
export const docSub = (x) => linesSub(x && x.items);
export const docTax = (x) => r2(docSub(x) * taxRateOf(x));
export const docTotal = (x) => r2(docSub(x) + docTax(x));
// A line with an amount but no description would print as a blank line, so forms refuse it.
export const blankLines = (items) => (items || []).map((l, i) => (!String(l.d || "").trim() && (+l.q || 0) * (+l.r || 0) !== 0 ? i + 1 : 0)).filter(Boolean);
export const usedLines = (items) => (items || []).filter((l) => String(l.d || "").trim());

// ── Dates, due dates and overdue ──
// A record's date. Invoices made from a quote used to store "Oct 6" (no year); every record's id
// is the moment it was made (Date.now()), so the date comes from that instead.
export function docDate(x) {
  const d = String((x && x.date) || "");
  if (ISO.test(d)) return d;
  const t = +(x && x.id);
  return t > 1e12 ? shopToday(new Date(t)) : "";
}
// Payment terms to days: "Net 30" → 30, "Due on receipt" or "COD" → 0, anything else 30.
export function termsDays(t) {
  const s0 = String(t || ""); const m = s0.match(/\d+/);
  if (m) return +m[0];
  return /receipt|cod|cash|immediate|now|upon/i.test(s0) ? 0 : 30;
}
export const dueDateOf = (inv) => { if (!inv) return ""; if (ISO.test(String(inv.dueDate || ""))) return inv.dueDate; const d = docDate(inv); return d ? addDaysISO(d, termsDays(inv.due)) : ""; };
export const isPaid = (inv) => !!inv && inv.status === "paid";
// Overdue: still unpaid after its due date, or marked overdue by hand.
export const isOverdue = (inv, today = shopToday()) => !!inv && !isPaid(inv) && (inv.status === "overdue" || (!!dueDateOf(inv) && dueDateOf(inv) < today));
export const invStatus = (inv, today = shopToday()) => (isOverdue(inv, today) ? "overdue" : (inv && inv.status) || "pending");
const dayDiff = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
export const daysLate = (inv, today = shopToday()) => { const d = dueDateOf(inv); return d ? Math.max(0, dayDiff(d, today)) : 0; };
// Money owed, by how late it is.
export const AGING = [["current", "Not due yet"], ["1-30", "1 to 30 days late"], ["31-60", "31 to 60 days late"], ["61-90", "61 to 90 days late"], ["90+", "Over 90 days late"]];
export function agingBucket(inv, today = shopToday()) {
  if (!isOverdue(inv, today)) return "current";
  const n = daysLate(inv, today);
  return n <= 30 ? "1-30" : n <= 60 ? "31-60" : n <= 90 ? "61-90" : "90+";
}
export function aging(invoices, today = shopToday()) {
  const out = Object.fromEntries(AGING.map(([k]) => [k, { n: 0, v: 0 }]));
  (invoices || []).filter((v) => !isPaid(v)).forEach((v) => { const b = out[agingBucket(v, today)]; b.n++; b.v = r2(b.v + docTotal(v)); });
  return out;
}

// ── Expenses ──
// How often an expense is paid; the old free-text frequency is read the same way.
export const EXP_FREQS = [["monthly", "Monthly"], ["weekly", "Weekly"], ["biweekly", "Every 2 weeks"], ["quarterly", "Every 3 months"], ["yearly", "Yearly"], ["once", "One time"]];
export function freqKey(v) {
  const t = String(v || "").toLowerCase();
  if (/once|one.?time|single|one.?off/.test(t)) return "once";
  if (/bi.?week|2 ?week|two ?week|fortnight/.test(t)) return "biweekly";
  if (/week/.test(t)) return "weekly";
  if (/quarter|3 ?month|three ?month/.test(t)) return "quarterly";
  if (/year|annual/.test(t)) return "yearly";
  return "monthly";
}
export const freqLabel = (v) => (EXP_FREQS.find(([k]) => k === freqKey(v)) || EXP_FREQS[0])[1];
// What an expense costs a month. One-time expenses count in the month they were entered instead.
export function expMonthly(e) {
  const a = +(e && e.amount) || 0;
  switch (freqKey(e && e.freq)) {
    case "weekly": return a * 52 / 12;
    case "biweekly": return a * 26 / 12;
    case "quarterly": return a / 3;
    case "yearly": return a / 12;
    case "once": return 0;
    default: return a;
  }
}
export const overheadMonthly = (expenses) => r2(sum(expenses, expMonthly));
// Wages a month: each active Team member's weekly hours × pay rate, 52 weeks over 12 months.
export const payrollMonthly = (employees) => r2(sum((employees || []).filter((e) => !e.status || e.status === "active"), (e) => (+e.rate || 0) * (+e.hrs || 0) * 52 / 12));

// ── Periods ──
// A period is whole months, oldest first: {from: "2026-01", to: "2026-10"}.
export const monthsIn = (p) => { let n = 0; for (let m = p.from; m <= p.to; m = addMonths(m, 1)) n++; return n; };
export const inPeriod = (date, p) => !!date && date >= p.from + "-01" && date <= monthEnd(p.to);
export function periodFor(key, today = shopToday()) {
  const cur = today.slice(0, 7);
  if (key === "last") return { from: addMonths(cur, -1), to: addMonths(cur, -1) };
  if (key === "year") return { from: cur.slice(0, 4) + "-01", to: cur };
  if (key === "12") return { from: addMonths(cur, -11), to: cur };
  return { from: cur, to: cur };
}
export const PERIODS = [["month", "This month"], ["last", "Last month"], ["year", "This year"], ["12", "12 months"]];

// ── Sales ──
// A sale (the `wins` feed) happened on its shop date. Its engine: engineId on sales made since
// that was stored; older ones are matched by stock number.
export const winDate = (w) => (w && w.ts ? shopToday(new Date(w.ts)) : "");
export const sales = (s) => (s.wins || []).filter((w) => w.kind === "sale");
export function winEngine(s, w) {
  const E = s.inventory || [];
  if (w.engineId != null) return E.find((i) => same(i.id, w.engineId)) || null;
  return (w.sku && E.find((i) => i.sku === w.sku)) || null;
}
// Engines sold on an invoice show their money on that invoice; the rest only exist as the sale.
export function invoicedSale(s, w) {
  const e = winEngine(s, w);
  return !!e && (s.invoices || []).some((v) => same(v.engineId, e.id));
}
// What an engine sale cost: its cost basis at the sale, less the shop's own labour logged into it,
// which is already in payroll (counting both would charge those hours twice).
export const saleCost = (w) => Math.max(0, (+w.cost || 0) - (+w.labor || 0));
export const saleMargin = (w) => (+w.price || 0) - saleCost(w);

// ── Profit and loss for a period ──
//   revenue   invoices dated in the period, before tax, plus engines sold without an invoice
//   cogs      the engines sold in the period (saleCost)
//   freight   shipments sent in the period
//   overhead  expenses: the monthly amount × months in the period, one-time ones in their month
//   payroll   wages a month × months in the period (owner only on screen)
export function pnl(s, p) {
  const inv = (s.invoices || []).filter((v) => inPeriod(docDate(v), p));
  const W = sales(s).filter((w) => inPeriod(winDate(w), p));
  const direct = W.filter((w) => !invoicedSale(s, w));
  const invoiced = r2(sum(inv, docSub)), directSales = r2(sum(direct, (w) => w.price));
  const revenue = r2(invoiced + directSales);
  const taxCollected = r2(sum(inv, docTax));
  const unpaid = r2(sum(inv.filter((v) => !isPaid(v)), docTotal));
  const cogs = r2(sum(W, saleCost));
  const freight = r2(sum((s.shipments || []).filter((x) => inPeriod(x.shipDate || docDate(x), p)), (x) => x.freightCost));
  const months = monthsIn(p);
  const overhead = r2(overheadMonthly(s.expenses) * months + sum((s.expenses || []).filter((e) => freqKey(e.freq) === "once" && inPeriod(docDate(e), p)), (e) => e.amount));
  const payroll = r2(payrollMonthly(s.employees) * months);
  const gross = r2(revenue - cogs - freight);
  return { months, invoices: inv.length, invoiced, directSales, revenue, taxCollected, unpaid, engines: W.length, cogs, freight, gross, overhead, payroll, net: r2(gross - overhead - payroll) };
}

// ── Break-even for a month ──
// Fixed costs (overhead + payroll) against what the month earned after the engines' cost (gross).
// Engines needed: fixed costs ÷ the average margin per engine sold so far; sales needed: fixed costs
// ÷ the average margin per sales dollar (30% until there are sales with a cost).
export function breakEven(s, month) {
  const p = { from: month, to: month };
  const m = pnl(s, p);
  const fixed = r2(overheadMonthly(s.expenses) + payrollMonthly(s.employees) + sum((s.expenses || []).filter((e) => freqKey(e.freq) === "once" && inPeriod(docDate(e), p)), (e) => e.amount));
  const costed = sales(s).filter((w) => +w.cost > 0 && +w.price > 0);
  const perEngine = costed.length ? sum(costed, saleMargin) / costed.length : 0;
  const ratio = costed.length ? sum(costed, saleMargin) / sum(costed, (w) => w.price) : 0.3;
  return { fixed, earned: m.gross, cleared: fixed > 0 && m.gross >= fixed, perEngine: r2(perEngine), engines: perEngine > 0 ? Math.ceil(fixed / perEngine) : null, salesNeeded: ratio > 0 ? r2(fixed / ratio) : null };
}

// ── Customers ──
// What a customer has paid: their paid invoices, tax included.
export const custPaid = (s, id) => r2(sum((s.invoices || []).filter((v) => isPaid(v) && same(v.custId, id)), docTotal));
export const custOwes = (s, id) => r2(sum((s.invoices || []).filter((v) => !isPaid(v) && same(v.custId, id)), docTotal));
