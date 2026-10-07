// The crew in the 3D shop: who works where, the 8-to-4 day in Medicine Hat, and the wage each
// hour pays out. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/shop3d/crew.js";

const emp = (id, name, role, extra = {}) => ({ id, name, role, rate: 30, status: "active", ...extra });

test("everyone active gets a spot that suits their role; people on leave stay home", () => {
  const crew = C.crewList([
    emp(3, "Dana Office", "Office manager"),
    emp(1, "Mike Tech", "Diesel tech"),
    emp(2, "Al Apprentice", "Apprentice"),
    emp(4, "Pat Parts", "Parts"),
    emp(5, "Lee Leave", "Diesel tech", { status: "on-leave" }),
    emp(6, "Sam Tech", ""),
  ]);
  assert.deepEqual(crew.map((c) => [c.name, c.spot.id, c.how]), [
    ["Mike Tech", "reman1", "role"],
    ["Al Apprentice", "washer", "role"],
    ["Dana Office", "desk1", "role"],
    ["Pat Parts", "parts", "role"],
    ["Sam Tech", "reman2", "role"],
  ]);
  assert.equal(crew[0].short, "Mike");
});

test("a picked spot wins; a spot someone else already has falls back to the role", () => {
  const crew = C.crewList([emp(1, "Mike", "Tech", { station: "truck" }), emp(2, "Bob", "Tech", { station: "truck" }), emp(3, "Ann", "Tech", { station: "nowhere" })]);
  assert.deepEqual(crew.map((c) => [c.name, c.spot.id, c.how]), [["Mike", "truck", "picked"], ["Bob", "reman1", "role"], ["Ann", "reman2", "role"]]);
});

test("more people than spots: the rest are listed without a spot", () => {
  const many = Array.from({ length: C.CREW_SPOTS.length + 2 }, (_, i) => emp(i + 1, "P" + (i + 1), "Tech"));
  const crew = C.crewList(many);
  assert.equal(crew.filter((c) => c.spot).length, C.CREW_SPOTS.length);
  assert.equal(new Set(crew.filter((c) => c.spot).map((c) => c.spot.id)).size, C.CREW_SPOTS.length);
  assert.deepEqual(crew.slice(-2).map((c) => c.spot), [null, null]);
});

test("the day runs 8:00 AM to 4:00 PM on weekdays", () => {
  assert.deepEqual(C.SHIFT, { start: 480, end: 960 });
  const wed = "2026-10-07", sat = "2026-10-10";
  assert.equal(C.onShift(wed, 479.9), false);
  assert.equal(C.onShift(wed, 480), true);
  assert.equal(C.onShift(wed, 959.9), true);
  assert.equal(C.onShift(wed, 960), false);
  assert.equal(C.onShift(sat, 600), false);
  assert.equal(C.workedMin(wed, 300), 0);
  assert.equal(C.workedMin(wed, 630), 150);
  assert.equal(C.workedMin(wed, 1200), 480);
  assert.equal(C.workedMin(sat, 630), 0);
});

test("each hour that finishes pays out once: 9:00 AM through 4:00 PM", () => {
  assert.deepEqual(C.hoursDone(539, 541), [540]);
  assert.deepEqual(C.hoursDone(540, 541), []);
  assert.deepEqual(C.hoursDone(0, 2000), [540, 600, 660, 720, 780, 840, 900, 960]);
  const crew = [{ rate: 30 }, { rate: 25.5 }, { rate: 0 }];
  assert.equal(C.wagesSoFar(crew, 150), 138.75);
  assert.equal(C.wagesSoFar(crew, 480), 444);
});

test("the shop clock is Medicine Hat time, summer and winter", () => {
  assert.deepEqual(C.shopClock(new Date("2026-10-07T16:30:00Z")), { date: "2026-10-07", min: 630 });
  assert.deepEqual(C.shopClock(new Date("2026-12-01T15:00:00Z")), { date: "2026-12-01", min: 480 });
  assert.deepEqual(C.shopClock(new Date("2026-10-08T05:59:30Z")), { date: "2026-10-07", min: 1439.5 });
});

test("when the crew is off: back at 8, tomorrow, or Monday", () => {
  assert.equal(C.backAt("2026-10-07", 300), "back at 8:00 AM");
  assert.equal(C.backAt("2026-10-07", 1000), "back tomorrow at 8:00 AM");
  assert.equal(C.backAt("2026-10-09", 1000), "back Monday at 8:00 AM");
  assert.equal(C.backAt("2026-10-10", 600), "back Monday at 8:00 AM");
  assert.equal(C.backAt("2026-10-11", 600), "back tomorrow at 8:00 AM");
});
