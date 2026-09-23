// ─────────────────────────────────────────────────────────────
// Bill of materials, per engine family.
//
// Transcribed from Rollin Coal's own paper form:
//   "ISX15 CM2350 — LONG BLOCK — REV 5.0", two pages:
//
//   Page 1, LONG BLOCK PARTS ORDER — kind:"order". Every line is new every
//     time: no inspection, no ticking, no waiting on teardown. It is ordered
//     the day the job opens. A line not going on this job gets struck out.
//   Page 2, LONG BLOCK DECISION SHEET — kind:"decide". Each line is ticked
//     REUSE (measured, in spec, the number written down), MISS (not there when
//     it was opened — a complete core was paid for, so that is money back) or
//     MACH (out to the machine shop). Nothing ticked means it gets replaced.
//
// Anything past the long block — turbo, EGR, fuel system, ECM, harness,
// starter, alternator, air compressor — is out of scope: the buyer picks
// their own. That is why those parts are not on either page.
//
// Line ids are stable and blocked by page (841xx order, 842xx decisions) so
// lines can be added without renumbering — a saved worksheet references these
// ids. Runtime-added lines use Date.now(). Qty is as written on the form:
// a number, "set", or blank where the form gives none.
// ─────────────────────────────────────────────────────────────

const ORDER = "Parts order — always new";
const DECIDE = "Decision sheet";

