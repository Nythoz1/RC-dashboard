// The engines the Engine Lab can show. Each loads on demand (its own chunk). `families` are the
// dashboard's FAMILIES keys that open this engine (labFor in RollinCoalDashboard.jsx reads them).
export const ENGINES = [
  { id: "isx15", label: "Cummins ISX15 / X15", families: ["ISX15", "X15", "ISX12", "ISX"], load: () => import("./isx15.js") },
  { id: "c15", label: "Caterpillar C15 (6NZ)", families: ["C15"], load: () => import("./c15.js") },
  { id: "dd15", label: "Detroit DD15", families: ["DD15", "DD13", "DD16"], load: () => import("./dd15.js") },
];
export const engineIdOf = (v) => (ENGINES.some((e) => e.id === v) ? v : "isx15");
