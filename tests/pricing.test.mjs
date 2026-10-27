// Price suggestions from the shop's own sales (src/lib/pricing.js). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Prc from "../src/lib/pricing.js";

test("needs two sales of the family", () => {
  assert.equal(Prc.priceSuggest([], 9000).enough, false);
  const one = Prc.priceSuggest([{ price: 20000, cost: 14000 }], 9000);
  assert.deepEqual([one.enough, one.why, one.floor], [false, "only 1 sale so far", 12900]);
});
test("the middle price, the average margin and how fast they sold", () => {
  const r = Prc.priceSuggest([{ price: 18000, cost: 12000, days: 20 }, { price: 22000, cost: 15000, days: 40 }, { price: 21000, cost: 0, days: null }], 9000);
  assert.deepEqual([r.n, r.median, r.low, r.high, r.margin, r.days, r.suggest], [3, 21000, 18000, 22000, 33, 30, 21000]);
  assert.match(r.why, /middle/);
});
test("never below a 30% margin on this engine's own cost", () => {
  const r = Prc.priceSuggest([{ price: 12000 }, { price: 13000 }], 11000);
  assert.equal(r.median, 12500);
  assert.equal(r.suggest, 15750);   // 11,000 ÷ 0.7 = 15,714 → 15,750
  assert.match(r.why, /less than a 30% margin/);
});
