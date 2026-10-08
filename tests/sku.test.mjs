// Engine SKUs (src/lib/sku.js): RC-<brand><family><year>-<counter>, counted per prefix, no
// duplicates, never reusing a number. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { skuPrefix, shortFamily, brandCode, numberSkus, renumberPlan } from "../src/lib/sku.js";

test("the prefix: brand code, short family, four-digit year (0000 when missing)", () => {
  assert.equal(skuPrefix({ make: "Cummins", family: "ISX15", year: 2021 }), "RC-CUISX2021");
  assert.equal(skuPrefix({ make: "Detroit Diesel", family: "DD15", year: "2019" }), "RC-DEDD2019");
  assert.equal(skuPrefix({ make: "Caterpillar", family: "3406", year: "" }), "RC-CA34060000");
  assert.equal(skuPrefix({ make: "", family: "", year: "97" }), "RC-XXENG0000");
  assert.equal(shortFamily("SERIES60"), "S60");
  assert.equal(shortFamily("C15"), "C");
  assert.equal(brandCode("mercedes-benz"), "MB");
});

test("numbers count per prefix, start after the highest number used, and skip what's taken", () => {
  const got = numberSkus([{ id: 1, prefix: "RC-CUISX2021" }, { id: 2, prefix: "RC-CUISX2021" }, { id: 3, prefix: "RC-DEDD2019" }], ["RC-CUISX2021-004", "INJ-77"]);
  assert.deepEqual([...got.values()], ["RC-CUISX2021-005", "RC-CUISX2021-006", "RC-DEDD2019-001"]);
});

test("renumbering keeps engines already in the right format, fixes duplicates, and changes the rest", () => {
  const pre = (e) => e.pre;
  const plan = renumberPlan([
    { id: 1, sku: "BH-001", pre: "RC-CUISX2021" },
    { id: 2, sku: "RC-CUISX2021-001", pre: "RC-CUISX2021" },   // already right: kept
    { id: 3, sku: "RC-CUISX2021-001", pre: "RC-CUISX2021" },   // duplicate: renumbered
    { id: 4, sku: "RC-CUISX2019-001", pre: "RC-CUISX2021" },   // year changed: renumbered
  ], pre, ["BH-001X"]);
  assert.deepEqual(plan.map((p) => [p.id, p.to]), [[1, "RC-CUISX2021-002"], [3, "RC-CUISX2021-003"], [4, "RC-CUISX2021-004"]]);
  const all = new Set(["RC-CUISX2021-001", ...plan.map((p) => p.to)]);
  assert.equal(all.size, 4);
});
