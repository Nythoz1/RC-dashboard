// ─────────────────────────────────────────────────────────────
// Service price list — what Rollin Coal does for customers and charges for.
//
// A STARTER LIST. The shop's own list and prices weren't reachable when this
// was written, so this is the typical line-up for a diesel engine sales,
// reman and heavy-duty service shop. Prices are deliberately left blank: the
// shop sets them in Sales → Services, and deletes or adds services there.
//
// pricing:
//   "flat"   — one price for the job (an engine swap, a head gasket). Overruns
//              are the shop's cost, which is exactly why the hours logged on
//              each job are tracked against what was charged.
//   "hourly" — hours logged × the shop labour rate (settings.shopRate).
// hours:      book / typical hours, optional. Estimates hourly work up front.
// withEngine: offered in the Sell Engine form ("what's going with this
//             engine?"). preTick: ticked there by default.
// active:     false hides a service from the pickers without deleting its
//             history.
//
// Ids are stable and blocked by category (851xx installs, 852xx overhauls…):
// work orders and invoice lines reference them. Services added in the app use
// Date.now().
// ─────────────────────────────────────────────────────────────

const INSTALL = "Engine sales & installs";
const OVERHAUL = "Overhauls & rebuilds";
const FUEL = "Fuel, air & exhaust";
const COOL = "Cooling & lubrication";
const DIAG = "Diagnostics & electronics";
const MAINT = "Maintenance & repair";

// Display order for the categories above; anything added later sorts after.
export const SERVICE_CATS = [INSTALL, OVERHAUL, FUEL, COOL, DIAG, MAINT];

export const SERVICE_SEED = [
  { id: 85101, cat: INSTALL, name: "Engine swap — install one of our engines", pricing: "flat", price: "", hours: "", withEngine: true, preTick: true,
    desc: "Remove the old engine, install ours, connect and fill everything, prime, start, set parameters and road test." },
  { id: 85102, cat: INSTALL, name: "Engine swap — customer-supplied engine", pricing: "flat", price: "", hours: "",
    desc: "The same remove-and-install with an engine the customer brings in." },
  { id: 85103, cat: INSTALL, name: "Engine removal only", pricing: "flat", price: "", hours: "",
    desc: "Pull the engine and set it on a stand or pallet. No install." },
  { id: 85104, cat: INSTALL, name: "Engine crating & shipping", pricing: "flat", price: "", hours: "", withEngine: true,
    desc: "Crate or palletize the engine and book freight anywhere in Canada." },

  { id: 85201, cat: OVERHAUL, name: "In-frame overhaul", pricing: "flat", price: "", hours: "",
    desc: "Liners, pistons, rings, bearings and gaskets with the engine still in the truck." },
  { id: 85202, cat: OVERHAUL, name: "Out-of-frame overhaul", pricing: "flat", price: "", hours: "",
    desc: "Engine out, torn down, machined as needed and rebuilt." },
  { id: 85203, cat: OVERHAUL, name: "Long block reman — customer's core", pricing: "flat", price: "", hours: "",
    desc: "Rebuild the customer's own long block to the shop's long block sheet." },
  { id: 85204, cat: OVERHAUL, name: "Cylinder head replacement", pricing: "flat", price: "", hours: "",
    desc: "Head off and on, new head gasket and bolts, overhead set." },
  { id: 85205, cat: OVERHAUL, name: "Head gasket replacement", pricing: "flat", price: "", hours: "",
    desc: "New head gasket and bolts, deck checked." },

  { id: 85301, cat: FUEL, name: "Injector replacement — full set", pricing: "flat", price: "", hours: "",
    desc: "Replace every injector with new seals and sleeves as needed, prime and test." },
  { id: 85302, cat: FUEL, name: "Turbocharger replacement", pricing: "flat", price: "", hours: "",
    desc: "Turbo, oil supply and drain lines, gaskets." },
  { id: 85303, cat: FUEL, name: "EGR cooler replacement", pricing: "flat", price: "", hours: "",
    desc: "EGR cooler and gaskets, cooling system pressure-tested." },
  { id: 85304, cat: FUEL, name: "Aftertreatment service — DPF, DOC, SCR", pricing: "hourly", price: "", hours: "",
    desc: "Clean or replace the DPF and DOC; diagnose and repair SCR and DEF faults." },
  { id: 85305, cat: FUEL, name: "Fuel system flush", pricing: "hourly", price: "", hours: "",
    desc: "After a pump failure: flush the tank, lines and rail, new filters." },

  { id: 85401, cat: COOL, name: "Oil cooler replacement", pricing: "flat", price: "", hours: "",
    desc: "Oil cooler and gaskets, cooling system pressure-tested." },
  { id: 85402, cat: COOL, name: "Water pump replacement", pricing: "flat", price: "", hours: "",
    desc: "Water pump and gasket, coolant refilled and bled." },
  { id: 85403, cat: COOL, name: "Rear main seal replacement", pricing: "flat", price: "", hours: "",
    desc: "Transmission and clutch out, new seal and wear sleeve." },
  { id: 85404, cat: COOL, name: "Front crank seal & damper", pricing: "flat", price: "", hours: "",
    desc: "New front seal and wear sleeve, vibration damper replaced." },

  { id: 85501, cat: DIAG, name: "Diagnostics & troubleshooting", pricing: "hourly", price: "", hours: "",
    desc: "Scan, test and find the fault. Billed by the hour." },
  { id: 85502, cat: DIAG, name: "ECM programming & parameters", pricing: "flat", price: "", hours: "",
    desc: "Update the calibration or change rating, road speed or idle parameters." },
  { id: 85503, cat: DIAG, name: "Overhead adjustment — valves & engine brake", pricing: "flat", price: "", hours: "",
    desc: "Set valve and engine brake lash to spec." },

  { id: 85601, cat: MAINT, name: "Preventive maintenance service", pricing: "flat", price: "", hours: "",
    desc: "Oil and filters, fluids, grease, and an inspection report." },
  { id: 85602, cat: MAINT, name: "General heavy-duty repair", pricing: "hourly", price: "", hours: "",
    desc: "Anything not on this list, billed by the hour." },
];
