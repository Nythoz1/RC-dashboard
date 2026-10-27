// ─────────────────────────────────────────────────────────────
// Price suggestions from the shop's own sales (imported as `Prc`; tested in tests/pricing.test.mjs).
//
// comps are earlier sales of the same engine family: {price, cost, days}, where `days` is how long
// it sat available before it sold (null when unknown). The suggestion is the middle price those
// sold for, but never under the price that keeps a 30% margin on this engine's own cost (cost ÷ 0.7),
// so a cheap comp can't talk the shop into selling at a loss. Two sales at least, or it says so.
// ─────────────────────────────────────────────────────────────
const median = (a) => { const v = [...a].sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; };
const to50 = (n) => Math.ceil(n / 50) * 50;
export const MIN_COMPS = 2;
export const marginFloor = (cost) => (+cost > 0 ? to50(+cost / 0.7) : 0);
export function priceSuggest(comps, cost) {
  const P = (comps || []).filter((c) => +c.price > 0);
  const floor = marginFloor(cost);
  const out = { n: P.length, enough: P.length >= MIN_COMPS, floor, median: 0, low: 0, high: 0, margin: null, days: null, suggest: 0, why: "" };
  if (!out.enough) { out.why = P.length ? "only " + P.length + " sale so far" : "no sales of this family yet"; return out; }
  const prices = P.map((c) => +c.price);
  out.median = Math.round(median(prices)); out.low = Math.min(...prices); out.high = Math.max(...prices);
  const M = P.filter((c) => +c.cost > 0).map((c) => (+c.price - +c.cost) / +c.price);
  out.margin = M.length ? Math.round(M.reduce((a, b) => a + b, 0) / M.length * 100) : null;
  const D = P.map((c) => c.days).filter((d) => d != null && isFinite(d) && d >= 0);
  out.days = D.length ? Math.round(median(D)) : null;
  const mid = to50(out.median);
  if (floor > mid) { out.suggest = floor; out.why = "your sales of this family went for less than a 30% margin on this engine's cost"; }
  else { out.suggest = mid; out.why = "the middle of what this family sold for"; }
  return out;
}
