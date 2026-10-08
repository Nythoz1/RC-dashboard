// Engine SKUs: RC-<brand><family><year>-<counter>, e.g. RC-CUISX2021-001.
//   brand   two letters from the make (BRAND_CODES; XX when it's unknown)
//   family  the engine family, short: the size digits come off (ISX15 → ISX, DD15 → DD, C15 → C),
//           an all-number family stays (3406), a few get a short name (Series 60 → S60, Series 50 → S50;
//           the 2017+ X15 keeps its name, X15, so it reads apart from the older ISX)
//   year    four digits, 0000 when there's no year on file
//   counter three digits, counted per prefix and never reused: a new engine gets one more than the
//           highest number that prefix has had, so an SKU on old paperwork never points at another engine.
// The dashboard works out each engine's make and family (engMake, FAMILIES); this file only builds
// and numbers the SKUs. Tested in tests/sku.test.mjs.

export const BRAND_CODES = {
  Caterpillar: "CA", Cummins: "CU", "Detroit Diesel": "DE", International: "IN", Paccar: "PA", "Mercedes-Benz": "MB",
  Mack: "MA", Volvo: "VO", "John Deere": "JD", Ford: "FO", Duramax: "DM", Hino: "HI", Isuzu: "IS",
  Deutz: "DZ", Yanmar: "YA", Perkins: "PE", Kubota: "KU",
};
const SPECIAL = { X15: "X15", SERIES60: "S60", "60SERIES": "S60", SERIES50: "S50", "50SERIES": "S50", MAXXFORCE13: "MF", MAXXFORCE11: "MF", MAXXFORCEDT: "MFDT", FORD67: "PS", GM65: "GM", VED12: "VED" };

export const brandCode = (make) => {
  const m = String(make || "").trim().toLowerCase();
  return (Object.entries(BRAND_CODES).find(([k]) => k.toLowerCase() === m) || [0, "XX"])[1];
};
export const shortFamily = (fam) => {
  const f = String(fam || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!f) return "ENG";
  if (SPECIAL[f]) return SPECIAL[f];
  return (/^[A-Z]+\d+$/.test(f) ? f.replace(/\d+$/, "") : f).slice(0, 8);
};
export const skuYear = (y) => (/^(19|20)\d{2}$/.test(String(y == null ? "" : y).trim()) ? String(y).trim() : "0000");
export const skuPrefix = ({ make, family, year }) => "RC-" + brandCode(make) + shortFamily(family) + skuYear(year);

const RC = /^(RC-[A-Z0-9]+)-(\d{3,})$/;
const parts = (sku) => { const m = RC.exec(String(sku || "").trim().toUpperCase()); return m ? { prefix: m[1], n: +m[2] } : null; };
export const isRcSku = (sku) => !!parts(sku);

// Number items [{id, prefix}] in order: each gets prefix-NNN, one past the highest number that
// prefix has in `taken` (or 001), never an SKU already in `taken`. Returns Map(id → sku).
export function numberSkus(items, taken = []) {
  const used = new Set(taken.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean));
  const next = {};
  used.forEach((t) => { const p = parts(t); if (p) next[p.prefix] = Math.max(next[p.prefix] || 1, p.n + 1); });
  const out = new Map();
  for (const it of items) {
    let n = next[it.prefix] || 1, s;
    do { s = it.prefix + "-" + String(n).padStart(3, "0"); n++; } while (used.has(s));
    next[it.prefix] = n; used.add(s); out.set(it.id, s);
  }
  return out;
}

// Renumber every engine. An engine whose SKU already has its own prefix keeps it (the first one,
// if two share an SKU); the rest are numbered in `engines` order after what's kept and what other
// inventory (parts) already uses. `prefixOf(engine)` gives its prefix. Returns [{id, from, to}] for
// the engines whose SKU changes.
export function renumberPlan(engines, prefixOf, otherSkus = []) {
  const kept = new Set(), keep = new Set(), rest = [];
  engines.forEach((e) => {
    const p = parts(e.sku), pre = prefixOf(e), sku = String(e.sku || "").trim().toUpperCase();
    if (p && p.prefix === pre && !kept.has(sku)) { kept.add(sku); keep.add(e.id); } else rest.push({ id: e.id, prefix: pre });
  });
  const got = numberSkus(rest, [...otherSkus, ...kept]);
  return engines.filter((e) => !keep.has(e.id)).map((e) => ({ id: e.id, from: e.sku || "", to: got.get(e.id) }));
}