export const BOM_SEED = [
  {
    id: 80001,
    label: "Cummins ISX15 / X15 · CM2350 · Long Block",
    family: "ISX15",
    model: "CM2350",
    rev: "5.0",
    // Match tokens, compared against the engine's normalized name. [] = every engine.
    // "X15" is the token on purpose: it catches both the older ISX15 and the
    // 2017+ X15, which is the same 15L family and the same CM2350-era ECM. It
    // does NOT catch the CM870/871 ISX — clone this worksheet for those.
    match: ["X15"],
    note: "Long block only · order the day the job opens",
    rule: "REUSE = you measured it, it is in spec, the number is written down. Nothing ticked means it gets replaced. MISS = it was not there when you opened it — you paid for a complete core, so tick it either way, that is money back. MACH = goes out to the machine shop.",
    watch: "Anything past the long block — turbo, EGR, fuel system, ECM, harness, starter, alternator, air compressor — is not our scope: the buyer picks their own.",
    lines: [
      // PAGE 1 — LONG BLOCK PARTS ORDER · always new, ordered the day the job opens
      { id: 84101, sec: ORDER, kind: "order", qty: "set", part: "Cylinder head bolts" },
      { id: 84102, sec: ORDER, kind: "order", qty: "1", part: "Full gasket kit — upper" },
      { id: 84103, sec: ORDER, kind: "order", qty: "1", part: "Full gasket kit — lower" },
      { id: 84104, sec: ORDER, kind: "order", qty: "1", part: "Head gasket + grommets" },
      { id: 84105, sec: ORDER, kind: "order", qty: "6", part: "Injector o-rings + seals" },
      { id: 84106, sec: ORDER, kind: "order", qty: "6", part: "Pistons, rings, pins, pin retainers" },
      { id: 84107, sec: ORDER, kind: "order", qty: "6", part: "Liners + o-rings / crevice seals" },
      { id: 84108, sec: ORDER, kind: "order", qty: "set", part: "Main bearings" },
      { id: 84109, sec: ORDER, kind: "order", qty: "set", part: "Rod bearings" },
      { id: 84110, sec: ORDER, kind: "order", qty: "set", part: "Thrust washers" },
      { id: 84111, sec: ORDER, kind: "order", qty: "1", part: "Front crank seal + wear sleeve" },
      { id: 84112, sec: ORDER, kind: "order", qty: "1", part: "Rear main seal + wear sleeve" },
      { id: 84113, sec: ORDER, kind: "order", qty: "1", part: "Pilot bearing" },
      { id: 84114, sec: ORDER, kind: "order", qty: "2", part: "Thermostats + seals" },
      { id: 84115, sec: ORDER, kind: "order", qty: "set", part: "Exhaust manifold gaskets + studs / nuts" },
      { id: 84116, sec: ORDER, kind: "order", qty: "2", part: "Oil filters — full flow + bypass" },
      { id: 84117, sec: ORDER, kind: "order", qty: "2", part: "Fuel filters — primary + secondary" },
      { id: 84118, sec: ORDER, kind: "order", qty: "1", part: "Coolant filter" },
      { id: 84119, sec: ORDER, kind: "order", qty: "set", part: "Belts" },
      { id: 84120, sec: ORDER, kind: "order", qty: "1", part: "Air compressor gasket + drive coupling" },

      // PAGE 2 — LONG BLOCK DECISION SHEET · REUSE / MISS / MACH, blank = replace
      { id: 84201, sec: DECIDE, kind: "decide", qty: "", part: "Block", note: "bore / counterbore", mach: 1 },
      { id: 84202, sec: DECIDE, kind: "decide", qty: "", part: "Cylinder head", note: "deck / crack test", mach: 1 },
      { id: 84203, sec: DECIDE, kind: "decide", qty: "", part: "Crankshaft", note: "journals / mag", mach: 1 },
      { id: 84204, sec: DECIDE, kind: "decide", qty: "", part: "Connecting rods", note: "bend + twist", mach: 1 },
      { id: 84205, sec: DECIDE, kind: "decide", qty: "", part: "Flywheel", note: "face / resurface", mach: 1 },
      { id: 84206, sec: DECIDE, kind: "decide", qty: "", part: "Flywheel housing", note: "bore + face runout" },
      { id: 84207, sec: DECIDE, kind: "decide", qty: "", part: "Ring gear", note: "teeth" },
      { id: 84208, sec: DECIDE, kind: "decide", qty: "", part: "Camshaft — single OHC", note: "lobe lift, every lobe" },
      { id: 84209, sec: DECIDE, kind: "decide", qty: "12", part: "Cam followers / rollers", note: "pin play / flat spots" },
      { id: 84210, sec: DECIDE, kind: "decide", qty: "12", part: "Valve crossheads", note: "wear cup" },
      { id: 84211, sec: DECIDE, kind: "decide", qty: "", part: "Rocker arm shaft", note: "scoring / oil holes" },
      { id: 84212, sec: DECIDE, kind: "decide", qty: "", part: "Rocker arm bushings", note: "press out + in" },
      { id: 84213, sec: DECIDE, kind: "decide", qty: "", part: "Connecting rod bushings", note: "pin fit" },
      { id: 84214, sec: DECIDE, kind: "decide", qty: "6", part: "Piston cooling nozzles", note: "flow + aim" },
      { id: 84215, sec: DECIDE, kind: "decide", qty: "", part: "Front housing + covers", note: "cracks / bores" },
      { id: 84216, sec: DECIDE, kind: "decide", qty: "", part: "Idler gears + bushings", note: "backlash" },
      { id: 84217, sec: DECIDE, kind: "decide", qty: "", part: "Oil pump", note: "gear clearance" },
      { id: 84218, sec: DECIDE, kind: "decide", qty: "", part: "Oil pan", note: "rail straight" },
      { id: 84219, sec: DECIDE, kind: "decide", qty: "", part: "Oil cooler", note: "pressure test" },
      { id: 84220, sec: DECIDE, kind: "decide", qty: "", part: "Water pump", note: "bearing / weep hole" },
      { id: 84221, sec: DECIDE, kind: "decide", qty: "", part: "Vibration damper", note: "dents / runout" },
      { id: 84222, sec: DECIDE, kind: "decide", qty: "", part: "Exhaust manifold", note: "cracks / warp" },
      { id: 84223, sec: DECIDE, kind: "decide", qty: "6", part: "Injectors — XPI", note: "flow test" },
      { id: 84224, sec: DECIDE, kind: "decide", qty: "", part: "Connecting rod bolts", note: "STRETCH — measure" },
      { id: 84225, sec: DECIDE, kind: "decide", qty: "", part: "Main cap bolts", note: "STRETCH — measure" },
      { id: 84226, sec: DECIDE, kind: "decide", qty: "", part: "Flywheel bolts", note: "STRETCH — measure" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Where to buy. Each vendor has a search URL with a {q} placeholder; the BOM
// builds the query from the part name plus the engine family, so one tap goes
// straight to that part at that supplier.
//
// Sites whose own search URL format is not stable are searched through Google
// scoped to the vendor's domain — that never rots. When you find the right
// part, paste the direct link and the part number onto the BOM line and it
// becomes a one-tap reorder from then on. Edit any of these in Inventory → BOM.
// ─────────────────────────────────────────────────────────────
const g = (site) => "https://www.google.com/search?q=site%3A" + site + "+{q}";

export const VENDOR_SEED = [
  { id: 83001, name: "Cummins Parts", site: "parts.cummins.com", search: g("parts.cummins.com"), note: "Genuine + ReCon, CPL-matched" },
  { id: 83002, name: "Interstate McBee", site: "interstate-mcbee.com", search: g("interstate-mcbee.com"), note: "Aftermarket Cummins, kits" },
  { id: 83003, name: "PAI Industries", site: "paiindustries.com", search: g("paiindustries.com"), note: "HD aftermarket, gaskets + hard parts" },
  { id: 83004, name: "Highway & Heavy Parts", site: "highwayandheavyparts.com", search: g("highwayandheavyparts.com"), note: "Overhaul kits, ships to Canada" },
  { id: 83005, name: "FleetPride", site: "fleetpride.com", search: g("fleetpride.com"), note: "Broad HD catalogue" },
  { id: 83006, name: "Diesel Parts Direct", site: "dieselpartsdirect.com", search: g("dieselpartsdirect.com"), note: "Turbos, pumps, injectors" },
  { id: 83007, name: "eBay", site: "ebay.ca", search: "https://www.ebay.ca/sch/i.html?_nkw={q}", note: "Used + NOS, core hunting" },
  { id: 83008, name: "Amazon", site: "amazon.ca", search: "https://www.amazon.ca/s?k={q}", note: "Filters, sensors, consumables" },
  { id: 83009, name: "Google Shopping", site: "google.com", search: "https://www.google.com/search?tbm=shop&q={q}", note: "Price check across everyone" },
];
