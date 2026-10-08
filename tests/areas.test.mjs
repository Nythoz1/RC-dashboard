// Engine spots in the shop plan (src/shop3d/areas.js): an engine put in a spot keeps it, the
// first to claim a spot wins, the rest fill the free spots in order, and engines past an area's
// spots aren't placed. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeEngines, SLOT_CAP } from "../src/shop3d/areas.js";

test("an engine put in a spot keeps it; the rest fill the free spots in order", () => {
  const p = placeEngines([{ id: 1, area: "reman" }, { id: 2, area: "reman", spot: 0 }, { id: 3, area: "reman", spot: "4" }, { id: 4, area: "reman" }]);
  assert.deepEqual(p.get(2), { area: "reman", k: 0 });
  assert.deepEqual(p.get(3), { area: "reman", k: 4 });   // a spot saved as text still counts
  assert.deepEqual(p.get(1), { area: "reman", k: 1 });
  assert.deepEqual(p.get(4), { area: "reman", k: 2 });
});

test("two engines claiming one spot: the first keeps it; a spot past the end is ignored", () => {
  const p = placeEngines([{ id: 1, area: "reman1", spot: 0 }, { id: 2, area: "reman1", spot: 0 }, { id: 3, area: "yard", spot: 99 }]);
  assert.deepEqual(p.get(1), { area: "reman1", k: 0 });
  assert.equal(p.has(2), false);                          // Reman 1 has one stand
  assert.deepEqual(p.get(3), { area: "yard", k: 0 });
});

test("the carport holds 21; more are listed, not placed", () => {
  assert.equal(SLOT_CAP.reman, 21);
  const p = placeEngines(Array.from({ length: 23 }, (_, i) => ({ id: i + 1, area: "reman" })));
  assert.equal([...p.values()].length, 21);
});
