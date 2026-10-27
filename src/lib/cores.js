// ─────────────────────────────────────────────────────────────
// Core returns, both ways (imported as `Cor`; tested in tests/cores.test.mjs, mirrored in the brief).
//
//   in   a customer owes us their old core: we hold their deposit until it arrives and passes
//        inspection (pending → received → inspected → accepted / rejected).
//   out  we owe a supplier a core: shipped back by the deadline, it earns the refund
//        (pending → sent → credited / rejected / lapsed). Miss the deadline and the refund is
//        gone, which can wipe out the engine's margin, so these are the ones that get alerts.
//
// Records saved before `dir` existed are "in". Dates are YYYY-MM-DD in shop time.
// ─────────────────────────────────────────────────────────────
export const CORE_STATUSES = {
  in: [["pending", "Waiting for the core"], ["received", "Received"], ["inspected", "Inspected"], ["accepted", "Accepted · deposit back"], ["rejected", "Rejected · deposit kept"], ["credited", "Credited"]],
  out: [["pending", "To ship back"], ["sent", "Shipped"], ["credited", "Refund received"], ["rejected", "Rejected by supplier"], ["lapsed", "Missed the deadline"]],
};
const CLOSED = { in: ["accepted", "rejected", "credited"], out: ["credited", "rejected", "lapsed"] };
export const coreDir = (c) => (c && c.dir === "out" ? "out" : "in");
export const coreOpen = (c) => !!c && !CLOSED[coreDir(c)].includes(c.status || "pending");
// The money on the core: the refund we're owed (out; the deposit field on an older record) or the deposit we hold (in).
export const coreValue = (c) => (coreDir(c) === "out" ? (+c.refund || +c.deposit || 0) : (+c.deposit || 0));
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
// Days from today to the deadline (negative once it's past); null without a deadline.
export const coreDaysLeft = (c, today) => (c && ISO.test(String(c.dueDate || "")) && ISO.test(String(today || "")) ? Math.round((dayMs(c.dueDate) - dayMs(today)) / 864e5) : null);
// A refund at risk: one we still have to ship, due within `days` (or already past).
export const coreAtRisk = (c, today, days = 7) => {
  if (coreDir(c) !== "out" || (c.status || "pending") !== "pending") return false;
  const n = coreDaysLeft(c, today);
  return n != null && n <= days;
};
// A customer's core that hasn't come in by its date.
export const coreLate = (c, today) => coreDir(c) === "in" && (c.status || "pending") === "pending" && (coreDaysLeft(c, today) ?? 1) < 0;
export const coreWhen = (c, today) => {
  const n = coreDaysLeft(c, today);
  if (n == null) return "";
  if (n === 0) return "due today";
  return n > 0 ? "due in " + n + " day" + (n === 1 ? "" : "s") : Math.abs(n) + " day" + (n === -1 ? "" : "s") + " past the deadline";
};
export function coreTotals(cores, today) {
  const C = (cores || []).filter(coreOpen);
  const out = C.filter((c) => coreDir(c) === "out"), inn = C.filter((c) => coreDir(c) === "in");
  const risk = out.filter((c) => coreAtRisk(c, today));
  return {
    refundsDue: out.reduce((a, c) => a + coreValue(c), 0), refundsOpen: out.length,
    atRisk: risk.length, atRiskUsd: risk.reduce((a, c) => a + coreValue(c), 0),
    depositsHeld: inn.reduce((a, c) => a + coreValue(c), 0), depositsOpen: inn.length,
    late: inn.filter((c) => coreLate(c, today)).length,
  };
}
