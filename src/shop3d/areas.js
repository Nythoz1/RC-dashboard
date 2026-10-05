// The shop plan, taken from the shop's floor plan sketch (about 4 px to the foot, so Bay 1 is
// about 21 × 40 ft). Units are feet: x runs east along the lot, z runs south from the lot's
// north-west corner. scene.js draws the 3D shop from this; the dashboard uses it to say where
// an engine is. No three.js in here, so the dashboard can import it without the 3D chunk.
export const LOT = { w: 150, d: 96 };
export const BLDG = { x0: 37.5, x1: 104, z0: 36, z1: 95.5 };

// kind: Outside / Shop floor / Front. store: engines can be kept here (they get spots below).
export const SHOP_AREAS = [
  { id: "takeoutW", name: "Take-out inventory", sub: "West", kind: "Outside", store: true, x0: 1.5, x1: 41.5, z0: 2.5, z1: 33.5, h: 7, dot: "#8a7558",
    blurb: "Used engines pulled from trucks. They sit on pallets until they sell as take-outs or go in for reman.", items: ["Forklift lane down the middle"] },
  { id: "takeoutE", name: "Take-out inventory", sub: "East", kind: "Outside", store: true, x0: 107, x1: 147.5, z0: 2, z1: 31, h: 7, dot: "#8a7558",
    blurb: "The second take-out pad, across the truck yard from the first.", items: ["Forklift lane down the middle"] },
  { id: "reman", name: "Reman inventory", kind: "Outside", store: true, x0: 106, x1: 147.5, z0: 34, z1: 94.5, h: 17, dot: "#3f7d4a",
    blurb: "Finished remanufactured engines, painted and ready to ship anywhere in Canada.", items: ["Canopy overhead (shown with Roofs)", "Aisle down the middle for the forklift"] },
  { id: "yard", name: "Truck yard", kind: "Outside", store: true, x0: 43, x1: 105, z0: 1, z1: 34.5, h: 6, dot: "#5a6470",
    blurb: "Trucks wait here, then pull into Bay 1 through the overhead door. Engines going out on a truck can be staged here.", items: ["A truck waiting for Bay 1, rolling coal", "Concrete apron at the overhead door"] },
  { id: "parking", name: "Parking", kind: "Outside", x0: 0.5, x1: 36.5, z0: 35, z1: 95.5, h: 6, dot: "#5a6470",
    blurb: "Customer and staff parking. The gate opens onto the street.", items: ["The shop pickup and a customer's car", "Gate to the street", "The forklift lives here"] },
  { id: "bay1", name: "Bay 1", kind: "Shop floor", store: true, x0: 47.5, x1: 68.5, z0: 37, z1: 77.5, h: 21, dot: "#d4581a",
    blurb: "The service bay. Trucks come in through the overhead door for engine swaps and repairs.", items: ["A truck in for an engine swap, hood up", "Engine hoist beside the truck", "Overhead door to the truck yard"] },
  { id: "reman1", name: "Reman 1", kind: "Shop floor", store: true, x0: 72, x1: 92, z0: 55, z1: 62.75, h: 9, dot: "#b44810",
    blurb: "Rebuild station one: the engine stand, a bench and the tools for the job.", items: ["Engine stand", "Workbench with a vise"] },
  { id: "reman2", name: "Reman 2", kind: "Shop floor", store: true, x0: 72, x1: 92, z0: 65.25, z1: 73.5, h: 9, dot: "#b44810",
    blurb: "Rebuild station two, right beside the first.", items: ["Engine stand", "Workbench with a vise"] },
  { id: "cleaning", name: "Part cleaning", kind: "Shop floor", x0: 73, x1: 103.3, z0: 36.7, z1: 52, h: 11, dot: "#3a6ea5",
    blurb: "Parts washer and hot tank. Every part gets cleaned before it's measured.", items: ["Parts washer", "Hot tank", "Drying rack with cylinder heads"] },
  { id: "tools", name: "Tools", kind: "Shop floor", x0: 95.5, x1: 103.3, z0: 52.5, z1: 76, h: 9, dot: "#c4282a",
    blurb: "Tool chests and the specialty tools for every engine family.", items: ["4 rolling tool chests", "Specialty tools for every engine family"] },
  { id: "parts", name: "Parts inventory", kind: "Shop floor", x0: 38.2, x1: 46.5, z0: 37, z1: 72.5, h: 14, dot: "#2f5f9c",
    blurb: "Shelving for gaskets, injectors, bearings and rebuild kits.", items: ["4 runs of shelving down the west wall"] },
  { id: "office", name: "Office", kind: "Front", x0: 37.8, x1: 61.25, z0: 83.25, z1: 95.2, h: 12, dot: "#6c7380",
    blurb: "Quotes, invoices and the phone: 1-587-863-0505.", items: ["Two desks", "Filing cabinets"] },
  { id: "lobby", name: "Lobby", kind: "Front", x0: 61.25, x1: 87.5, z0: 83.25, z1: 95.2, h: 12, dot: "#6c7380",
    blurb: "The customer counter and a place to sit. The front door opens to the street.", items: ["Service counter", "Seating for customers", "Front door to the street"] },
  { id: "bathroom", name: "Bathroom", kind: "Front", x0: 87.5, x1: 103.7, z0: 83.25, z1: 95.2, h: 12, dot: "#6c7380",
    blurb: "Washroom off the lobby.", items: ["Toilet and sink"] },
];
SHOP_AREAS.forEach((a) => { a.cx = (a.x0 + a.x1) / 2; a.cz = (a.z0 + a.z1) / 2; a.w = a.x1 - a.x0; a.d = a.z1 - a.z0; a.title = a.name + (a.sub ? " · " + a.sub : ""); });
export const AREA_BY_ID = Object.fromEntries(SHOP_AREAS.map((a) => [a.id, a]));
export const areaTitle = (id) => (AREA_BY_ID[id] ? AREA_BY_ID[id].title : "");
export const PLACE_GROUPS = [
  ["Outside", ["takeoutW", "takeoutE", "reman", "yard", "parking"]],
  ["Shop floor", ["bay1", "reman1", "reman2", "cleaning", "tools", "parts"]],
  ["Front", ["office", "lobby", "bathroom"]],
];
export const PLACE_ORDER = PLACE_GROUPS.flatMap((g) => g[1]);
// Where an engine can be kept, in the order the location picker lists them.
export const STORE_IDS = ["takeoutW", "takeoutE", "reman", "yard", "bay1", "reman1", "reman2"];

