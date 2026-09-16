// ─────────────────────────────────────────────────────────────
// Bill of materials / teardown worksheets, per engine family.
//
// Transcribed from Rollin Coal's own paper form:
//   "ISX15 PARTS & DISPOSITION WORKSHEET — CM2350 — REV 3.0"
// Every line on the paper form is a line here, in the same order, in the same
// 11 sections. The two "always replace" lists on page 3 of that form become
// the `tier` flag on each line:
//   tier 1 = no inspection, it gets ordered. The sheet pre-ticks these REPL.
//   tier 2 = replace unless it is measured, in spec, and the number is written
//            down. "It looked fine" is not a measurement.
//   tier 0 = inspect and decide.
// `mach:1` marks the parts that physically go out to the machine shop.
//
// Line ids are stable and blocked by section (811xx head, 812xx block, ...)
// so new lines can be added inside a section without renumbering — a saved
// worksheet references these ids. Runtime-added lines use Date.now().
// ─────────────────────────────────────────────────────────────

export const BOM_SEED = [
  {
    id: 80001,
    label: "Cummins ISX15 · CM2350",
    family: "ISX15",
    model: "CM2350",
    rev: "3.0",
    // Match tokens, compared against the engine's normalized name. [] = every engine.
    match: ["ISX15"],
    note: "Single overhead cam · XPI common rail · EGR + DPF + SCR/DEF",
    rule: "Tier 2 reuse is allowed only if the number is measured, in spec, and written on the measurement sheet. \"It looked fine\" is not a measurement. If nobody wrote a number, it gets replaced.",
    watch: "On a CM2350 specifically: the cam lobes, the 12 followers, the EGR cooler, the injector cups and the high-pressure fuel pump are the five that come back as warranty if they get waved through. Metal out of a failed HP pump goes everywhere — if you find it, the rail, lines and injectors all go.",
    lines: [
      // 1 — HEAD & OVERHEAD
      { id: 81101, sec: "Head & Overhead", qty: "1", part: "Cylinder head — machine", tier: 0, mach: 1 },
      { id: 81102, sec: "Head & Overhead", qty: "-", part: "Cylinder head bolts", tier: 1, note: "TTY" },
      { id: 81103, sec: "Head & Overhead", qty: "6", part: "Injectors — XPI", tier: 2, note: "Flow test or replace as a set" },
      { id: 81104, sec: "Head & Overhead", qty: "1", part: "Rocker arm shaft", tier: 0 },
      { id: 81105, sec: "Head & Overhead", qty: "-", part: "Rocker arm bushings", tier: 1 },
      { id: 81106, sec: "Head & Overhead", qty: "-", part: "Jake brake rebuild kit + bushings", tier: 0 },
      { id: 81107, sec: "Head & Overhead", qty: "1", part: "Full gasket kit — upper", tier: 1, note: "Every gasket + seal" },
      { id: 81108, sec: "Head & Overhead", qty: "6", part: "Injector cups / sleeves", tier: 1, note: "Leak path to oil/coolant" },
      { id: 81109, sec: "Head & Overhead", qty: "1", part: "Camshaft — single OHC", tier: 2, note: "Mic every lobe, record" },
      { id: 81110, sec: "Head & Overhead", qty: "12", part: "Cam followers / rocker rollers", tier: 2, note: "Pin play + flat spots" },
      { id: 81111, sec: "Head & Overhead", qty: "12", part: "Valve crossheads / bridges", tier: 2, note: "Wear cup, screw threads" },
      { id: 81112, sec: "Head & Overhead", qty: "1", part: "Valve cover + harness feedthrough seal", tier: 0 },
      { id: 81113, sec: "Head & Overhead", qty: "-", part: "Valve stem seals", tier: 1 },
      { id: 81114, sec: "Head & Overhead", qty: "-", part: "Head gasket + grommets", tier: 1, note: "Match to CPL" },
      { id: 81115, sec: "Head & Overhead", qty: "-", part: "Head expansion plugs", tier: 1 },
      { id: 81116, sec: "Head & Overhead", qty: "-", part: "Injector o-rings + seals", tier: 1 },

      // 2 — BLOCK & ROTATING ASSEMBLY
      { id: 81201, sec: "Block & Rotating Assembly", qty: "1", part: "Block", tier: 0, mach: 1 },
      { id: 81202, sec: "Block & Rotating Assembly", qty: "1", part: "Crank", tier: 2, mach: 1, note: "Mag, journal mic, fillet" },
      { id: 81203, sec: "Block & Rotating Assembly", qty: "6", part: "Connecting rod bushings", tier: 0 },
      { id: 81204, sec: "Block & Rotating Assembly", qty: "1", part: "Oil pan", tier: 0 },
      { id: 81205, sec: "Block & Rotating Assembly", qty: "1", part: "Oil dipstick + tube", tier: 0 },
      { id: 81206, sec: "Block & Rotating Assembly", qty: "1", part: "Full gasket kit — lower", tier: 1, note: "Every gasket + seal" },
      { id: 81207, sec: "Block & Rotating Assembly", qty: "6", part: "Pistons, rings, pins, pin retainers", tier: 1 },
      { id: 81208, sec: "Block & Rotating Assembly", qty: "6", part: "Liners + o-rings / crevice seals", tier: 1 },
      { id: 81209, sec: "Block & Rotating Assembly", qty: "6", part: "Connecting rods", tier: 2, mach: 1, note: "Mag, bend + twist, bore" },
      { id: 81210, sec: "Block & Rotating Assembly", qty: "12", part: "Rod bolts", tier: 1, note: "TTY" },
      { id: 81211, sec: "Block & Rotating Assembly", qty: "-", part: "Main cap bolts", tier: 1, note: "TTY" },
      { id: 81212, sec: "Block & Rotating Assembly", qty: "-", part: "Main + rod bearings, thrust washers", tier: 1, note: "Size after crank work" },
      { id: 81213, sec: "Block & Rotating Assembly", qty: "6", part: "Piston cooling nozzles", tier: 2, note: "Flow + aim on fixture" },
      { id: 81214, sec: "Block & Rotating Assembly", qty: "-", part: "Block cup / freeze / gallery plugs", tier: 1, note: "Rifle brushed first" },

      // 3 — FRONT END
      { id: 81301, sec: "Front End", qty: "1", part: "Front housing", tier: 0 },
      { id: 81302, sec: "Front End", qty: "2", part: "Front housing cover — upper + lower", tier: 0 },
      { id: 81303, sec: "Front End", qty: "1", part: "Front structure", tier: 0 },
      { id: 81304, sec: "Front End", qty: "1", part: "Front damper / vibration damper", tier: 1, note: "Cracks the new crank" },
      { id: 81305, sec: "Front End", qty: "1", part: "Front crank seal + wear sleeve", tier: 1, note: "Both pieces" },
      { id: 81306, sec: "Front End", qty: "-", part: "Idler gears + bushings", tier: 2, note: "Backlash on every mesh" },
      { id: 81307, sec: "Front End", qty: "-", part: "Damper / crank pulley bolts", tier: 1, note: "TTY" },
      { id: 81308, sec: "Front End", qty: "-", part: "Belt tensioner, idler pulleys, belts", tier: 1, note: "Belts always replaced" },

      // 4 — REAR END
      { id: 81401, sec: "Rear End", qty: "1", part: "Flywheel", tier: 2, mach: 1, note: "Face wear, resurface limit" },
      { id: 81402, sec: "Rear End", qty: "1", part: "Flywheel housing", tier: 2, note: "Bore + face runout, SAE" },
      { id: 81403, sec: "Rear End", qty: "-", part: "Flywheel bolts", tier: 1, note: "TTY" },
      { id: 81404, sec: "Rear End", qty: "1", part: "Rear main seal + wear sleeve", tier: 1, note: "Both pieces" },
      { id: 81405, sec: "Rear End", qty: "1", part: "Ring gear", tier: 2, note: "Chipped / rolled teeth" },
      { id: 81406, sec: "Rear End", qty: "1", part: "Pilot bearing", tier: 1 },

      // 5 — LUBRICATION
      { id: 81501, sec: "Lubrication", qty: "1", part: "Oil pump", tier: 2, note: "Gear clearance, housing" },
      { id: 81502, sec: "Lubrication", qty: "1", part: "Oil cooler", tier: 1, note: "Warranty condition" },
      { id: 81503, sec: "Lubrication", qty: "-", part: "Oil filters — full flow + bypass", tier: 1 },
      { id: 81504, sec: "Lubrication", qty: "1", part: "Oil suction tube + screen + o-ring", tier: 0 },
      { id: 81505, sec: "Lubrication", qty: "1", part: "CCV / crankcase breather element", tier: 1 },

      // 6 — COOLING
      { id: 81601, sec: "Cooling", qty: "1", part: "Water pump", tier: 1 },
      { id: 81602, sec: "Cooling", qty: "2", part: "Thermostats", tier: 1 },
      { id: 81603, sec: "Cooling", qty: "-", part: "Thermostat seals + housing", tier: 1 },
      { id: 81604, sec: "Cooling", qty: "1", part: "Coolant filter head + filter", tier: 1 },
      { id: 81605, sec: "Cooling", qty: "1", part: "Fan hub / fan clutch", tier: 2, note: "Bearing play, engagement" },
      { id: 81606, sec: "Cooling", qty: "1", part: "Block heater element + cord", tier: 0 },

      // 7 — FUEL, XPI COMMON RAIL
      { id: 81701, sec: "Fuel — XPI Common Rail", qty: "1", part: "High-pressure fuel pump (XPI)", tier: 2, note: "Metal in fuel = flush it all" },
      { id: 81702, sec: "Fuel — XPI Common Rail", qty: "1", part: "Electric lift / transfer pump", tier: 0 },
      { id: 81703, sec: "Fuel — XPI Common Rail", qty: "-", part: "Fuel filters — primary + secondary", tier: 1 },
      { id: 81704, sec: "Fuel — XPI Common Rail", qty: "1", part: "Fuel rail + high-pressure lines", tier: 2, note: "Sealing cones, chafe, leaks" },
      { id: 81705, sec: "Fuel — XPI Common Rail", qty: "1", part: "Rail pressure sensor + relief valve", tier: 0 },
      { id: 81706, sec: "Fuel — XPI Common Rail", qty: "1", part: "Fuel filter head + shutoff valve", tier: 0 },

      // 8 — AIR / EXHAUST / EGR / AFTERTREATMENT
      { id: 81801, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "1", part: "Turbo", tier: 2, note: "Shaft play, vane stick" },
      { id: 81802, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "3", part: "Exhaust manifold", tier: 0 },
      { id: 81803, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "-", part: "Manifold gaskets + studs / nuts", tier: 1 },
      { id: 81804, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "1", part: "Turbo oil supply line + drain tube", tier: 1, note: "Coking kills new turbo" },
      { id: 81805, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "1", part: "EGR cooler", tier: 2, note: "PRESSURE TEST — top failure" },
      { id: 81806, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "1", part: "EGR valve + actuator", tier: 2, note: "Soot packing, shaft play" },
      { id: 81807, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "1", part: "Intake air heater element", tier: 0 },
      { id: 81808, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "-", part: "Charge air piping, boots, clamps", tier: 0 },
      { id: 81809, sec: "Air / Exhaust / EGR / Aftertreatment", qty: "-", part: "DPF / SCR / DEF — confirm scope on quote", tier: 0 },

      // 9 — ELECTRICAL
      { id: 81901, sec: "Electrical", qty: "1", part: "ECM — CM2350", tier: 0 },
      { id: 81902, sec: "Electrical", qty: "1", part: "Wiring harness", tier: 2, note: "Chafe, pins, ohm it out" },
      { id: 81903, sec: "Electrical", qty: "1", part: "Injector harness", tier: 2, note: "Chafe, pins, ohm it out" },
      { id: 81904, sec: "Electrical", qty: "1", part: "Cam sensor", tier: 0 },
      { id: 81905, sec: "Electrical", qty: "1", part: "Speed sensor", tier: 0 },
      { id: 81906, sec: "Electrical", qty: "1", part: "Starter", tier: 2, note: "Bench test" },
      { id: 81907, sec: "Electrical", qty: "1", part: "Alternator", tier: 2, note: "Bench test" },
      { id: 81908, sec: "Electrical", qty: "1", part: "Oil pressure sensor", tier: 0 },
      { id: 81909, sec: "Electrical", qty: "-", part: "Coolant temp + level sensors", tier: 0 },
      { id: 81910, sec: "Electrical", qty: "-", part: "Intake manifold pressure + temp sensors", tier: 0 },

      // 10 — ACCESSORIES
      { id: 82001, sec: "Accessories", qty: "1", part: "Air compressor", tier: 2, note: "Passing oil? Replace it" },
      { id: 82002, sec: "Accessories", qty: "1", part: "Air compressor gasket + drive coupling", tier: 0 },

      // 11 — MACHINE SHOP: what physically goes out the door
      { id: 82101, sec: "Machine Shop — What Goes Out", qty: "1", part: "Block", tier: 0, mach: 1 },
      { id: 82102, sec: "Machine Shop — What Goes Out", qty: "1", part: "Crank", tier: 0, mach: 1 },
      { id: 82103, sec: "Machine Shop — What Goes Out", qty: "1", part: "Cylinder head", tier: 0, mach: 1 },
      { id: 82104, sec: "Machine Shop — What Goes Out", qty: "6", part: "Connecting rods", tier: 0, mach: 1 },
      { id: 82105, sec: "Machine Shop — What Goes Out", qty: "1", part: "Flywheel", tier: 0, mach: 1 },
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
