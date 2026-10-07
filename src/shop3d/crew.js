// The crew in the 3D shop: where each Team member works, the 8-to-4 day, and the wage each of
// them earns every hour. No three.js in here, so the dashboard and tests/crew.test.mjs can use it
// without the 3D chunk. Units are feet, like areas.js; ry turns a person (0 faces south, toward
// the street; -π/2 faces west).
import { FULL_DAY, SHOP_TZ, timeMin, isWeekday } from "../lib/timesheet.js";

const P = Math.PI;
// act is what they do there (scene.js animates it): wrench, bench, wash, fetch, shelf, desk
// (sitting), counter, walk (back and forth to x2/z2). A spot with `stand` works on the engine on
// that reman stand; while the stand is empty they turn to the end of the bench (`alt`).
export const CREW_SPOTS = [
  { id: "reman1", area: "reman1", label: "Reman 1 · engine stand", x: 81.5, z: 58.8, ry: -P / 2, act: "wrench", stand: "reman1", alt: { x: 82.6, z: 57.3, ry: P / 2, act: "bench" } },
  { id: "reman2", area: "reman2", label: "Reman 2 · engine stand", x: 81.5, z: 69.3, ry: -P / 2, act: "wrench", stand: "reman2", alt: { x: 82.6, z: 67.8, ry: P / 2, act: "bench" } },
  { id: "truck", area: "bay1", label: "Bay 1 · under the hood", x: 63, z: 66, ry: -P / 2, act: "wrench" },
  { id: "bench1", area: "reman1", label: "Reman 1 · bench", x: 84.6, z: 59.4, ry: P, act: "bench" },
  { id: "bench2", area: "reman2", label: "Reman 2 · bench", x: 84.6, z: 69.6, ry: P, act: "bench" },
  { id: "front", area: "bay1", label: "Bay 1 · front of the truck", x: 57.5, z: 72.3, ry: P, act: "wrench" },
  { id: "tools", area: "tools", label: "Tools", x: 99.3, z: 60.5, ry: P / 2, act: "fetch" },
  { id: "washer", area: "cleaning", label: "Part cleaning · washer", x: 78, z: 43.8, ry: P, act: "wash" },
  { id: "parts", area: "parts", label: "Parts inventory", x: 45, z: 54.5, ry: -P / 2, act: "shelf" },
  { id: "desk1", area: "office", label: "Office · desk 1", x: 47.3, z: 88.2, ry: 0, act: "desk" },
  { id: "desk2", area: "office", label: "Office · desk 2", x: 55.3, z: 88.2, ry: 0, act: "desk" },
  { id: "counter", area: "lobby", label: "Lobby · counter", x: 75, z: 84.6, ry: 0, act: "counter" },
  { id: "yard", area: "yard", label: "Truck yard", x: 72, z: 31.2, x2: 100, z2: 31.2, ry: P / 2, act: "walk" },
  { id: "hotTank", area: "cleaning", label: "Part cleaning · hot tank", x: 86, z: 43.6, ry: P, act: "wash" },
  { id: "floor1", area: "bay1", label: "Bay 1 · engine strip", x: 53.4, z: 44.5, ry: -P / 2, act: "wrench" },
  { id: "floor2", area: "bay1", label: "Bay 1 · open floor", x: 65.5, z: 48, x2: 65.5, z2: 40, ry: P, act: "walk" },
];
export const SPOT_BY_ID = Object.fromEntries(CREW_SPOTS.map((p) => [p.id, p]));

// Who goes where when nobody picked a spot: the first free spot for their role, then any free
// spot on the shop floor, in this order.
const SHOP_FLOOR = ["reman1", "reman2", "truck", "bench1", "bench2", "front", "tools", "washer", "parts", "floor1", "floor2", "hotTank", "yard", "counter", "desk1", "desk2"];
const BY_ROLE = [
  [/office|admin|account|book|manag|owner|sales|recep|dispatch|clerk|secret|estimat|\bit\b|computer/i, ["desk1", "desk2", "counter"]],
  [/parts|stock|inventor|shipp|receiv|counter/i, ["parts", "counter"]],
  [/clean|wash|appren|helper|labou?r|shop ?hand|porter|detail/i, ["washer", "hotTank", "bench1", "bench2"]],
  [/yard|forklift|driver|haul|truck/i, ["yard", "floor2"]],
];
export const roleSpots = (role) => (BY_ROLE.find(([re]) => re.test(String(role || ""))) || [0, []])[1];

// Every active Team member with a spot: their own `station` when it's free, otherwise by role,
// otherwise the next free spot. People on leave aren't at work. More people than spots: the rest
// get spot null (listed, not drawn). Order is stable (by id), so nobody swaps places on a reload.
export function crewList(employees) {
  const active = (employees || []).filter((e) => e && e.status === "active").sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  const used = new Set(), out = new Map();
  const take = (e, id, how) => { used.add(id); out.set(e.id, { spot: SPOT_BY_ID[id], how }); };
  active.forEach((e) => { if (e.station && SPOT_BY_ID[e.station] && !used.has(e.station)) take(e, e.station, "picked"); });
  active.forEach((e) => {
    if (out.has(e.id)) return;
    const id = [...roleSpots(e.role), ...SHOP_FLOOR].find((k) => !used.has(k));
    if (id) take(e, id, "role"); else out.set(e.id, { spot: null, how: "" });
  });
  return active.map((e) => ({ id: e.id, name: e.name || "", short: e.nick || String(e.name || "").split(" ")[0] || "Crew", role: e.role || "", rate: +e.rate || 0, station: e.station || "", ...out.get(e.id) }));
}

// ── the day: 8:00 AM to 4:00 PM, Monday to Friday, in Medicine Hat ──
export const SHIFT = { start: timeMin(FULL_DAY.start), end: timeMin(FULL_DAY.finish) };
export const SHIFT_MIN = SHIFT.end - SHIFT.start;
// The date and the minute of the day in Medicine Hat, whatever the device's time zone.
export function shopClock(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
  return { date: p.year + "-" + p.month + "-" + p.day, min: (+p.hour % 24) * 60 + +p.minute + +p.second / 60 };
}
export const onShift = (date, min) => isWeekday(date) && min >= SHIFT.start && min < SHIFT.end;
// Minutes worked so far that day: 0 before 8:00, the whole 480 after 4:00, nothing on a weekend.
export const workedMin = (date, min) => (isWeekday(date) ? Math.max(0, Math.min(SHIFT_MIN, min - SHIFT.start)) : 0);
// The hours that finished after `from` and up to `to` (9:00 AM is the first, 4:00 PM the last):
// each one is an hour's wage paid out.
export function hoursDone(from, to) {
  const out = [];
  for (let h = SHIFT.start + 60; h <= SHIFT.end; h += 60) if (h > from && h <= to) out.push(h);
  return out;
}
// What the crew has earned so far today: each person's rate × the hours worked.
export const wagesSoFar = (crew, worked) => (crew || []).reduce((a, c) => a + (+c.rate || 0) * (worked / 60), 0);
// "Back at 8:00 AM" or "back Monday at 8:00 AM" when the crew isn't working.
export function backAt(date, min) {
  if (isWeekday(date) && min < SHIFT.start) return "back at 8:00 AM";
  const d = new Date(date + "T12:00:00Z").getUTCDay(); // 0 Sunday … 6 Saturday
  return d === 5 || d === 6 ? "back Monday at 8:00 AM" : "back tomorrow at 8:00 AM";
}
