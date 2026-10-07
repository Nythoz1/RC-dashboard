// ─────────────────────────────────────────────────────────────
// Team logins client — the owner gives employees their logins from the Team tab.
// Calls the team-logins Edge Function with the signed-in user's token (same auth
// pattern as lib/brief.js); the function only answers the owner's login.
// ─────────────────────────────────────────────────────────────
import { supabase } from "./storage";

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const FN_URL = BASE ? BASE + "/functions/v1/team-logins" : "";
export const canManageLogins = !!FN_URL && !!supabase;

async function call(body) {
  if (!canManageLogins) return { error: "Logins need the cloud setup." };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { error: "Not signed in" };
    const r = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(ANON ? { apikey: ANON } : {}), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 404) return { error: "The team-logins function isn't deployed yet (SETUP.md, step 2)." };
    if (!r.ok) return { ...d, error: d.error || "HTTP " + r.status };
    return d;
  } catch (e) {
    return { error: "Couldn't reach the team-logins function. Is it deployed? (" + (e && e.message ? e.message : e) + ")" };
  }
}

export const listLogins = () => call({ action: "list" });
export const createLogin = ({ employeeId, email, password, role }) => call({ action: "create", employeeId, email, password, role });
export const setLoginPassword = (userId, password) => call({ action: "password", userId, password });
export const setLoginAccess = (userId, role, employeeId) => call({ action: "access", userId, role, employeeId });
export const removeLogin = (userId) => call({ action: "remove", userId });

// A temporary password that's easy to read out or text: "Coal-4821-Torque-Valve".
// 64 words, three of them, plus four digits: about 2.4 billion combinations.
const WORDS = ["Coal", "Torque", "Piston", "Turbo", "Diesel", "Cam", "Crank", "Valve", "Injector", "Bearing", "Gasket", "Block",
  "Rail", "Boost", "Idle", "Shop", "Wrench", "Socket", "Ratchet", "Spanner", "Hammer", "Chisel", "Clamp", "Bolt",
  "Nut", "Washer", "Spring", "Shaft", "Gear", "Clutch", "Axle", "Hub", "Brake", "Rotor", "Drum", "Filter",
  "Pump", "Nozzle", "Sleeve", "Liner", "Ring", "Rod", "Head", "Pan", "Cooler", "Radiator", "Hose", "Belt",
  "Pulley", "Starter", "Battery", "Cable", "Gauge", "Throttle", "Exhaust", "Intake", "Manifold", "Tappet", "Pushrod", "Lifter",
  "Flywheel", "Housing", "Bracket", "Governor"];
export function makePassword() {
  const r = new Uint32Array(4);
  crypto.getRandomValues(r);
  const w = (n) => WORDS[n % WORDS.length];
  return w(r[0]) + "-" + String(1000 + (r[1] % 9000)) + "-" + w(r[2]) + "-" + w(r[3] >>> 8);
}
