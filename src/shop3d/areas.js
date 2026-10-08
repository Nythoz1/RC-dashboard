// The shop plan, measured off the satellite photo of the lot (about 4 px to the foot, using the
// 36 ft carport as the ruler) and laid out like the photo: the street along the bottom, the yard at
// the top. Units are feet: x runs right along the street (toward north, the compass says), z runs
// from the back fence (west) toward the street (east). scene.js draws the 3D shop from this; the
// dashboard uses it to say where an engine is and to draw the 2D map. No three.js in here, so the
// dashboard can import it without the 3D chunk.
export const LOT = { w: 74, d: 128 };
// The building (the white roof in the photo, about 43 × 65 ft), front wall on the street fence.
export const BLDG = { x0: 4, x1: 47, z0: 63, z1: 128 };

// kind: Outside / Shop floor / Front. store: engines can be kept here (they get spots below).
export const SHOP_AREAS = [
  { id: "takeoutW", name: "Take-out inventory", sub: "South fence", kind: "Outside", store: true, x0: 1.5, x1: 12.5, z0: 17, z1: 61.5, h: 7, dot: "#8a7558",
    blurb: "Used engines pulled from trucks, on pallets down the south fence until they sell as take-outs or go in for reman.", items: ["Two rows of pallets along the fence"] },
  { id: "takeoutE", name: "Take-out inventory", sub: "North fence", kind: "Outside", store: true, x0: 62, x1: 72.5, z0: 17, z1: 88, h: 7, dot: "#8a7558",
    blurb: "More take-outs on pallets down the north fence, from the yard to the carport.", items: ["One row of pallets along the fence"] },
  // The carport: exactly 36 ft long by 20 ft wide, beside the shop from the front fence back to
  // about halfway along the building. Most engines are kept here.
  { id: "reman", name: "Carport", sub: "Reman inventory", kind: "Outside", store: true, x0: 47.5, x1: 67.5, z0: 92, z1: 128, h: 15, dot: "#3f7d4a",
    blurb: "The covered carport beside the shop, 36 × 20 ft, from the front fence back to about halfway along the building. Most engines are kept here: finished remans first, then cores and runners while there's room.", items: ["Canopy overhead (shown with Roofs)", "Three rows of seven 4 × 6 ft spots, packed tight", "To reach a middle engine, the forklift pulls the ones in front of it"] },
  { id: "yard", name: "Truck yard", kind: "Outside", store: true, x0: 14, x1: 60, z0: 1.5, z1: 61.5, h: 6, dot: "#5a6470",
    blurb: "Behind the shop. Trucks come in the back gate and wait here, then pull into Bay 1 through the overhead door at the back of the shop. Engines going out on a truck can be staged here.", items: ["A truck waiting for Bay 1, rolling coal", "Gate to the back lane", "Concrete apron at the overhead door", "The forklift"] },
  { id: "bay1", name: "Bay 1", kind: "Shop floor", store: true, x0: 11, x1: 29, z0: 63.5, z1: 113.5, h: 21, dot: "#d4581a",
    blurb: "The service bay. Trucks back in from the yard through the overhead door for engine swaps and repairs.", items: ["A truck in for an engine swap, hood up", "Engine hoist in front of the truck", "Overhead door to the truck yard"] },
  { id: "reman1", name: "Reman 1", kind: "Shop floor", store: true, x0: 30, x1: 43, z0: 77.5, z1: 85.5, h: 9, dot: "#b44810",
    blurb: "Rebuild station one: the engine stand, a bench and the tools for the job.", items: ["Engine stand", "Workbench with a vise"] },
  { id: "reman2", name: "Reman 2", kind: "Shop floor", store: true, x0: 30, x1: 43, z0: 87, z1: 95, h: 9, dot: "#b44810",
    blurb: "Rebuild station two, right beside the first.", items: ["Engine stand", "Workbench with a vise"] },
  { id: "cleaning", name: "Part cleaning", kind: "Shop floor", x0: 30, x1: 46.5, z0: 63.5, z1: 76, h: 11, dot: "#3a6ea5",
    blurb: "Parts washer and hot tank. Every part gets cleaned before it's measured.", items: ["Parts washer", "Hot tank", "Drying rack with cylinder heads"] },
  { id: "tools", name: "Tools", kind: "Shop floor", x0: 43.5, x1: 46.5, z0: 77.5, z1: 113.5, h: 9, dot: "#c4282a",
    blurb: "Tool chests and the specialty tools for every engine family.", items: ["4 rolling tool chests", "Specialty tools for every engine family"] },
  { id: "parts", name: "Parts inventory", kind: "Shop floor", x0: 4.5, x1: 10, z0: 63.5, z1: 113.5, h: 14, dot: "#2f5f9c",
    blurb: "Shelving for gaskets, injectors, bearings and rebuild kits.", items: ["4 runs of shelving down the south wall"] },
  { id: "office", name: "Office", kind: "Front", x0: 4.3, x1: 19, z0: 114.5, z1: 127.7, h: 12, dot: "#6c7380",
    blurb: "Quotes, invoices and the phone: 1-587-863-0505.", items: ["Two desks", "Filing cabinets"] },
  { id: "lobby", name: "Lobby", kind: "Front", x0: 19, x1: 36, z0: 114.5, z1: 127.7, h: 12, dot: "#6c7380",
    blurb: "The customer counter and a place to sit. The front door opens to the street.", items: ["Service counter", "Seating for customers", "Front door to the street"] },
  { id: "bathroom", name: "Bathroom", kind: "Front", x0: 36, x1: 46.7, z0: 114.5, z1: 127.7, h: 12, dot: "#6c7380",
    blurb: "Washroom off the lobby.", items: ["Toilet and sink"] },
];
SHOP_AREAS.forEach((a) => { a.cx = (a.x0 + a.x1) / 2; a.cz = (a.z0 + a.z1) / 2; a.w = a.x1 - a.x0; a.d = a.z1 - a.z0; a.title = a.name + (a.sub ? " · " + a.sub : ""); });
export const AREA_BY_ID = Object.fromEntries(SHOP_AREAS.map((a) => [a.id, a]));
export const areaTitle = (id) => (AREA_BY_ID[id] ? AREA_BY_ID[id].title : "");
export const PLACE_GROUPS = [
  ["Outside", ["takeoutW", "takeoutE", "reman", "yard"]],
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
const CARPORT = SHOP_AREAS.find((a) => a.id === "reman");
// A spot's footprint in feet (across, along) before ry turns it: the carport's 6 × 4 ft spots, a pallet elsewhere.
export const SLOT_SIZE = { reman: [6, 4], default: [5, 3.6] };
const rows = (xs, zs, ry = 0) => zs.flatMap((z) => xs.map((x) => ({ x, z, ry })));
export const SLOTS = {
  takeoutW: [6.2, 10.4].flatMap((x) => range(20.5, 60, 5.4).map((z) => ({ x, z, ry: Math.PI / 2 }))),
  takeoutE: range(20.5, 86, 5.4).map((z) => ({ x: 67.25, z, ry: Math.PI / 2 })),
  // three rows of seven 4 × 6 ft spots (6 ft across, 4 ft along the carport, 1 ft between), packed tight
  reman: [CARPORT.x0 + 3.5, CARPORT.x0 + 10, CARPORT.x0 + 16.5].flatMap((x) => range(CARPORT.z0 + 3, CARPORT.z1 - 2, 5).map((z) => ({ x, z, ry: 0 }))),
  yard: rows(range(30, 57, 6.6), [21]),
  bay1: range(68, 111, 6.4).map((z) => ({ x: 13.9, z, ry: Math.PI / 2 })),
  reman1: [{ x: 33.6, z: 81.5, ry: 0, stand: true }],
  reman2: [{ x: 33.6, z: 91, ry: 0, stand: true }],
};
export const SLOT_CAP = Object.fromEntries(Object.entries(SLOTS).map(([k, v]) => [k, v.length]));

// Where each engine is: its own `loc` when that names a storage area, otherwise its lifecycle
// stage decides. In reman now → the Reman 1 stand, then Reman 2, then Bay 1. Went through reman
// in the shop → the carport. Cores and runners → the carport while it has room, then take-out
// inventory, the south fence first, the north fence once that's full. Sold engines leave the map unless someone gave them a spot (waiting for pickup).
// Returns Map(engine id → area id). `status(i)` and `remanned(i)` come from the dashboard.
export function shopLocs(engines, { status, remanned }) {
  const out = new Map();
  const used = {};
  const take = (id) => { used[id] = (used[id] || 0) + 1; return id; };
  const rest = [];
  const list = [...engines].sort((a, b) => String(a.sku || a.name || "").localeCompare(String(b.sku || b.name || ""), undefined, { numeric: true }) || String(a.id).localeCompare(String(b.id)));
  list.forEach((i) => { if (i.loc && STORE_IDS.includes(i.loc)) out.set(i.id, take(i.loc)); });
  list.forEach((i) => {
    if (out.has(i.id)) return;
    const st = status(i);
    if (st === "sold") return;
    if (st === "in-reman") { out.set(i.id, take((used.reman1 || 0) < 1 ? "reman1" : (used.reman2 || 0) < 1 ? "reman2" : "bay1")); return; }
    if (st !== "core" && remanned(i)) { out.set(i.id, take("reman")); return; }
    rest.push(i);
  });
  // finished remans got the carport first; the rest fill what's left of it, then take-out
  rest.forEach((i) => out.set(i.id, take((used.reman || 0) < SLOT_CAP.reman ? "reman" : (used.takeoutW || 0) < SLOT_CAP.takeoutW ? "takeoutW" : "takeoutE")));
  return out;
}