// Engine spots on each storage area: pallets in rows with a forklift lane, the stand at each
// reman station (stand:true, the engine sits on it without a pallet), and a strip beside the
// truck in Bay 1. ry turns the pallet.
const range = (a, b, step) => { const out = []; for (let v = a; v < b; v += step) out.push(Math.round(v * 100) / 100); return out; };
const rows = (xs, zs, ry = 0) => zs.flatMap((z) => xs.map((x) => ({ x, z, ry })));
export const SLOTS = {
  takeoutW: rows(range(5, 38.6, 6.6), [6.5, 11.5, 23.5, 28.5]),
  takeoutE: rows(range(110.5, 144.2, 6.6), [6, 11, 21, 26]),
  reman: [110.5, 117.3, 136.2, 143].flatMap((x) => range(38.5, 92, 6.4).map((z) => ({ x, z, ry: 0 }))),
  yard: rows(range(74, 101, 6.6), [21.5, 27.5]),
  bay1: range(42, 77, 6.4).map((z) => ({ x: 50.4, z, ry: Math.PI / 2 })),
  reman1: [{ x: 78.3, z: 58.8, ry: 0, stand: true }, { x: 88, z: 61.2, ry: 0 }],
  reman2: [{ x: 78.3, z: 69.3, ry: 0, stand: true }, { x: 88, z: 71.7, ry: 0 }],
};
export const SLOT_CAP = Object.fromEntries(Object.entries(SLOTS).map(([k, v]) => [k, v.length]));

// Where each engine is: its own `loc` when that names a storage area, otherwise its lifecycle
// stage decides. In reman now → the Reman 1 stand, then Reman 2, then Bay 1. Went through reman
// in the shop → reman inventory. Cores and runners → take-out inventory, West first, East once
// West is full. Sold engines leave the map unless someone gave them a spot (waiting for pickup).
// Returns Map(engine id → area id). `status(i)` and `remanned(i)` come from the dashboard.
export function shopLocs(engines, { status, remanned }) {
  const out = new Map();
  const used = {};
  const take = (id) => { used[id] = (used[id] || 0) + 1; return id; };
  const list = [...engines].sort((a, b) => String(a.sku || a.name || "").localeCompare(String(b.sku || b.name || ""), undefined, { numeric: true }) || String(a.id).localeCompare(String(b.id)));
  list.forEach((i) => { if (i.loc && STORE_IDS.includes(i.loc)) out.set(i.id, take(i.loc)); });
  list.forEach((i) => {
    if (out.has(i.id)) return;
    const st = status(i);
    if (st === "sold") return;
    if (st === "in-reman") { out.set(i.id, take((used.reman1 || 0) < 1 ? "reman1" : (used.reman2 || 0) < 1 ? "reman2" : "bay1")); return; }
    if (st !== "core" && remanned(i)) { out.set(i.id, take("reman")); return; }
    out.set(i.id, take((used.takeoutW || 0) < SLOT_CAP.takeoutW ? "takeoutW" : "takeoutE"));
  });
  return out;
}
