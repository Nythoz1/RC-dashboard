// The 3D shop: a game-style model of the shop and yard, drawn with three.js. The Shop 3D view
// loads this file on demand (dynamic import), so three.js stays out of the main bundle.
// createShop(host, opts) builds everything inside `host` and returns a small API the view drives
// (time of day, walls, roofs, labels, tour, forklift, selection, engines, the crew and their wage
// pops). Units are feet.
import * as THREE from "three";
import { LOT, BLDG as B, SHOP_AREAS, AREA_BY_ID, PLACE_ORDER, SLOTS } from "./areas.js";

const T = THREE;
const EXT_H = 18, INT_H = 10, WT = 0.6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const C = { grass: "#7ea957", asph: "#4b4e53", gravel: "#9c9486", conc: "#c3c0b8", wall: "#dcd8d0", wallIn: "#eeeae3", glass: "#5d7a92",
  steel: "#8d949b", dark: "#2b2c2f", chrome: "#c9ced3", wood: "#b48a55", yellow: "#efb81d", red: "#c4282a", blue: "#2f5f9c", orange: "#d4581a", white: "#f2f1ee", tire: "#1d1e20" };
// Paint by make: block, valve cover, accent
const MAKES = [
  [/cummins/i, { block: "#d8d0bf", cover: "#b0281f", acc: "#2b2b2b" }],
  [/detroit|mbe|mercedes/i, { block: "#3b434b", cover: "#a7b0b9", acc: "#c99a2e" }],
  [/cat\b|caterpillar/i, { block: "#dba418", cover: "#262626", acc: "#3a3a3a" }],
  [/paccar/i, { block: "#626a73", cover: "#2f5fa7", acc: "#cfd3d8" }],
  [/international|navistar|maxxforce|dt\s?466|t444/i, { block: "#2c4f7b", cover: "#c3c8ce", acc: "#1f1f1f" }],
  [/mack|volvo/i, { block: "#6e2427", cover: "#c4c4c4", acc: "#2a2a2a" }],
  [/deere/i, { block: "#3f7a3a", cover: "#e6c229", acc: "#222" }],
];
const PLAIN = { block: "#7b8187", cover: "#4b5157", acc: "#2a2a2a" };
const RUST = ["#6f5847", "#5f5f5c", "#7a6650", "#535b62", "#86735a", "#4e4a45", "#695140"];
const ST_COL = { core: "#7b8187", "in-reman": "#7b5cc4", available: "#2f8f4e", "on-hold": "#d39a1c", sold: "#c4282a" };
const SIZE = { hd: 1, mid: 0.86, sm: 0.66 };
const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function createShop(host, opts) {
  opts = opts || {};
  const call = (name, ...a) => { try { if (opts[name]) opts[name](...a); } catch (e) { console.error(e); } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let dead = false, raf = 0;
  // DOM: canvas, label layer, hover tip
  const canvas = document.createElement("canvas");
  canvas.className = "s3-canvas"; canvas.tabIndex = 0; canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "3D model of the shop and yard. Use the Places list to move between areas.");
  const lay = document.createElement("div"); lay.className = "s3-labels";
  const tip = document.createElement("div"); tip.className = "s3-tip"; tip.hidden = true;
  host.append(canvas, lay, tip);
  let R;
  try { R = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
  catch (e) { host.removeChild(canvas); host.removeChild(lay); host.removeChild(tip); call("onError", "This 3D view needs WebGL. Open the dashboard in a recent version of Chrome, Edge, Safari or Firefox."); return null; }
  // Plain sRGB-in, sRGB-out colours, so the hex values below look the way they read.
  T.ColorManagement.enabled = false; R.outputColorSpace = T.LinearSRGBColorSpace;
  const small = Math.min(innerWidth, innerHeight) < 700;
  R.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.5, 3000);
  const ANISO = R.capabilities.getMaxAnisotropy();

  // ── Building blocks
  const BOX = new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // bottom at y=0
  const CYL = new T.CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0);
  const CYLC = new T.CylinderGeometry(1, 1, 1, 14);
  const CYL8 = new T.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0);
  const ICO = new T.IcosahedronGeometry(1, 0);
  const CONE = new T.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
  const SPH = new T.SphereGeometry(1, 10, 8);
  const SHARED = [BOX, CYL, CYLC, CYL8, ICO, CONE, SPH];
  const MATS = new Map(), GLOWS = [];
  function mat(c, o) {
    o = o || {}; const r = o.r == null ? 0.85 : o.r, m = o.m || 0, op = o.o == null ? 1 : o.o, key = c + "|" + r + "|" + m + "|" + op + "|" + (o.e || "") + "|" + (o.ds ? 1 : 0);
    if (MATS.has(key)) return MATS.get(key);
    const M = new T.MeshStandardMaterial({ color: new T.Color(c), roughness: r, metalness: m, transparent: op < 1, opacity: op, side: o.ds ? T.DoubleSide : T.FrontSide });
    if (op < 1) M.depthWrite = false;
    if (o.e) { M.emissive = new T.Color(o.e); M.emissiveIntensity = 0; GLOWS.push({ m: M, k: o.ek || 1 }); }
    MATS.set(key, M); return M;
  }
  function mesh(geo, m, parent, x, y, z, sx, sy, sz) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
  const box = (p, w, h, d, m, x, y, z, ry) => { const o = mesh(BOX, m, p, x, y, z, w, h, d); if (ry) o.rotation.y = ry; return o; };
  const cylY = (p, r, h, m, x, y, z, geo) => mesh(geo || CYL, m, p, x, y, z, r, h, r);
  const cylX = (p, r, len, m, x, y, z) => { const o = mesh(CYLC, m, p, x, y, z, r, len, r); o.rotation.z = Math.PI / 2; return o; };
  const cylZ = (p, r, len, m, x, y, z) => { const o = mesh(CYLC, m, p, x, y, z, r, len, r); o.rotation.x = Math.PI / 2; return o; };
  const grp = (p, x, z, ry, y) => { const g = new T.Group(); g.position.set(x, y || 0, z); g.rotation.y = ry || 0; p.add(g); return g; };
  const PICK = [];
  // Everything static in a group becomes one mesh per material, so the scene stays fast on phones.
  function merged(src, area, into) {
    src.updateMatrixWorld(true); const by = new Map();
    src.traverse((o) => { if (o.isMesh) { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); } });
    const out = new T.Group();
    by.forEach((list, m) => {
      let n = 0; const parts = list.map((o) => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); n += g.attributes.position.count; return g; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
      parts.forEach((g) => { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; g.dispose(); });
      const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(nor, 3)); geo.computeBoundingSphere(); geo.computeBoundingBox();
      const me = new T.Mesh(geo, m); me.castShadow = list.some((o) => o.castShadow); me.receiveShadow = true;
      if (area) { me.userData.area = area; PICK.push(me); }
      out.add(me);
    });
    (into || scene).add(out); return out;
  }
  function ctex(wpx, hpx, draw, rep) { const c = document.createElement("canvas"); c.width = wpx; c.height = hpx; const g = c.getContext("2d"); draw(g, wpx, hpx); const t = new T.CanvasTexture(c); t.anisotropy = ANISO; if (rep) t.wrapS = t.wrapT = T.RepeatWrapping; t.userData = { c, draw }; return t; }
  let rnd = rng(20401);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  function speckle(g, x, y, w, h, n, cols, sz) { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const s = (sz || 1.4) * (0.5 + rnd()); g.fillRect(x + rnd() * w, y + rnd() * h, s, s); } }

  // ── Props
  function pallet(p) { const w = mat(C.wood, { r: 0.95 }); box(p, 5, 0.14, 3.6, w, 0, 0.32, 0); [-1.45, 0, 1.45].forEach((z) => box(p, 5, 0.32, 0.36, w, 0, 0, z)); }
  // An inline-six HD diesel, about 4.6 × 2.6 ft. kind: "reman" (painted, on a pallet), "take" (used,
  // on a pallet), "bare" (half built, on a stand), "inst" (installed in a truck).
  function engine(p, x, z, ry, kind, pal, y, r) {
    r = r || rnd; const e = grp(p, x, z, ry, y || 0); const take = kind === "take", bare = kind === "bare";
    const gloss = take ? { r: 0.95 } : { r: 0.42, m: 0.12 }; const bc = take ? RUST[Math.floor(r() * RUST.length)] : pal.block; const blk = mat(bc, gloss);
    let y0 = 0; if (kind === "reman" || take) { pallet(e); y0 = 0.46; }
    box(e, 3.3, 0.55, 1.3, mat(take ? "#3e3a35" : "#2e2f31", { r: 0.7 }), 0, y0, 0);
    box(e, 3.8, 1.5, 1.85, blk, 0, y0 + 0.55, 0);
    box(e, 3.65, 0.55, 1.6, blk, 0, y0 + 2.05, 0);
    const cover = !bare && !(take && r() < 0.35); if (cover) box(e, 3.45, 0.4, 1.2, mat(pal.cover, take ? { r: 0.9 } : { r: 0.35, m: 0.1 }), 0, y0 + 2.6, 0);
    cylX(e, 0.62, 0.28, mat(C.dark, { r: 0.6, m: 0.3 }), 2.04, y0 + 1.15, 0);
    cylX(e, 1.08, 0.32, mat(bc, gloss), -2.05, y0 + 1.2, 0);
    if (!bare) {
      box(e, 2.7, 0.32, 0.3, mat("#5b5550", { r: 0.8, m: 0.2 }), 0.2, y0 + 1.75, 1.05);
      cylZ(e, 0.42, 0.6, mat(take ? "#6a625b" : C.steel, { r: 0.5, m: 0.5 }), -0.7, y0 + 2.05, 1.35);
      box(e, 1.6, 0.5, 0.34, mat(pal.acc, { r: 0.6 }), 0.3, y0 + 1.9, -1.1);
    }
    e.userData.top = y0 + (cover ? 3.0 : 2.6);
    return e;
  }
  function semi(p, x, z, ry, col, o) {
    o = o || {}; const t = grp(p, x, z, ry); const paint = mat(col, { r: 0.35, m: 0.25 }), ch = mat(C.chrome, { r: 0.25, m: 0.85 }), dk = mat(C.dark, { r: 0.7 }), gl = mat("#22313d", { r: 0.15, m: 0.3 }), tire = mat(C.tire, { r: 0.9 });
    box(t, 22, 0.8, 2.8, dk, -1, 1.9, 0);
    [[7.6, 3.5], [-5.6, 3.3], [-9.6, 3.3]].forEach(([ax, zz]) => [-1, 1].forEach((s) => { cylZ(t, 1.7, 0.95, tire, ax, 1.7, s * zz); cylZ(t, 0.85, 1, mat(C.chrome, { r: 0.3, m: 0.8 }), ax, 1.7, s * (zz + 0.05)); }));
    box(t, 6, 6.2, 7.6, paint, 1.5, 3.3, 0);
    if (o.sleeper) box(t, 5, 6.8, 7.6, paint, -3.6, 3.3, 0);
    box(t, 0.12, 2.4, 6.8, gl, 4.52, 6.6, 0); [-1, 1].forEach((s) => box(t, 3.2, 2.2, 0.1, gl, 2.1, 6.6, s * 3.82));
    const hp = grp(t, 11.6, 0, 0, 3.6); box(hp, 7.2, 2.9, 6.2, paint, -3.6, 0, 0); if (o.open) hp.rotation.z = -1.05;
    box(t, 0.4, 2.7, 3.6, ch, 11.7, 3.8, 0); box(t, 0.6, 0.8, 8, ch, 12, 2.1, 0);
    [-1, 1].forEach((s) => { box(t, 3.8, 0.35, 1.3, paint, 7.6, 3.5, s * 3.45); cylX(t, 1.15, 4.4, ch, -0.9, 2.65, s * 3.6); cylY(t, 0.34, 9.6, ch, -0.95, 3.6, s * 3.9); });
    box(t, 3.2, 0.4, 4, dk, -7.6, 2.7, 0);
    if (o.stripe) [-1, 1].forEach((s) => box(t, 6.05, 0.5, 0.06, mat(o.stripe, { r: 0.5 }), 1.5, 5.2, s * 3.83));
    if (o.engine) engine(t, 8.2, 0, 0, "inst", o.engine, 2.6);
    t.userData.stacks = [[-0.95, 13.3, 3.9], [-0.95, 13.3, -3.9]]; return t;
  }
  function pickup(p, x, z, ry, col) { const t = grp(p, x, z, ry); const paint = mat(col, { r: 0.35, m: 0.3 }), gl = mat("#24313b", { r: 0.15, m: 0.3 }), tire = mat(C.tire, { r: 0.9 });
    box(t, 18, 2.4, 6.4, paint, 0, 1.5, 0); box(t, 6.4, 2.2, 6.1, paint, 1.2, 3.9, 0); box(t, 0.1, 1.6, 5.6, gl, 4.42, 4.25, 0); [-1, 1].forEach((s) => box(t, 4.6, 1.5, 0.1, gl, 1.2, 4.35, s * 3.06));
    box(t, 7, 0.1, 5.6, mat("#1a1b1d", { r: 0.8 }), -5.3, 3.85, 0);
    [5.8, -5.6].forEach((ax) => [-1, 1].forEach((s) => cylZ(t, 1.35, 0.8, tire, ax, 1.35, s * 3.1))); box(t, 0.5, 0.7, 6.6, mat(C.chrome, { r: 0.3, m: 0.8 }), 9.1, 1.6, 0); return t; }
  function car(p, x, z, ry, col) { const t = grp(p, x, z, ry); const paint = mat(col, { r: 0.3, m: 0.3 }), gl = mat("#24313b", { r: 0.15, m: 0.3 }), tire = mat(C.tire, { r: 0.9 });
    box(t, 14, 2, 5.8, paint, 0, 1.1, 0); box(t, 7, 1.9, 5.4, paint, -0.6, 3.1, 0); box(t, 7.1, 1.3, 5.5, gl, -0.6, 3.35, 0); [4.5, -4.6].forEach((ax) => [-1, 1].forEach((s) => cylZ(t, 1.1, 0.7, tire, ax, 1.1, s * 2.75))); return t; }
  function forklift(p, x, z, ry) { const t = grp(p, x, z, ry); const y = mat(C.yellow, { r: 0.5 }), dk = mat(C.dark, { r: 0.7 }), tire = mat(C.tire, { r: 0.9 }), st = mat("#3d4044", { r: 0.5, m: 0.5 });
    box(t, 5.4, 2.4, 3.8, y, -0.4, 0.9, 0); box(t, 1.6, 2.6, 3.8, dk, -3.4, 0.9, 0);
    [1.4, -2.2].forEach((ax) => [-1, 1].forEach((s) => cylZ(t, 0.9, 0.8, tire, ax, 0.9, s * 1.75)));
    [[-2.4, -1.5], [-2.4, 1.5], [1, -1.5], [1, 1.5]].forEach(([a, b]) => box(t, 0.18, 4.2, 0.18, dk, a, 3.3, b)); box(t, 3.8, 0.18, 3.4, dk, -0.7, 7.5, 0);
    box(t, 1.2, 0.9, 1.2, dk, -1, 3.3, 0); box(t, 0.2, 1.2, 1.2, dk, -1.6, 4.2, 0);
    [-1.1, 1.1].forEach((s) => box(t, 0.28, 8, 0.28, st, 2.75, 0.4, s)); box(t, 0.3, 0.3, 2.6, st, 2.8, 7.9, 0);
    [-0.75, 0.75].forEach((s) => box(t, 4, 0.16, 0.4, st, 4.7, 0.35, s)); box(t, 0.25, 2.2, 2.6, st, 2.95, 0.35, 0); return t; }
  function standFrame(p, x, z, ry) { const t = grp(p, x, z, ry); const r = mat(C.red, { r: 0.5 }); box(t, 0.3, 0.3, 3.6, r, -1.4, 0, 0); box(t, 3.4, 0.3, 0.3, r, 0, 0, -1.65); box(t, 3.4, 0.3, 0.3, r, 0, 0, 1.65); box(t, 0.35, 2.4, 0.35, r, -1.4, 0.3, 0); box(t, 0.5, 0.5, 0.5, r, -1.3, 2.6, 0); return t; }
  function hoist(p, x, z, ry) { const t = grp(p, x, z, ry); const r = mat(C.red, { r: 0.5 }); [-1.1, 1.1].forEach((s) => box(t, 6, 0.35, 0.35, r, 1.5, 0, s)); box(t, 0.45, 6.5, 0.45, r, -1.4, 0.3, 0);
    const b = box(t, 6.5, 0.4, 0.4, r, 1.2, 6.4, 0); b.rotation.z = -0.25; box(t, 0.06, 2.2, 0.06, mat(C.dark), 4.1, 3.9, 0); box(t, 0.4, 0.3, 0.4, mat(C.dark), 4.1, 3.7, 0); return t; }
  function bench(p, x, z, ry, len) { len = len || 6; const t = grp(p, x, z, ry); const w = mat("#9a7448", { r: 0.8 }), s = mat("#4b5157", { r: 0.6, m: 0.3 });
    box(t, len, 0.22, 2.4, w, 0, 3, 0); [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => box(t, 0.2, 3, 0.2, s, a * (len / 2 - 0.3), 0, b * 0.95)); box(t, len - 0.6, 0.12, 2, s, 0, 0.8, 0);
    box(t, 0.8, 0.5, 0.6, mat(C.dark, { r: 0.5, m: 0.4 }), len / 2 - 0.7, 3.22, -0.6);
    for (let i = 0; i < 3; i++) box(t, 0.3 + rnd() * 0.6, 0.2 + rnd() * 0.4, 0.3 + rnd() * 0.5, mat(pick(["#7b8187", "#c4282a", "#2f5f9c", "#3a3c40"]), { r: 0.6 }), -len / 2 + 1 + i * 1.3, 3.22, 0.2); return t; }
  function chest(p, x, z, ry, col) { const t = grp(p, x, z, ry); const c = mat(col || C.red, { r: 0.35, m: 0.2 }), dk = mat("#2a1b1b", { r: 0.6 }), ch = mat(C.chrome, { r: 0.3, m: 0.8 });
    box(t, 4.5, 3.3, 2, c, 0, 0.35, 0); box(t, 4.3, 1.7, 1.8, c, 0, 3.65, 0); cylZ(t, 0.25, 0.2, mat(C.tire), -1.9, 0.25, 0.8); cylZ(t, 0.25, 0.2, mat(C.tire), 1.9, 0.25, 0.8);
    for (let i = 0; i < 6; i++) { const yy = 0.6 + i * 0.48; box(t, 4.3, 0.04, 0.02, dk, 0, yy, 1.01); box(t, 1.4, 0.06, 0.05, ch, 0, yy + 0.2, 1.02); }
    for (let i = 0; i < 3; i++) { const yy = 3.85 + i * 0.48; box(t, 4.1, 0.04, 0.02, dk, 0, yy, 0.91); box(t, 1.2, 0.06, 0.05, ch, 0, yy + 0.2, 0.92); } return t; }
  function shelf(p, x, z, ry, len) { len = len || 8; const t = grp(p, x, z, ry); const up = mat(C.blue, { r: 0.5, m: 0.2 }), bm = mat(C.orange, { r: 0.5 }), dk = mat("#7d8287", { r: 0.7, m: 0.2 });
    [-len / 2, len / 2].forEach((a) => [-0.95, 0.95].forEach((b) => box(t, 0.22, 10, 0.22, up, a, 0, b)));
    [0.5, 3.2, 5.9, 8.6].forEach((yy) => { box(t, len, 0.25, 0.18, bm, 0, yy, -0.95); box(t, len, 0.25, 0.18, bm, 0, yy, 0.95); box(t, len, 0.08, 1.9, dk, 0, yy + 0.25, 0);
      let cx = -len / 2 + 0.3; while (cx < len / 2 - 0.8) { const bw = 0.9 + rnd() * 1.3, bh = 0.6 + rnd() * 1.3, bd = 1 + rnd() * 0.7; if (cx + bw > len / 2 - 0.2) break; box(t, bw, bh, bd, mat(pick(["#c49a63", "#b78a55", "#d1a86f", "#3a6ea5", "#c4282a"]), { r: 0.9 }), cx + bw / 2, yy + 0.33, 0); cx += bw + 0.15 + rnd() * 0.4; } });
    return t; }
  function drum(p, x, z, col) { cylY(p, 1, 3, mat(col || "#2d6aa6", { r: 0.45, m: 0.3 }), x, 0, z); }
  function washer(p, x, z, ry) { const t = grp(p, x, z, ry); box(t, 4.4, 3.2, 3, mat("#4f6f8f", { r: 0.45, m: 0.3 }), 0, 0, 0); const lid = box(t, 4.4, 0.18, 3, mat("#3c5670", { r: 0.4, m: 0.3 }), 0, 3.2, -1.5); lid.rotation.x = -1.1; box(t, 0.3, 1.8, 0.3, mat(C.dark), 1.8, 3.2, 1.2); return t; }
  function hotTank(p, x, z, ry) { const t = grp(p, x, z, ry); box(t, 6, 3.6, 4, mat("#8d949b", { r: 0.4, m: 0.6 }), 0, 0, 0); box(t, 1.2, 1, 0.2, mat(C.dark), -2, 2.4, 2.05); box(t, 0.3, 0.3, 0.06, mat("#c0392b", { e: "#ff3a1f", r: 0.5 }), -2.2, 2.9, 2.15); return t; }
  function desk(p, x, z, ry) { const t = grp(p, x, z, ry); const w = mat("#a87a4c", { r: 0.6 }); box(t, 5, 0.2, 2.5, w, 0, 2.5, 0); box(t, 0.15, 2.5, 2.4, w, -2.4, 0, 0); box(t, 1.6, 2.5, 2.4, w, 1.6, 0, 0);
    box(t, 1.9, 1.2, 0.12, mat(C.dark, { r: 0.3 }), -0.4, 3.05, -0.8); box(t, 0.2, 0.35, 0.2, mat(C.dark), -0.4, 2.7, -0.8); box(t, 1.4, 0.06, 0.5, mat("#3a3c40"), -0.4, 2.71, 0);
    const ch = grp(t, -0.3, 1.8, 0); box(ch, 1.7, 0.3, 1.7, mat("#2a2c30"), 0, 1, 0); box(ch, 1.7, 2, 0.25, mat("#2a2c30"), 0, 1.3, 0.75); cylY(ch, 0.12, 1, mat(C.steel), 0, 0, 0); return t; }
  function counter(p, x, z) { const t = grp(p, x, z, 0); box(t, 10, 3.5, 2.2, mat(C.orange, { r: 0.5 }), 0, 0, 0); box(t, 10.4, 0.2, 2.6, mat("#a87a4c", { r: 0.5 }), 0, 3.5, 0); box(t, 2.2, 3.5, 4.5, mat(C.orange, { r: 0.5 }), -5.1, 0, -1.2);
    box(t, 1.7, 1.1, 0.12, mat(C.dark, { r: 0.3 }), 1.5, 3.7, -0.4); return t; }
  function chair(p, x, z, ry, col) { const t = grp(p, x, z, ry); const c = mat(col || "#2f3b4a", { r: 0.7 }); box(t, 1.8, 0.35, 1.8, c, 0, 1.4, 0); box(t, 1.8, 1.9, 0.3, c, 0, 1.75, -0.75); [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]].forEach(([a, b]) => box(t, 0.12, 1.4, 0.12, mat(C.steel), a, 0, b)); return t; }
  function plant(p, x, z, s) { s = s || 1; cylY(p, 0.6 * s, 1.2 * s, mat("#8a5a3b"), x, 0, z, CYL8); mesh(ICO, mat("#4f8a3c", { r: 0.9 }), p, x, 1.2 * s + 1 * s, z, 1.1 * s, 1.3 * s, 1.1 * s); }
  function toilet(p, x, z, ry) { const t = grp(p, x, z, ry); const wm = mat(C.white, { r: 0.25 }); cylY(t, 0.7, 1.4, wm, 0, 0, 0); box(t, 1.6, 1.4, 0.7, wm, 0, 1.2, -0.85); return t; }
  function sink(p, x, z, ry) { const t = grp(p, x, z, ry); const wm = mat(C.white, { r: 0.25 }); box(t, 0.5, 2.6, 0.5, wm, 0, 0, 0); box(t, 1.8, 0.5, 1.4, wm, 0, 2.6, 0); box(t, 1.6, 2, 0.08, mat("#b9d3e6", { r: 0.05, m: 0.6 }), 0, 3.8, -0.7); return t; }
  function tree(p, x, z, kind, s) { s = s || 1; cylY(p, 0.45 * s, 3.2 * s, mat("#6b4b33", { r: 0.9 }), x, 0, z, CYL8);
    if (kind === "spruce") { const g = mat("#3f6e3e", { r: 0.9 }); [0, 1, 2].forEach((i) => mesh(CONE, g, p, x, 2.4 * s + i * 2.6 * s, z, (4.2 - i * 1.1) * s, 4.6 * s, (4.2 - i * 1.1) * s)); }
    else { const g = mat(pick(["#6a9a45", "#5f8f3f", "#78a64c"]), { r: 0.9 }); mesh(ICO, g, p, x, 6.2 * s, z, 4.2 * s, 4.6 * s, 4.2 * s); mesh(ICO, g, p, x + 1.6 * s, 5 * s, z + 0.8 * s, 2.8 * s, 3 * s, 2.8 * s); } }
  function bollard(p, x, z) { cylY(p, 0.35, 4, mat(C.yellow, { r: 0.5 }), x, 0, z, CYL8); }
  function pole(p, x, z, ry) { const t = grp(p, x, z, ry); cylY(t, 0.3, 22, mat("#6c7176", { r: 0.5, m: 0.5 }), 0, 0, 0, CYL8); box(t, 4, 0.3, 0.3, mat("#6c7176", { r: 0.5, m: 0.5 }), 2, 21.7, 0);
    box(t, 1.6, 0.45, 1, mat("#e9e3d2", { e: "#ffe2a8", ek: 2.2, r: 0.4 }), 3.6, 21.3, 0); return t; }
  const SIGNS = [];
  function signBoard(w, h, t1, t2) {
    const tex = ctex(1024, Math.round((1024 * h) / w), (g, W, H) => { g.fillStyle = "#17140f"; g.fillRect(0, 0, W, H); g.fillStyle = C.orange; g.fillRect(0, H - H * 0.12, W, H * 0.12);
      g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "800 " + Math.round(H * (t2 ? 0.5 : 0.62)) + "px 'Barlow Condensed','Arial Narrow',Arial"; g.fillText(t1, W / 2, H * (t2 ? 0.36 : 0.45));
      if (t2) { g.fillStyle = "#e7dfd3"; g.font = "600 " + Math.round(H * 0.17) + "px 'Barlow Condensed','Arial Narrow',Arial"; g.fillText(t2, W / 2, H * 0.72); } });
    SIGNS.push(tex); const side = mat(C.dark, { r: 0.6 }); const face = new T.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: new T.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0 }); GLOWS.push({ m: face, k: 0.55 });
    const o = new T.Mesh(BOX, [side, side, side, side, face, face]); o.scale.set(w, h, 0.3); o.castShadow = true; return o;
  }

  // ── Walls, kept separate so they can drop out of the way
  const WALLS = [], ROOF = [];
  const wallM = mat(C.wall, { r: 0.8 }), wallInM = mat(C.wallIn, { r: 0.9 }), glassM = mat(C.glass, { r: 0.1, m: 0.4, e: "#ffd9a0", ek: 0.9 });
  function wall(x0, z0, x1, z1, h, kind, nx, nz, base, m) {
    const w = Math.max(Math.abs(x1 - x0), WT), d = Math.max(Math.abs(z1 - z0), WT);
    const o = new T.Mesh(BOX, m || (kind === "ext" ? wallM : wallInM)); o.scale.set(w, h, d); o.position.set((x0 + x1) / 2, base || 0, (z0 + z1) / 2); o.castShadow = o.receiveShadow = true; scene.add(o);
    const W = { o, kind, nx, nz, full: h, base: base || 0, cur: h, x0: (x0 + x1) / 2 - w / 2, x1: (x0 + x1) / 2 + w / 2, z0: (z0 + z1) / 2 - d / 2, z1: (z0 + z1) / 2 + d / 2, att: [] }; WALLS.push(W); return W;
  }
  const attach = (W, obj, bottom) => W.att.push({ obj, bottom });
  function buildWalls() {
    wall(B.x0, B.z0, 49.5, B.z0, EXT_H, "ext", 0, -1); wall(63.5, B.z0, B.x1, B.z0, EXT_H, "ext", 0, -1); const nh = wall(49.5, B.z0, 63.5, B.z0, EXT_H - 14, "ext", 0, -1, 14);
    const s1 = wall(B.x0, B.z1, 72.75, B.z1, EXT_H, "ext", 0, 1), s2 = wall(78.75, B.z1, B.x1, B.z1, EXT_H, "ext", 0, 1);
    wall(72.75, B.z1, 78.75, B.z1, 8, "ext", 0, 1, 0, mat("#7d97ad", { r: 0.08, m: 0.35, o: 0.75, e: "#ffd9a0", ek: 0.9 })); const sh = wall(72.75, B.z1, 78.75, B.z1, EXT_H - 8, "ext", 0, 1, 8);
    wall(B.x0, B.z0, B.x0, B.z1, EXT_H, "ext", -1, 0); wall(B.x1, B.z0, B.x1, B.z1, EXT_H, "ext", 1, 0);
    wall(B.x0, 83.25, 82, 83.25, INT_H, "int", 0, 1); wall(85.5, 83.25, B.x1, 83.25, INT_H, "int", 0, 1); wall(82, 83.25, 85.5, 83.25, INT_H - 7.5, "int", 0, 1, 7.5);
    [61.25, 87.5].forEach((x) => { wall(x, 83.25, x, 85.5, INT_H, "int", 1, 0); wall(x, 88.5, x, B.z1, INT_H, "int", 1, 0); wall(x, 85.5, x, 88.5, INT_H - 7.5, "int", 1, 0, 7.5); });
    const gw = (W, x0, x1, y0, y1) => { const o = new T.Mesh(BOX, glassM); o.scale.set(x1 - x0, y1 - y0, 0.25); o.position.set((x0 + x1) / 2, y0, B.z1 + 0.35); scene.add(o); attach(W, o, y0); };
    gw(s1, 41, 56, 4, 8.5); gw(s1, 63, 71, 3, 8.5); gw(s2, 80.5, 86, 3, 8.5); gw(s2, 92, 96, 6, 8);
    const aw = new T.Mesh(BOX, mat(C.orange, { r: 0.5 })); aw.scale.set(11.5, 0.5, 4); aw.position.set(75.75, 9.6, B.z1 + 2); aw.castShadow = true; scene.add(aw); attach(sh, aw, 9.6);
    const sign = signBoard(26, 4.2, "ROLLIN COAL", "DIESEL ENGINE SPECIALISTS"); sign.position.set(74.25, 11, B.z1 + 0.45); scene.add(sign); attach(s1, sign, 11); attach(s2, sign, 11);
    const bs = signBoard(10, 2.4, "BAY 1", null); bs.position.set(56.5, 14.8, B.z0 - 0.45); bs.rotation.y = Math.PI; scene.add(bs); attach(nh, bs, 14.8);
    const rd = new T.Mesh(BOX, mat("#b7bcc2", { r: 0.5, m: 0.4 })); rd.scale.set(14, 1.2, 1.4); rd.position.set(56.5, 12.8, B.z0 + 0.8); rd.castShadow = true; scene.add(rd); attach(nh, rd, 12.8);
    const dm = mat("#a07a52", { r: 0.7 }); [[61.25, 85.5, 1], [87.5, 85.5, -1]].forEach(([x, z, s]) => { const o = new T.Mesh(BOX, dm); o.scale.set(0.15, 7, 3); o.position.set(x + s * 1.1, 0, z + 1.1); o.rotation.y = s * 0.9; scene.add(o); });
    const od = new T.Mesh(BOX, dm); od.scale.set(3.4, 7, 0.15); od.position.set(83.75, 0, 83.25 - 1.4); od.rotation.y = 0.9; scene.add(od);
    const rf = new T.Mesh(BOX, mat("#8e949b", { r: 0.7, m: 0.3 })); rf.scale.set(B.x1 - B.x0 + 2, 0.8, B.z1 - B.z0 + 2); rf.position.set((B.x0 + B.x1) / 2, EXT_H, (B.z0 + B.z1) / 2); rf.castShadow = rf.receiveShadow = true; ROOF.push(rf); scene.add(rf);
    [[50, 52, 8, 5], [88, 68, 6, 6]].forEach(([x, z, w, d]) => { const u = new T.Mesh(BOX, mat("#b9bec4", { r: 0.6, m: 0.3 })); u.scale.set(w, 3, d); u.position.set(x, EXT_H + 0.8, z); u.castShadow = true; ROOF.push(u); scene.add(u); });
  }

  // ── The ground: grass, the lot (gravel take-out pads, concrete reman pad, parking stalls), the street
  function buildGround() {
    const grass = ctex(256, 256, (g, w, h) => { g.fillStyle = C.grass; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, 2600, ["#87b25f", "#729d4d", "#8fb866", "#6e9549"], 2.2); }, true);
    grass.repeat.set(30, 30);
    const gm = new T.Mesh(new T.PlaneGeometry(1200, 1200), new T.MeshStandardMaterial({ map: grass, roughness: 1 })); gm.rotation.x = -Math.PI / 2; gm.position.set(75, -0.06, 50); gm.receiveShadow = true; scene.add(gm);
    const S = 8, A = AREA_BY_ID;
    const lotTex = ctex(LOT.w * S, LOT.d * S, (g, w, h) => {
      g.fillStyle = C.asph; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, 26000, ["#55585e", "#43464b", "#5b5f65", "#3f4146"], 2);
      const rect = (a, col, sp) => { g.fillStyle = col; g.fillRect(a.x0 * S, a.z0 * S, (a.x1 - a.x0) * S, (a.z1 - a.z0) * S); if (sp) speckle(g, a.x0 * S, a.z0 * S, (a.x1 - a.x0) * S, (a.z1 - a.z0) * S, sp[0], sp[1], sp[2]); };
      const grav = [9000, ["#a9a194", "#8a8376", "#b3ab9c", "#7d766a"], 2.6];
      rect(A.takeoutW, C.gravel, grav); rect(A.takeoutE, C.gravel, grav); rect(A.reman, C.conc, [6000, ["#ccc9c1", "#b6b3ab", "#d2cfc8"], 1.6]);
      g.strokeStyle = "rgba(90,88,82,.55)"; g.lineWidth = 2; for (let z = A.reman.z0 + 12; z < A.reman.z1; z += 12) { g.beginPath(); g.moveTo(A.reman.x0 * S, z * S); g.lineTo(A.reman.x1 * S, z * S); g.stroke(); }
      rect({ x0: 46, x1: 67, z0: 24, z1: 36 }, C.conc, [1500, ["#ccc9c1", "#b6b3ab"], 1.6]);
      g.strokeStyle = "#f2efe8"; g.lineWidth = 0.45 * S; for (let i = 0; i <= 6; i++) { const z = 40 + i * 9; g.beginPath(); g.moveTo(1 * S, z * S); g.lineTo(19 * S, z * S); g.stroke(); }
      g.fillStyle = "#2f63b3"; g.fillRect(1.2 * S, 40.4 * S, 17.6 * S, 8.2 * S); g.fillStyle = "#f2efe8"; g.font = "bold " + 5 * S + "px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("♿", 10 * S, 44.5 * S);
      g.strokeStyle = C.yellow; g.lineWidth = 0.5 * S; g.setLineDash([3 * S, 2.5 * S]); g.beginPath(); g.moveTo(27 * S, 94 * S); g.lineTo(27 * S, 20 * S); g.lineTo(56.5 * S, 20 * S); g.lineTo(56.5 * S, 30 * S); g.stroke(); g.setLineDash([]);
      g.fillStyle = "rgba(239,184,29,.95)"; g.font = "bold " + 3.6 * S + "px Arial"; g.fillText("BAY 1", 56.5 * S, 27 * S);
      [[27, 80, 0], [27, 58, 0], [40, 20, 1]].forEach(([x, z, r]) => { g.save(); g.translate(x * S, z * S); g.rotate(r ? Math.PI / 2 : 0); g.beginPath(); g.moveTo(0, -3 * S); g.lineTo(2 * S, 0); g.lineTo(0.7 * S, 0); g.lineTo(0.7 * S, 3 * S); g.lineTo(-0.7 * S, 3 * S); g.lineTo(-0.7 * S, 0); g.lineTo(-2 * S, 0); g.closePath(); g.fill(); g.restore(); });
    });
    const lot = new T.Mesh(new T.PlaneGeometry(LOT.w, LOT.d), new T.MeshStandardMaterial({ map: lotTex, roughness: 0.95 })); lot.rotation.x = -Math.PI / 2; lot.position.set(LOT.w / 2, 0, LOT.d / 2); lot.receiveShadow = true; scene.add(lot);
    const road = ctex(320, 240, (g, w, h) => { g.fillStyle = "#3f4246"; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, 4500, ["#474a4f", "#383a3e", "#4e5156"], 1.8);
      g.fillStyle = "#efc23a"; g.fillRect(0, h * 0.5 - 3, w * 0.55, 6); g.fillStyle = "#e9e7e2"; g.fillRect(0, 8, w, 4); g.fillRect(0, h - 12, w, 4); }, true);
    road.repeat.set(560 / 40, 1); const rd = new T.Mesh(new T.PlaneGeometry(560, 24), new T.MeshStandardMaterial({ map: road, roughness: 0.95 })); rd.rotation.x = -Math.PI / 2; rd.position.set(75, 0.01, 113); rd.receiveShadow = true; scene.add(rd);
    const walk = ctex(160, 40, (g, w, h) => { g.fillStyle = "#c9c6be"; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, 900, ["#d2cfc8", "#bbb8b0"], 1.5); g.fillStyle = "#a9a69e"; for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 2, h); }, true);
    walk.repeat.set(560 / 20, 1); const sw = new T.Mesh(new T.PlaneGeometry(560, 5), new T.MeshStandardMaterial({ map: walk, roughness: 0.95 })); sw.rotation.x = -Math.PI / 2; sw.position.set(75, 0.03, 98.5); sw.receiveShadow = true; scene.add(sw);
    // Shop floor: concrete with the zones painted on, carpet in the office, tile in the lobby and bathroom
    const F = 10, fw = B.x1 - B.x0, fd = B.z1 - B.z0;
    const floorTex = ctex(Math.round(fw * F), Math.round(fd * F), (g, w, h) => {
      const X = (x) => (x - B.x0) * F, Z = (z) => (z - B.z0) * F;
      g.fillStyle = "#c6c4bd"; g.fillRect(0, 0, w, h); speckle(g, 0, 0, w, h, 9000, ["#cfcdc6", "#bdbbb4", "#d4d2cb"], 1.6);
      g.strokeStyle = "rgba(120,118,110,.35)"; g.lineWidth = 1.5; for (let x = B.x0 + 12; x < B.x1; x += 12) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), h); g.stroke(); } for (let z = B.z0 + 12; z < 83; z += 12) { g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(w, Z(z)); g.stroke(); }
      const zone = (a, col, dash, lw) => { g.strokeStyle = col; g.lineWidth = (lw || 0.35) * F; g.setLineDash(dash ? [1.6 * F, 1 * F] : []); g.strokeRect(X(a.x0) + 2, Z(a.z0) + 2, (a.x1 - a.x0) * F - 4, (a.z1 - a.z0) * F - 4); g.setLineDash([]); };
      for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(60,55,45," + (0.05 + rnd() * 0.08) + ")"; g.beginPath(); g.ellipse(X(52 + rnd() * 12), Z(48 + rnd() * 25), (1 + rnd() * 2.2) * F, (0.7 + rnd() * 1.4) * F, rnd() * 3, 0, 7); g.fill(); }
      zone(A.bay1, C.yellow, false, 0.45); zone(A.reman1, "#f4f2ec", true); zone(A.reman2, "#f4f2ec", true); zone(A.tools, "#f4f2ec", true); zone(A.parts, "#f4f2ec", true);
      g.fillStyle = "rgba(70,90,110,.12)"; g.fillRect(X(73), Z(36), (103.3 - 73) * F, (52 - 36) * F); zone(A.cleaning, "#f4f2ec", true);
      g.fillStyle = "rgba(239,184,29,.9)"; g.font = "bold " + 4.2 * F + "px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BAY 1", X(58), Z(42));
      g.fillStyle = "#6c7380"; g.fillRect(X(B.x0), Z(83.25), (61.25 - B.x0) * F, (B.z1 - 83.25) * F); speckle(g, X(B.x0), Z(83.25), (61.25 - B.x0) * F, (B.z1 - 83.25) * F, 1800, ["#757c89", "#646a76"], 1.4);
      g.fillStyle = "#d9d3c7"; g.fillRect(X(61.25), Z(83.25), (87.5 - 61.25) * F, (B.z1 - 83.25) * F); g.strokeStyle = "rgba(150,140,125,.5)"; g.lineWidth = 1;
      for (let x = 61.25; x < 87.5; x += 2) { g.beginPath(); g.moveTo(X(x), Z(83.25)); g.lineTo(X(x), h); g.stroke(); } for (let z = 83.25; z < B.z1; z += 2) { g.beginPath(); g.moveTo(X(61.25), Z(z)); g.lineTo(X(87.5), Z(z)); g.stroke(); }
      g.fillStyle = "#e4e9ec"; g.fillRect(X(87.5), Z(83.25), (B.x1 - 87.5) * F, (B.z1 - 83.25) * F); g.strokeStyle = "rgba(150,165,175,.6)";
      for (let x = 87.5; x < B.x1; x += 1) { g.beginPath(); g.moveTo(X(x), Z(83.25)); g.lineTo(X(x), h); g.stroke(); } for (let z = 83.25; z < B.z1; z += 1) { g.beginPath(); g.moveTo(X(87.5), Z(z)); g.lineTo(w, Z(z)); g.stroke(); }
      g.fillStyle = "rgba(239,184,29,.85)"; for (let i = 0; i < 5; i++) { g.save(); g.translate(X(81.5 + i * 1.2), Z(81.2)); g.rotate(0.6); g.fillRect(-0.25 * F, -1.4 * F, 0.5 * F, 2.8 * F); g.restore(); }
    });
    const fl = new T.Mesh(new T.PlaneGeometry(fw, fd), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 })); fl.rotation.x = -Math.PI / 2; fl.position.set((B.x0 + B.x1) / 2, 0.05, (B.z0 + B.z1) / 2); fl.receiveShadow = true; scene.add(fl);
  }

  // ── Inside the shop (static props; engines are added separately from the real inventory)
  function buildInside() {
    const bay = new T.Group(), parts = new T.Group(), cl = new T.Group(), r1 = new T.Group(), r2 = new T.Group(), tools = new T.Group(), off = new T.Group(), lob = new T.Group(), bath = new T.Group();
    semi(bay, 57.5, 58, -Math.PI / 2, "#1f4e79", { open: true, engine: MAKES[1][1] }); hoist(bay, 64.5, 74, Math.PI);
    [41, 50, 59, 68].forEach((z) => shelf(parts, 42.3, z, Math.PI / 2, 8));
    washer(cl, 78, 41, 0); hotTank(cl, 86, 40.5, 0); drum(cl, 92.5, 39.5); drum(cl, 95, 39.5, "#1d1e20"); drum(cl, 92.5, 42.2, "#2d6aa6");
    bench(cl, 99, 46.5, Math.PI / 2, 7); box(cl, 6, 4.5, 1.2, mat("#7d8287", { r: 0.6, m: 0.3 }), 81, 0, 49.8); for (let i = 0; i < 3; i++) box(cl, 1.6, 0.5, 1.1, mat("#8a8f95", { r: 0.5, m: 0.4 }), 78.8 + i * 2.1, 4.5, 49.8);
    [[r1, 58.8], [r2, 69.3]].forEach(([g, z]) => { standFrame(g, 77, z, 0); bench(g, 86.5, z - 1.5, 0, 6.5); });
    [55.5, 60.5, 65.5].forEach((z) => chest(tools, 101.5, z, -Math.PI / 2)); chest(tools, 101.5, 70.5, -Math.PI / 2, "#2f5f9c");
    desk(off, 47, 90, Math.PI); desk(off, 55, 90, Math.PI); box(off, 1.6, 4.4, 2, mat("#8d949b", { r: 0.5, m: 0.3 }), 39.2, 0, 86); box(off, 1.6, 4.4, 2, mat("#8d949b", { r: 0.5, m: 0.3 }), 39.2, 0, 88.2); plant(off, 59.5, 85, 0.8);
    counter(lob, 74, 87); [[64, 93.2], [66.4, 93.2], [68.8, 93.2]].forEach(([x, z]) => chair(lob, x, z, Math.PI)); box(lob, 3, 1.4, 1.6, mat("#a87a4c", { r: 0.6 }), 66.4, 0, 90.4); plant(lob, 85.5, 93.5, 0.9); plant(lob, 62.5, 85, 0.7);
    toilet(bath, 91, 85, 0); sink(bath, 98.5, 84.4, 0);
    [[bay, "bay1"], [parts, "parts"], [cl, "cleaning"], [r1, "reman1"], [r2, "reman2"], [tools, "tools"], [off, "office"], [lob, "lobby"], [bath, "bathroom"]].forEach(([g, a]) => merged(g, a));
  }
  // ── Outside: canopy, trucks, cars, the forklift
  let yardTruck = null, forkObj = null;
  function buildYard() {
    const rm = new T.Group(), yd = new T.Group(), pk = new T.Group();
    const post = mat("#7c838a", { r: 0.5, m: 0.5 }); [106.6, 146.9].forEach((x) => [34.6, 49.5, 64.5, 79.5, 94.2].forEach((z) => cylY(rm, 0.32, 14, post, x, 0, z, CYL8)));
    box(rm, 40.9, 0.7, 0.5, post, 126.75, 13.6, 34.6); box(rm, 40.9, 0.7, 0.5, post, 126.75, 13.6, 94.2); box(rm, 0.5, 0.7, 60, post, 106.6, 13.6, 64.4); box(rm, 0.5, 0.7, 60, post, 146.9, 13.6, 64.4);
    for (let x = 111; x < 146; x += 5) box(rm, 0.25, 0.4, 59.6, post, x, 13.9, 64.4);
    yardTruck = semi(yd, 56.5, 13, -Math.PI / 2, "#efece6", { sleeper: true, stripe: C.orange }); bollard(yd, 48.6, 34.6); bollard(yd, 64.4, 34.6);
    pickup(pk, 10, 53, Math.PI, "#2b2d31"); car(pk, 10, 80, Math.PI, "#9b2f2a");
    [[rm, "reman"], [yd, "yard"], [pk, "parking"]].forEach(([g, a]) => merged(g, a));
    const cr = new T.Mesh(BOX, mat("#a3aab1", { r: 0.6, m: 0.4 })); cr.scale.set(42, 0.4, 61); cr.position.set(126.75, 14.3, 64.4); cr.castShadow = cr.receiveShadow = true; ROOF.push(cr); scene.add(cr);
    forkObj = forklift(scene, 30, 40, Math.PI / 2); engine(forkObj, 4.6, 0, 0, "take", MAKES[2][1], 0.5);
    forkObj.traverse((o) => { if (o.isMesh) { o.userData.area = "parking"; PICK.push(o); } });
  }
  // ── Fence, trees, lights, the sign by the gate, traffic
  const LAMPS = []; let cars = [];
  function buildScenery() {
    const sc = new T.Group(); const post = mat("#8a9096", { r: 0.5, m: 0.6 }); const fenceM = mat("#9aa1a8", { o: 0.28, ds: true, r: 0.6 });
    const fenceRun = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 10)); for (let i = 0; i <= n; i++) { const t = i / n; cylY(sc, 0.18, 6.2, post, x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, CYL8); }
      box(sc, len, 0.16, 0.16, post, (x0 + x1) / 2, 6, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0));
      const m = new T.Mesh(new T.PlaneGeometry(len, 6), fenceM); m.position.set((x0 + x1) / 2, 3, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); scene.add(m); };
    fenceRun(0, 0, LOT.w, 0); fenceRun(0, 0, 0, 96); fenceRun(LOT.w, 0, LOT.w, 96); fenceRun(0, 96, 3, 96); fenceRun(33, 96, B.x0, 96); fenceRun(B.x1, 96, LOT.w, 96);
    [[-14, -10, "spruce", 1.1], [8, -14, "poplar", 1], [30, -11, "spruce", 0.9], [62, -15, "poplar", 1.2], [92, -12, "spruce", 1], [122, -14, "poplar", 1], [150, -11, "spruce", 1.15], [166, 8, "poplar", 1], [164, 36, "spruce", 1], [168, 66, "poplar", 1.1], [163, 92, "spruce", 0.9],
      [-16, 30, "poplar", 1], [-12, 62, "spruce", 1], [-18, 88, "poplar", 0.9], [-30, 140, "poplar", 1.1], [10, 142, "spruce", 1], [48, 138, "poplar", 1], [96, 141, "spruce", 1.1], [132, 139, "poplar", 1], [176, 142, "spruce", 1]].forEach(([x, z, k, s]) => tree(sc, x, z, k, s));
    cylY(sc, 0.35, 14, post, 32.5, 0, 100.5, CYL8); cylY(sc, 0.35, 14, post, 41.5, 0, 100.5, CYL8);
    merged(sc, null);
    const ps = signBoard(11, 5, "ROLLIN COAL", "DIESEL ENGINES · 1-587-863-0505"); ps.position.set(37, 9, 100.5); scene.add(ps);
    [[39, 33.5, 0], [104.5, 32.5, Math.PI], [3, 62, 0], [148.5, 58, Math.PI]].forEach(([x, z, r]) => { pole(scene, x, z, r); const l = new T.PointLight("#ffd79a", 0, 90, 1); l.userData.k = 60; l.position.set(x + (r ? -3.6 : 3.6), 20.5, z); scene.add(l); LAMPS.push(l); });
    [[57, 15, 57], [86, 15, 62], [49, 9, 89], [74, 9, 89], [95, 8, 89]].forEach(([x, y, z]) => { const l = new T.PointLight("#ffdcae", 0, 62, 1); l.userData.k = 40; l.position.set(x, y, z); scene.add(l); LAMPS.push(l); });
    if (!reduce) cars = [{ o: car(scene, -60, 108, 0, "#2f5f9c"), v: 34 }, { o: car(scene, 160, 118, Math.PI, "#d9d6cf"), v: -28 }, { o: car(scene, 40, 118, Math.PI, "#3a3c40"), v: -28 }];
  }
  // Invisible pads over each place, so clicking bare floor still picks it
  function buildPickPads() { const inv = new T.MeshBasicMaterial({ visible: false }); SHOP_AREAS.forEach((a) => { const o = new T.Mesh(BOX, inv); o.scale.set(a.w, 0.4, a.d); o.position.set(a.cx, a.kind === "Outside" ? 0 : 0.06, a.cz); o.userData.area = a.id; scene.add(o); PICK.push(o); }); }

  // ── The real engines
  let engRoot = null; let ENG = []; let ENG_PICK = []; const PLATES = new Map(); const counts = {};
  function makeLook(e) { const pal = (MAKES.find(([re]) => re.test(e.name || "")) || [0, PLAIN])[1]; return pal; }
  let lastSig = null;
  function setEngines(list) {
    const sig = JSON.stringify(list || []); if (sig === lastSig) return; lastSig = sig;
    const was = selE ? ENG.find((x) => x.e.id === selE) : null;
    if (engRoot) { scene.remove(engRoot); engRoot.traverse((o) => { if (o.isMesh && o.geometry && !SHARED.includes(o.geometry)) o.geometry.dispose(); }); }
    ENG_PICK.forEach((o) => scene.remove(o)); ENG_PICK = []; PLATES.forEach((p) => p.el.remove()); PLATES.clear();
    engRoot = new T.Group(); scene.add(engRoot); ENG = [];
    Object.keys(counts).forEach((k) => delete counts[k]);
    const byArea = {}; (list || []).forEach((e) => { if (!e.area || !SLOTS[e.area]) return; (byArea[e.area] = byArea[e.area] || []).push(e); counts[e.area] = (counts[e.area] || 0) + 1; });
    const inv = new T.MeshBasicMaterial({ visible: false });
    Object.entries(byArea).forEach(([aid, items]) => {
      const g = new T.Group(); const slots = SLOTS[aid];
      items.slice(0, slots.length).forEach((e, k) => {
        const s = slots[k]; const r = rng(hash(e.id)); const pal = makeLook(e); const sc = SIZE[e.size] || 1;
        const kind = s.stand ? "bare" : (aid === "reman" || e.remanned) ? "reman" : "take";
        const holder = grp(g, s.x, s.z, s.ry, s.stand ? 2.9 : 0); const en = engine(holder, 0, 0, 0, kind, pal, 0, r); en.scale.setScalar(sc);
        const tagY = (en.userData.top || 3) * sc + (s.stand ? 2.9 : 0);
        box(holder, 0.6, 0.06, 0.42, mat(ST_COL[e.status] || "#7b8187", { r: 0.5 }), 1.05 * sc, tagY + 0.01, 0.3 * sc);
        const pk = new T.Mesh(BOX, inv); pk.scale.set(5 * sc, tagY + 0.6, 3.8 * sc); pk.position.set(s.x, s.stand ? 0.5 : 0, s.z); pk.rotation.y = s.ry; pk.userData.engine = e.id; pk.userData.area = aid; scene.add(pk); ENG_PICK.push(pk);
        const top = tagY + (s.stand ? 0 : 0) + 1.6;
        ENG.push({ e, x: s.x, z: s.z, ry: s.ry, sc, top });
        const el = document.createElement("button"); el.type = "button"; el.className = "s3-plate" + (e.status === "sold" ? " sold" : ""); el.textContent = e.sku || e.name || "Engine"; el.hidden = true;
        el.setAttribute("aria-label", (e.sku ? e.sku + ", " : "") + (e.name || "engine"));
        el.addEventListener("click", () => { selectEngine(e.id); call("onSelectEngine", e.id); });
        lay.appendChild(el); PLATES.set(e.id, { el, pos: new T.Vector3(s.x, top, s.z), last: "" });
      });
      merged(g, null, engRoot);
    });
    LBL.forEach((L) => { if (L.cnt) { const n = counts[L.id] || 0; L.cnt.textContent = n ? String(n) : ""; L.cnt.hidden = !n; L.w = 0; } });
    const now = selE ? ENG.find((x) => x.e.id === selE) : null;
    if (selE && !now) selectEngine(null);
    else if (now && (!was || was.x !== now.x || was.z !== now.z)) selectEngine(selE);
    else if (now) ringAt(selE);
    standBusy.reman1 = !!(byArea.reman1 || []).length; standBusy.reman2 = !!(byArea.reman2 || []).length; placeCrew();
  }

  // ── The crew: a blocky figure per Team member at their work spot (crew.js picks the spot; the
  //    dashboard says when they're at work and when an hour's wage pops up over someone)
  const SKIN = ["#f1c9a5", "#e0b48f", "#c68d62", "#a8714a", "#8d5a3b"];
  const HAIR = ["#2a1d14", "#4a3222", "#7a5a3a", "#1d1d1d", "#9a8f84", "#b07a3e"];
  const SUIT = ["#2b3a55", "#33443a", "#3d3f45", "#4a3628", "#28465f"];
  const SHIRT = ["#d4581a", "#2f5f9c", "#3a3c40", "#6c7a3a", "#8a2f2f"];
  // In feet: legs 2.6 (thigh 1.15, shin and boot 1.45), body 1.85, head 0.86 and a cap. Faces +z.
  // Shop people wear coveralls and a cap and carry a wrench; office people a shirt and pants.
  function figure(p, id, act) {
    const r = rng(hash("crew:" + id)); const pk = (a) => a[Math.floor(r() * a.length)];
    const office = act === "desk" || act === "counter";
    const skin = mat(pk(SKIN), { r: 0.7 }), hair = mat(pk(HAIR), { r: 0.9 }), top = mat(office ? pk(SHIRT) : pk(SUIT), { r: 0.75 });
    const legs = office ? mat(r() < 0.5 ? "#3b4f6b" : "#8c7b5c", { r: 0.85 }) : top, boot = mat("#2a2420", { r: 0.8 });
    const g = grp(p, 0, 0, 0);
    const hips = [-0.27, 0.27].map((x) => { const h = grp(g, x, 0, 0, 2.6); box(h, 0.46, 1.15, 0.52, legs, 0, -1.15, 0); const k = grp(h, 0, 0, 0, -1.15); box(k, 0.44, 1.05, 0.48, legs, 0, -1.05, 0); box(k, 0.5, 0.4, 0.82, boot, 0, -1.45, 0.12); return { h, k }; });
    const up = grp(g, 0, 0, 0, 2.6);
    box(up, 1.3, 1.85, 0.72, top, 0, 0, 0);
    if (office) box(up, 0.52, 0.28, 0.06, mat(C.white, { r: 0.6 }), 0, 1.57, 0.35);
    else { box(up, 1.32, 0.14, 0.74, mat("#2a2420", { r: 0.7 }), 0, 0.1, 0); box(up, 0.34, 0.24, 0.05, mat(C.orange, { r: 0.5 }), 0.3, 1.4, 0.36); }
    const arms = [-0.82, 0.82].map((x) => { const a = grp(up, x, 0, 0, 1.72); box(a, 0.34, 1.5, 0.4, top, 0, -1.5, 0); box(a, 0.3, 0.32, 0.34, skin, 0, -1.84, 0); return a; });
    if (!office) box(arms[1], 0.09, 0.62, 0.14, mat(C.chrome, { r: 0.3, m: 0.8 }), 0, -2.42, 0.06);
    const head = grp(up, 0, 0, 0, 1.88);
    box(head, 0.78, 0.86, 0.78, skin, 0, 0.02, 0);
    [-0.17, 0.17].forEach((x) => box(head, 0.1, 0.1, 0.04, mat("#1d1d1d", { r: 0.5 }), x, 0.5, 0.39));
    if (office) { box(head, 0.84, 0.22, 0.84, hair, 0, 0.8, 0); box(head, 0.84, 0.5, 0.18, hair, 0, 0.32, -0.36); }
    else { const cap = mat(r() < 0.6 ? C.orange : "#2b2c2f", { r: 0.6 }); box(head, 0.84, 0.26, 0.84, cap, 0, 0.8, 0); box(head, 0.72, 0.06, 0.44, cap, 0, 0.82, 0.58); box(head, 0.84, 0.32, 0.16, hair, 0, 0.48, -0.36); }
    // Sitting: thighs forward, shins down, onto the chair seat (1.3 ft).
    if (act === "desk") { g.position.y = -1.04; hips.forEach((q) => { q.h.rotation.x = -Math.PI / 2; q.k.rotation.x = Math.PI / 2; }); }
    return { g, up, head, hips, armL: arms[0], armR: arms[1], ph: r() * 6.28 };
  }
  const INV = new T.MeshBasicMaterial({ visible: false });
  let crewRoot = null, CREW = [], CREW_PICK = [], crewOn = !!opts.crewOn, selP = null, lastCrew = null, clock = 0;
  const WHO = new Map(), PAYS = [], standBusy = {};
  // Where each person is right now: their spot, or the end of the bench while their stand is empty.
  function placeCrew() {
    CREW.forEach((P) => {
      const s = P.s, at = s.alt && s.stand && !standBusy[s.stand] ? s.alt : s;
      P.x = at.x; P.z = at.z; P.act = at.act; P.holder.position.set(at.x, 0, at.z); P.holder.rotation.y = at.ry || 0;
      P.pk.position.set(at.x, 0, at.z); P.plate.pos.set(at.x, P.top + 0.3, at.z);
    });
    if (selP != null && CREW.some((P) => P.c.id === selP)) ringAtPerson(selP);
  }
  function setCrew(list) {
    const sig = JSON.stringify(list || []); if (sig === lastCrew) return; lastCrew = sig;
    if (crewRoot) scene.remove(crewRoot);
    CREW_PICK.forEach((o) => scene.remove(o)); CREW_PICK = []; WHO.forEach((w) => w.el.remove()); WHO.clear(); PAYS.splice(0).forEach((q) => q.el.remove());
    crewRoot = new T.Group(); crewRoot.visible = crewOn; scene.add(crewRoot); CREW = [];
    (list || []).forEach((c) => {
      const s = c.spot; if (!s) return;
      const holder = grp(crewRoot, s.x, s.z, s.ry || 0); const f = figure(holder, c.id, s.act); const top = s.act === "desk" ? 5 : 6.1;
      const pk = new T.Mesh(BOX, INV); pk.scale.set(1.9, top, 1.6); pk.position.set(s.x, 0, s.z); pk.userData.person = c.id; pk.userData.area = s.area; scene.add(pk); CREW_PICK.push(pk);
      const el = document.createElement("button"); el.type = "button"; el.className = "s3-who"; el.textContent = c.short || c.name || "Crew"; el.hidden = true;
      el.setAttribute("aria-label", (c.name || "Crew") + (c.role ? ", " + c.role : ""));
      el.addEventListener("click", () => { selectPerson(c.id); call("onSelectPerson", c.id); });
      lay.appendChild(el);
      const P = { c, s, f, holder, pk, x: s.x, z: s.z, act: s.act, top, plate: { el, pos: new T.Vector3(s.x, top + 0.3, s.z), last: "" } };
      WHO.set(c.id, P.plate); CREW.push(P);
    });
    placeCrew();
    if (selP != null && !CREW.some((P) => P.c.id === selP)) selectPerson(null);
  }
  function setCrewOn(on) { crewOn = !!on; if (crewRoot) crewRoot.visible = crewOn; if (!crewOn) { WHO.forEach((W) => hideL(W)); PAYS.splice(0).forEach((q) => q.el.remove()); } }
  // Each kind of work is a loop of arm, lean and head moves; walkers go back and forth with a
  // look around at each end. With reduced motion everyone holds still.
  const WALK_V = 3.4, WALK_REST = 2.2;
  function crewStep() {
    if (!crewRoot || !crewOn) return;
    CREW.forEach((P) => {
      const f = P.f, a = P.act, k = (reduce ? 0 : clock) + f.ph;
      let lean = 0, l = -0.12, rr = -0.12, lz = 0, rz = 0, hx = 0, hy = 0, sw = 0;
      if (a === "wrench") { const c = k % 9, look = c > 7.4; lean = look ? 0.04 : 0.3; hx = look ? 0 : 0.28; hy = look ? Math.sin((c - 7.4) * 3.9) * 0.55 : 0; rr = look ? -0.25 : -1.25 + 0.3 * Math.sin(k * 5.2); l = look ? -0.15 : -1 + 0.1 * Math.sin(k * 5.2 + 1.6); }
      else if (a === "bench") { lean = 0.22; hx = 0.38; rr = -0.95 + 0.16 * Math.sin(k * 4); l = -0.95 - 0.16 * Math.sin(k * 4); }
      else if (a === "wash") { lean = 0.24; hx = 0.32; rr = -1 + 0.18 * Math.sin(k * 6); l = -1 + 0.18 * Math.sin(k * 6 + 3.1); rz = 0.12 * Math.cos(k * 6); lz = -0.12 * Math.cos(k * 6 + 3.1); }
      else if (a === "fetch") { const c = k % 7; lean = 0.12; l = -0.2; if (c < 4.5) { rr = -1.35 + 0.18 * Math.sin(k * 3); hx = 0.25; } else { rr = -1.75; hx = -0.05; hy = 0.2; } }
      else if (a === "shelf") { const hi = k % 8 < 4; hx = -0.3; rr = hi ? -2.35 + 0.15 * Math.sin(k * 2.4) : -0.2; l = hi ? -0.25 : -2.2 + 0.15 * Math.sin(k * 2.4); }
      else if (a === "desk") { const c = k % 11, back = c > 9; lean = back ? -0.1 : 0.12; hx = back ? -0.05 : 0.08; hy = back ? 0.35 * Math.sin((c - 9) * 3) : 0; rr = back ? -0.5 : -1.25 + 0.05 * Math.sin(k * 15); l = back ? -0.5 : -1.25 + 0.05 * Math.sin(k * 15 + 1.7); }
      else if (a === "counter") { hy = 0.3 * Math.sin(k * 0.7); rr = -0.55 + 0.35 * Math.max(0, Math.sin(k * 1.6)); l = -0.25; }
      else if (a === "walk") {
        const s = P.s, dx = s.x2 - s.x, dz = s.z2 - s.z, tw = (Math.hypot(dx, dz) || 1) / WALK_V, c = k % (2 * (tw + WALK_REST));
        let u = 0, dir = -1, moving = false;
        if (c < tw) { u = c / tw; dir = 1; moving = true; } else if (c < tw + WALK_REST) { u = 1; dir = 1; } else if (c < 2 * tw + WALK_REST) { u = 1 - (c - tw - WALK_REST) / tw; moving = true; }
        P.x = s.x + dx * u; P.z = s.z + dz * u; P.holder.position.set(P.x, 0, P.z); P.holder.rotation.y = Math.atan2(dx * dir, dz * dir);
        P.pk.position.set(P.x, 0, P.z); P.plate.pos.set(P.x, P.top + 0.3, P.z); if (selP === P.c.id) ring.position.set(P.x, 0.18, P.z);
        if (moving) { sw = Math.sin(k * 6.6); rr = 0.45 * sw; l = -0.45 * sw; } else hy = 0.5 * Math.sin(c * 2.2);
      }
      if (a !== "desk") { f.hips[0].h.rotation.x = 0.5 * sw; f.hips[1].h.rotation.x = -0.5 * sw; f.hips[0].k.rotation.x = 0.6 * Math.max(0, sw); f.hips[1].k.rotation.x = 0.6 * Math.max(0, -sw); }
      f.up.rotation.x = lean; f.armL.rotation.x = l; f.armR.rotation.x = rr; f.armL.rotation.z = lz; f.armR.rotation.z = rz; f.head.rotation.x = hx; f.head.rotation.y = hy;
    });
  }
  // An hour's wage rising over someone's head, then fading.
  function pay(id, text) {
    if (!crewOn) return; const P = CREW.find((q) => q.c.id === id); if (!P) return;
    const el = document.createElement("div"); el.className = "s3-pay"; el.textContent = text; el.setAttribute("aria-hidden", "true"); el.hidden = true; lay.appendChild(el);
    PAYS.push({ el, P, born: clock, last: "" });
  }

  // ── Lights and time of day (intensities are physical-units, about π × the old artist values)
  const hemi = new T.HemisphereLight("#dfeeff", "#6b7a52", 1.95); scene.add(hemi);
  const sun = new T.DirectionalLight("#fff3dd", 3); sun.castShadow = true; scene.add(sun); scene.add(sun.target);
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -125, right: 125, top: 115, bottom: -115, near: 10, far: 520 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  sun.target.position.set(75, 0, 52);
  const PI = Math.PI;
  const TOD = {
    day: { sky: "#bfd8ee", fog: [420, 1100], hs: "#dfeeff", hg: "#6b7a52", hi: 0.62 * PI, sc: "#fff3dd", si: 0.95 * PI, sp: [-70, 170, 120], lamp: 0, glow: 0 },
    dusk: { sky: "#e9a46a", fog: [360, 1000], hs: "#f3c39a", hg: "#5a5048", hi: 0.42 * PI, sc: "#ffb27a", si: 0.62 * PI, sp: [-190, 70, 60], lamp: 0.55, glow: 0.6 },
    night: { sky: "#0e1726", fog: [300, 900], hs: "#5c6f99", hg: "#1a1f2a", hi: 0.16 * PI, sc: "#9fb4ff", si: 0.16 * PI, sp: [90, 170, -60], lamp: 1, glow: 1 },
  };
  const cur = { sky: new T.Color(), hs: new T.Color(), hg: new T.Color(), sc: new T.Color(), hi: 0, si: 0, lamp: 0, glow: 0, sp: new T.Vector3(), f0: 0, f1: 0 };
  let todKey = "day", todT = 1; const from = {};
  function setTod(k, instant) { if (!TOD[k]) return; todKey = k; ["sky", "hs", "hg", "sc"].forEach((c) => (from[c] = cur[c].clone())); from.hi = cur.hi; from.si = cur.si; from.lamp = cur.lamp; from.glow = cur.glow; from.sp = cur.sp.clone(); from.f0 = cur.f0; from.f1 = cur.f1; todT = instant || reduce ? 1 : 0; if (todT === 1) applyTod(1); }
  function applyTod(t) {
    const P = TOD[todKey]; const e = t * t * (3 - 2 * t);
    cur.sky.copy(from.sky).lerp(new T.Color(P.sky), e); cur.hs.copy(from.hs).lerp(new T.Color(P.hs), e); cur.hg.copy(from.hg).lerp(new T.Color(P.hg), e); cur.sc.copy(from.sc).lerp(new T.Color(P.sc), e);
    const L = (a, b) => a + (b - a) * e; cur.hi = L(from.hi, P.hi); cur.si = L(from.si, P.si); cur.lamp = L(from.lamp, P.lamp); cur.glow = L(from.glow, P.glow); cur.f0 = L(from.f0 || P.fog[0], P.fog[0]); cur.f1 = L(from.f1 || P.fog[1], P.fog[1]);
    cur.sp.copy(from.sp).lerp(new T.Vector3(P.sp[0], P.sp[1], P.sp[2]), e);
    scene.background = cur.sky; if (!scene.fog) scene.fog = new T.Fog(cur.sky.clone(), cur.f0, cur.f1); scene.fog.color.copy(cur.sky); scene.fog.near = cur.f0; scene.fog.far = cur.f1;
    hemi.color.copy(cur.hs); hemi.groundColor.copy(cur.hg); hemi.intensity = cur.hi; sun.color.copy(cur.sc); sun.intensity = cur.si; sun.position.set(75 + cur.sp.x, cur.sp.y, 52 + cur.sp.z);
    LAMPS.forEach((l) => { l.intensity = cur.lamp * l.userData.k; l.visible = l.intensity > 0.05; }); GLOWS.forEach((g) => (g.m.emissiveIntensity = cur.glow * g.k));
  }

  // ── Camera: orbit around a point on the ground, easing toward goals
  const RMIN = 22, RMAX = 430, PHMIN = 0.18, PHMAX = 1.36;
  const HOME = { tx: 72, tz: 54, r: 215, th: 0.28, ph: 0.9 };
  const Cm = { ...HOME }, Gl = { ...HOME };
  const wrapTh = () => { while (Gl.th - Cm.th > Math.PI) Gl.th -= 2 * Math.PI; while (Gl.th - Cm.th < -Math.PI) Gl.th += 2 * Math.PI; };
  const clampT = () => { Gl.tx = clamp(Gl.tx, -60, 210); Gl.tz = clamp(Gl.tz, -60, 160); };
  function camStep(dt) { const k = reduce ? 1 : 1 - Math.exp(-dt * 7.5); for (const key of ["tx", "tz", "r", "th", "ph"]) Cm[key] += (Gl[key] - Cm[key]) * k;
    const sp = Math.sin(Cm.ph); camera.position.set(Cm.tx + Cm.r * sp * Math.sin(Cm.th), Cm.r * Math.cos(Cm.ph), Cm.tz + Cm.r * sp * Math.cos(Cm.th)); camera.lookAt(Cm.tx, 0, Cm.tz); }
  function panBy(dx, dy) { const s = Gl.r * 0.0017; Gl.tx -= (Math.cos(Gl.th) * dx + Math.sin(Gl.th) * dy) * s; Gl.tz -= (-Math.sin(Gl.th) * dx + Math.cos(Gl.th) * dy) * s; clampT(); }
  function flyArea(a) { if (!a) { Object.assign(Gl, HOME); wrapTh(); return; } const size = Math.max(a.w, a.d * 1.1); Gl.tx = a.cx; Gl.tz = a.cz + (a.kind === "Outside" ? 0 : 1); Gl.r = clamp(size * 2.1 + (a.kind === "Outside" ? 40 : 34), 48, 260); Gl.ph = clamp(Gl.ph, 0.62, 1.05); wrapTh(); }

  // ── Picking, hover and selection
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function hitAt(x, y) { const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects((crewOn ? CREW_PICK : []).concat(ENG_PICK, PICK), false); for (const h of hits) { const u = h.object.userData; if (u.person != null) return { person: u.person, area: u.area }; if (u.engine) return { engine: u.engine, area: u.area }; if (u.area) return { area: u.area }; } return null; }
  let hover = null, hoverEng = null, sel = null, selE = null;
  const hl = new T.Group(); scene.add(hl); const hlFill = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(C.orange), transparent: true, opacity: 0.18, depthWrite: false })); hlFill.rotation.x = -Math.PI / 2; hl.add(hlFill);
  const edgeM = new T.MeshBasicMaterial({ color: new T.Color(C.orange) }); const edges = [0, 1, 2, 3].map(() => { const o = new T.Mesh(BOX, edgeM); hl.add(o); return o; });
  const hv = new T.Group(); scene.add(hv); const hvFill = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color("#ffffff"), transparent: true, opacity: 0.12, depthWrite: false })); hvFill.rotation.x = -Math.PI / 2; hv.add(hvFill);
  const ring = new T.Group(); scene.add(ring); const ringEdges = [0, 1, 2, 3].map(() => { const o = new T.Mesh(BOX, edgeM); ring.add(o); return o; }); ring.visible = false;
  function frame(g, fill, ed, a, lift) { if (!a) { g.visible = false; return; } g.visible = true; const y = (a.kind === "Outside" ? 0.08 : 0.14) + (lift || 0); fill.scale.set(a.w, a.d, 1); fill.position.set(a.cx, y, a.cz);
    if (ed) { const t = 0.35; [[a.cx, a.z0, a.w, t], [a.cx, a.z1, a.w, t], [a.x0, a.cz, t, a.d], [a.x1, a.cz, t, a.d]].forEach(([x, z, w, d], i) => { ed[i].scale.set(w, 0.12, d); ed[i].position.set(x, y, z); }); } }
  frame(hl, hlFill, edges, null); frame(hv, hvFill, null, null);
  function ringAt(id) { const it = ENG.find((x) => x.e.id === id); if (!it) { ring.visible = false; return; } ring.visible = true; ring.position.set(it.x, 0.18, it.z); ring.rotation.y = it.ry; const w = 5.6 * it.sc, d = 4.2 * it.sc, t = 0.3;
    [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]].forEach(([x, z, ww, dd], i) => { ringEdges[i].scale.set(ww, 0.14, dd); ringEdges[i].position.set(x, 0, z); }); }
  function ringAtPerson(id) { const P = CREW.find((q) => q.c.id === id); if (!P) { ring.visible = false; return; } ring.visible = true; ring.position.set(P.x, 0.18, P.z); ring.rotation.y = 0; const w = 3, t = 0.25;
    [[0, -w / 2, w, t], [0, w / 2, w, t], [-w / 2, 0, t, w], [w / 2, 0, t, w]].forEach(([x, z, ww, dd], i) => { ringEdges[i].scale.set(ww, 0.14, dd); ringEdges[i].position.set(x, 0, z); }); }
  function setHover(id) { if (id === hover) return; hover = id; frame(hv, hvFill, null, id && id !== sel ? AREA_BY_ID[id] : null, 0.01); LBL.forEach((L) => L.el.classList.toggle("hov", L.id === id)); }
  function selectArea(id, o) { o = o || {}; if (!o.tour) stopTour(); sel = id || null; selE = null; selP = null; ring.visible = false; const a = sel ? AREA_BY_ID[sel] : null; frame(hl, hlFill, edges, a); hover = null; frame(hv, hvFill, null, null); LBL.forEach((L) => { L.el.classList.remove("hov"); L.el.classList.toggle("on", L.id === sel); }); if (a || !o.stay) flyArea(a); }
  function selectEngine(id) { selE = id || null; if (!selE) { if (selP == null) ring.visible = false; return; } const it = ENG.find((x) => x.e.id === selE); if (!it) { ring.visible = false; return; } stopTour(); sel = null; selP = null; frame(hl, hlFill, edges, null); LBL.forEach((L) => L.el.classList.remove("on")); ringAt(selE); Gl.tx = it.x; Gl.tz = it.z; Gl.r = clamp(Math.min(Gl.r, 60), 34, 60); Gl.ph = clamp(Gl.ph, 0.62, 1.05); wrapTh(); }
  function selectPerson(id) { selP = id == null ? null : id; if (selP == null) { ring.visible = false; return; } const P = CREW.find((q) => q.c.id === selP); if (!P) { ring.visible = false; return; }
    stopTour(); sel = null; selE = null; frame(hl, hlFill, edges, null); LBL.forEach((L) => L.el.classList.remove("on")); ringAtPerson(selP); Gl.tx = P.x; Gl.tz = P.z; Gl.r = clamp(Math.min(Gl.r, 46), 26, 46); Gl.ph = clamp(Gl.ph, 0.62, 1);
    if (P.z < B.z0) Gl.th = Math.PI + 0.25; // out in the yard: look from the north, so the shop doesn't hide them
    wrapTh(); }
  function clickAt(x, y) { const h = hitAt(x, y); if (h && h.person != null) { selectPerson(h.person); call("onSelectPerson", h.person); return; } if (h && h.engine) { selectEngine(h.engine); call("onSelectEngine", h.engine); return; } if (h && h.area) { selectArea(h.area); call("onSelectArea", h.area); return; } if (sel || selE || selP != null) { selectArea(null, { stay: true }); call("onSelectArea", null); } }

  // ── Labels: one per place, markers for the doors and the street, a plate per engine when you're close
  const LBL = []; let labelsOn = opts.labels !== false;
  function buildLabels() {
    SHOP_AREAS.forEach((a) => { const b = document.createElement("button"); b.type = "button"; b.className = "s3-tag"; b.style.setProperty("--dot", a.dot);
      const i = document.createElement("i"), sp = document.createElement("span"), cnt = document.createElement("b"); sp.textContent = a.title; cnt.hidden = true; b.append(i, sp, cnt);
      b.setAttribute("aria-label", a.title); b.addEventListener("click", () => { selectArea(a.id); call("onSelectArea", a.id); }); b.addEventListener("mouseenter", () => setHover(a.id)); b.addEventListener("mouseleave", () => setHover(null));
      lay.appendChild(b); LBL.push({ id: a.id, el: b, cnt: a.store ? cnt : null, pos: new T.Vector3(a.cx, a.h, a.cz), last: "" }); });
    [["Bay door", 56.5, 19, 33], ["Front door", 75.75, 11.5, 99.5], ["Street", 75, 2, 124]].forEach(([t, x, y, z]) => { const d = document.createElement("div"); d.className = "s3-mark"; d.textContent = t; lay.appendChild(d); LBL.push({ id: null, el: d, pos: new T.Vector3(x, y, z), last: "", mark: true }); });
  }
  const pv = new T.Vector3();
  // Labels never pile up: the selected one goes first, then the nearest. One that would overlap a
  // label already shown, sit mostly off the edge, or belong to a place far behind the view stays hidden.
  const hideL = (L) => { if (!L.el.hidden) L.el.hidden = true; };
  function placeLabels() {
    const w = canvas.clientWidth, h = canvas.clientHeight, cand = [];
    const consider = (L, near, pri) => { pv.copy(L.pos).project(camera); const d = camera.position.distanceTo(L.pos); const far = near ? d > near : d > Cm.r * 2.3 + 70;
      if (!labelsOn || far || pv.z >= 1 || pv.x < -1.2 || pv.x > 1.2 || pv.y < -1.2 || pv.y > 0.97) { hideL(L); return; }
      cand.push({ L, x: (pv.x * 0.5 + 0.5) * w, y: (-pv.y * 0.5 + 0.5) * h, s: clamp(170 / d, 0.66, 1.05) * (L.mark ? 0.95 : 1), d, pri }); };
    LBL.forEach((L) => consider(L, 0, L.id && (L.id === sel || L.id === hover) ? 0 : L.mark ? 2 : 1));
    if (crewOn) WHO.forEach((W, id) => consider(W, 110, id === selP ? 0 : 2.5)); else WHO.forEach(hideL);
    PLATES.forEach((P, id) => consider(P, 85, id === selE ? 0 : 3));
    cand.sort((a, b) => a.pri - b.pri || a.d - b.d);
    const shown = [];
    cand.forEach((c) => { const L = c.L; if (!L.w) { L.el.hidden = false; L.w = L.el.offsetWidth || 60; L.h = L.el.offsetHeight || 22; }
      const ww = L.w * c.s, hh = L.h * c.s; const r = { x0: c.x - ww / 2, x1: c.x + ww / 2, y0: c.y - hh - 6 * c.s, y1: c.y };
      if (r.x0 < -ww * 0.25 || r.x1 > w + ww * 0.25 || r.y0 < -hh * 0.25 || shown.some((q) => r.x0 < q.x1 && q.x0 < r.x1 && r.y0 < q.y1 && q.y0 < r.y1)) { hideL(L); return; }
      shown.push(r); if (L.el.hidden) L.el.hidden = false;
      const tr = "translate(" + c.x.toFixed(1) + "px," + c.y.toFixed(1) + "px) translate(-50%,-100%) scale(" + c.s.toFixed(3) + ")"; if (tr !== L.last) { L.el.style.transform = tr; L.last = tr; } });
  }
  // Wage pops float up about 7 ft over 2.8 s, whatever the labels setting, and fade at the end.
  function paysStep() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (let i = PAYS.length - 1; i >= 0; i--) {
      const q = PAYS[i], age = clock - q.born;
      if (age > 2.8) { q.el.remove(); PAYS.splice(i, 1); continue; }
      const d = camera.position.distanceTo(wp.set(q.P.x, q.P.top, q.P.z));
      pv.set(q.P.x, q.P.top + 0.8 + (reduce ? 0 : age * 2.6), q.P.z).project(camera);
      if (pv.z >= 1 || pv.x < -1.1 || pv.x > 1.1 || pv.y < -1.1 || pv.y > 1.1) { q.el.hidden = true; continue; }
      q.el.hidden = false;
      const tr = "translate(" + ((pv.x * 0.5 + 0.5) * w).toFixed(1) + "px," + ((-pv.y * 0.5 + 0.5) * h).toFixed(1) + "px) translate(-50%,-100%) scale(" + clamp(150 / d, 0.72, 1.15).toFixed(3) + ")";
      if (tr !== q.last) { q.el.style.transform = tr; q.last = tr; }
      q.el.style.opacity = (age < 0.2 ? age / 0.2 : age > 2 ? (2.8 - age) / 0.8 : 1).toFixed(2);
    }
  }

  // ── Walls drop to knee height when they stand between you and the rooms
  let wallMode = opts.walls || "cut", roofOn = !!opts.roofs;
  const bc = new T.Vector2((B.x0 + B.x1) / 2, (B.z0 + B.z1) / 2);
  function wallsStep(dt) { const vx = camera.position.x - bc.x, vz = camera.position.z - bc.y, vl = Math.hypot(vx, vz) || 1; const dx = vx / vl, dz = vz / vl; const up = roofOn || wallMode === "up"; const k = reduce ? 1 : 1 - Math.exp(-dt * 9);
    WALLS.forEach((W) => { let tgt = W.full; if (!up) { if (wallMode === "down") tgt = 1.2; else { const dot = W.nx * dx + W.nz * dz; const facing = W.kind === "ext" ? dot > 0.22 : Math.abs(dot) > 0.45; if (facing) tgt = 2.6; } }
      const want = Math.max(0, Math.min(W.full, tgt - W.base)); W.cur += (want - W.cur) * k; const show = W.cur > 0.05; W.o.visible = show; if (show) W.o.scale.y = W.cur;
      const shownTop = W.base + W.cur; W.att.forEach((a) => { a.obj.visible = shownTop >= a.bottom + 0.4 && (W.base === 0 || W.cur > W.full * 0.9); }); });
    ROOF.forEach((o) => (o.visible = roofOn)); }

  // ── Forklift
  let driving = false; const fk = { x: 30, z: 40, yaw: Math.PI / 2, v: 0 }; const keys = new Set();
  function blocked(x, z) { const street = z > 97.6; if (z < 1.5 || z > 126 || x < (street ? -40 : 1.5) || x > (street ? 190 : LOT.w - 1.5)) return true;
    if (z > 94.6 && z < 97.6 && !(x > 4.5 && x < 31.5)) return true;
    const r = 2.6; for (const W of WALLS) { if (W.base > 0) continue; const cx = clamp(x, W.x0, W.x1), cz = clamp(z, W.z0, W.z1); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; } return false; }
  function driveStep(dt) { const f = keys.has("w") || keys.has("arrowup"), b = keys.has("s") || keys.has("arrowdown"), l = keys.has("a") || keys.has("arrowleft"), r = keys.has("d") || keys.has("arrowright");
    const target = f ? 18 : b ? -9 : 0; fk.v += (target - fk.v) * Math.min(1, dt * (target ? 2.2 : 4)); const turn = (l ? 1 : 0) - (r ? 1 : 0); fk.yaw += turn * dt * (1.1 + Math.min(Math.abs(fk.v), 12) * 0.07) * (fk.v < -0.5 ? -1 : 1);
    const nx = fk.x + Math.cos(fk.yaw) * fk.v * dt, nz = fk.z - Math.sin(fk.yaw) * fk.v * dt;
    if (!blocked(nx, nz)) { Gl.tx += nx - fk.x; Gl.tz += nz - fk.z; Cm.tx += nx - fk.x; Cm.tz += nz - fk.z; fk.x = nx; fk.z = nz; } else fk.v *= -0.2;
    forkObj.position.set(fk.x, 0, fk.z); forkObj.rotation.y = fk.yaw; }
  function setDrive(on) { on = !!on; if (on === driving) return; driving = on; keys.clear(); if (on) { stopTour(); selectArea(null, { stay: true }); Gl.tx = fk.x; Gl.tz = fk.z; Gl.r = 70; Gl.ph = clamp(Gl.ph, 0.7, 1.05); canvas.focus({ preventScroll: true }); } }

  // ── Tour
  let touring = false, tourT = 0, tourI = -1;
  function stopTour() { if (!touring) return; touring = false; call("onTour", false); }
  function setTour(on) { if (on) { setDrive(false); touring = true; tourT = 99; tourI = sel ? PLACE_ORDER.indexOf(sel) : -1; } else touring = false; }

  // ── Rolling coal: black smoke from the yard truck's stacks
  const puffs = []; let puffT = 1;
  function makePuffs() { for (let i = 0; i < 22; i++) { const m = new T.MeshLambertMaterial({ color: new T.Color("#262626"), transparent: true, opacity: 0, depthWrite: false }); const o = new T.Mesh(SPH, m); o.visible = false; scene.add(o); puffs.push({ o, life: 0, max: 1, vx: 0, vy: 0, vz: 0 }); } }
  const wp = new T.Vector3();
  function smoke(dt) { if (reduce || !yardTruck) return; puffT -= dt;
    if (puffT <= 0) { puffT = 3.4 + rnd() * 2; yardTruck.updateMatrixWorld(true); yardTruck.userData.stacks.forEach((s) => { for (let j = 0; j < 3; j++) { const p = puffs.find((q) => q.life <= 0); if (!p) break; wp.set(s[0], s[1], s[2]).applyMatrix4(yardTruck.matrixWorld); p.o.position.copy(wp); p.o.position.y += j * 0.6; p.life = p.max = 2.6 + rnd() * 1.2; p.vx = 2.5 + rnd() * 2; p.vy = 7 + rnd() * 3; p.vz = (rnd() - 0.5) * 2; p.o.visible = true; } }); }
    puffs.forEach((p) => { if (p.life <= 0) return; p.life -= dt; const t = 1 - p.life / p.max; p.o.position.x += p.vx * dt; p.o.position.y += p.vy * dt * (1 - t * 0.6); p.o.position.z += p.vz * dt; const s = 0.8 + t * 4.2; p.o.scale.set(s, s, s); p.o.material.opacity = Math.max(0, 0.72 * (1 - t)); if (p.life <= 0) p.o.visible = false; }); }

  // ── Input (on the canvas only, so typing elsewhere in the dashboard never moves the camera)
  const ptrs = new Map(); let pinch = null, dragMode = "rot", moved = 0, lastMove = null, interacted = false;
  const touched = () => { if (!interacted) { interacted = true; call("onInteract"); } };
  const onCtx = (e) => e.preventDefault();
  const onDown = (e) => { canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; dragMode = e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey ? "pan" : "rot"; if (ptrs.size >= 2) pinch = null; stopTour(); touched(); };
  const onMove = (e) => { lastMove = e; if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy); tip.hidden = true;
    if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const dist = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; if (pinch) { Gl.r = clamp((Gl.r * pinch.d) / Math.max(dist, 1), RMIN, RMAX); panBy(mx - pinch.mx, my - pinch.my); } pinch = { d: dist, mx, my }; return; }
    if (dragMode === "rot") { Gl.th -= dx * 0.0062; Gl.ph = clamp(Gl.ph - dy * 0.0048, PHMIN, PHMAX); } else panBy(dx, dy); };
  const onUp = (e) => { const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (was && e.type === "pointerup" && moved < 7 && e.button !== 2 && ptrs.size === 0) clickAt(e.clientX, e.clientY); };
  const onLeave = () => { lastMove = null; setHover(null); hoverEng = null; tip.hidden = true; canvas.classList.remove("hover"); };
  const onWheel = (e) => { e.preventDefault(); Gl.r = clamp(Gl.r * Math.exp(e.deltaY * 0.0011), RMIN, RMAX); stopTour(); touched(); };
  const DRIVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
  const onKey = (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    if (k === "escape") { if (driving) { setDrive(false); call("onDrive", false); } else if (sel || selE || selP != null) { selectArea(null); call("onSelectArea", null); } return; }
    if (driving) { if (DRIVE_KEYS.includes(k)) { keys.add(k); e.preventDefault(); } return; }
    const m = { arrowleft: [40, 0], arrowright: [-40, 0], arrowup: [0, 40], arrowdown: [0, -40], a: [40, 0], d: [-40, 0], w: [0, 40], s: [0, -40] }[k];
    if (m) { panBy(m[0], m[1]); e.preventDefault(); touched(); stopTour(); } else if (k === "q") Gl.th += 0.18; else if (k === "e") Gl.th -= 0.18; else if (k === "+" || k === "=") Gl.r = clamp(Gl.r * 0.85, RMIN, RMAX); else if (k === "-") Gl.r = clamp(Gl.r / 0.85, RMIN, RMAX); };
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
  const onBlur = () => keys.clear();
  canvas.addEventListener("contextmenu", onCtx); canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp); canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false }); canvas.addEventListener("keydown", onKey); canvas.addEventListener("keyup", onKeyUp); canvas.addEventListener("blur", onBlur); addEventListener("blur", onBlur);
  function hoverStep() { if (!lastMove || ptrs.size) return; const e = lastMove; lastMove = null; const h = hitAt(e.clientX, e.clientY);
    setHover(h && !h.engine && h.person == null ? h.area : null); canvas.classList.toggle("hover", !!h);
    const P = h && h.person != null ? CREW.find((q) => q.c.id === h.person) : null, it = h && h.engine ? ENG.find((x) => x.e.id === h.engine) : null;
    const txt = P ? [P.c.name, P.c.role, P.s.label].filter(Boolean).join(" · ") : it ? [it.e.sku, it.e.name, it.e.statusLabel].filter(Boolean).join(" · ") : "";
    if (txt) { tip.textContent = txt; const r = host.getBoundingClientRect(); tip.style.transform = "translate(" + Math.round(e.clientX - r.left + 14) + "px," + Math.round(e.clientY - r.top + 14) + "px)"; tip.hidden = false; hoverEng = it ? h.engine : null; }
    else { tip.hidden = true; hoverEng = null; } }

  // ── Size and the loop
  let W0 = 0, H0 = 0;
  function resize() { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); if (w === W0 && h === H0) return; W0 = w; H0 = h; const asp = w / h; R.setSize(w, h, false); camera.aspect = asp;
    camera.fov = asp < 1 ? Math.min(60, (2 * Math.atan(Math.tan((13 * Math.PI) / 180) / asp) * 180) / Math.PI) : 34; camera.updateProjectionMatrix(); HOME.r = asp < 1 ? 290 : 215; }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) ro.observe(host); else addEventListener("resize", resize);
  let last = performance.now();
  function loop(now) { if (dead) return; const raw = Math.min(0.25, (now - last) / 1000), dt = Math.min(0.05, raw); last = now; clock += raw;
    if (todT < 1) { todT = Math.min(1, todT + raw / 1.2); applyTod(todT); }
    if (driving) driveStep(dt);
    if (touring) { tourT += raw; if (tourT > 5.2) { tourT = 0; tourI = (tourI + 1) % PLACE_ORDER.length; selectArea(PLACE_ORDER[tourI], { tour: true }); call("onSelectArea", PLACE_ORDER[tourI]); } }
    cars.forEach((c) => { c.o.position.x += c.v * dt; if (c.v > 0 && c.o.position.x > 330) c.o.position.x = -180; if (c.v < 0 && c.o.position.x < -180) c.o.position.x = 330; });
    smoke(dt); crewStep(); camStep(raw); wallsStep(raw); hoverStep();
    R.render(scene, camera); placeLabels(); paysStep(); raf = requestAnimationFrame(loop); }

  // ── Build, then start
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  (async () => {
    try {
      const step = async (txt, pct) => { call("onProgress", txt, pct); await nextFrame(); if (dead) throw new Error("disposed"); };
      setTod(opts.tod || "day", true);
      await step("Pouring the slab…", 10); buildGround();
      await step("Raising the walls…", 26); buildWalls();
      await step("Stocking the shelves…", 44); buildInside();
      await step("Parking the trucks…", 62); buildYard(); buildScenery();
      await step("Unloading engines…", 82); buildPickPads(); buildLabels(); makePuffs(); setEngines(opts.engines || []); setCrew(opts.crew || []);
      await step("Turning on the lights…", 96);
      setTod(todKey, true); resize(); Object.assign(Cm, HOME); Object.assign(Gl, HOME); camStep(1); R.render(scene, camera);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (dead) return; SIGNS.forEach((t) => { const d = t.userData; d.draw(d.c.getContext("2d"), d.c.width, d.c.height); t.needsUpdate = true; }); LBL.forEach((L) => (L.w = 0)); PLATES.forEach((P) => (P.w = 0)); WHO.forEach((W) => (W.w = 0)); });
      call("onReady"); raf = requestAnimationFrame(loop);
    } catch (e) { if (!dead) { console.error(e); call("onError", "Something went wrong building the 3D shop. Leave this page and open it again."); } }
  })();

  return {
    setEngines: (list) => { if (LBL.length) setEngines(list); else opts.engines = list; },
    setCrew: (list) => { if (LBL.length) setCrew(list); else opts.crew = list; },
    setCrewOn: (on) => setCrewOn(on),
    pay: (id, text) => pay(id, text),
    selectArea: (id) => selectArea(id || null),
    selectEngine: (id) => selectEngine(id || null),
    selectPerson: (id) => selectPerson(id == null ? null : id),
    setTod: (k) => setTod(k),
    setWalls: (m) => { wallMode = m; },
    setRoofs: (on) => { roofOn = !!on; },
    setLabels: (on) => { labelsOn = !!on; },
    setTour: (on) => setTour(!!on),
    setDrive: (on) => setDrive(on),
    home: () => { setDrive(false); stopTour(); selectArea(null); },
    press: (k, down) => { if (down) keys.add(k); else keys.delete(k); },
    dispose: () => {
      dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); else removeEventListener("resize", resize);
      canvas.removeEventListener("contextmenu", onCtx); canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp); canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel); canvas.removeEventListener("keydown", onKey); canvas.removeEventListener("keyup", onKeyUp); canvas.removeEventListener("blur", onBlur); removeEventListener("blur", onBlur);
      const mats = new Set(), geos = new Set(), texs = new Set();
      scene.traverse((o) => { if (o.geometry) geos.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { mats.add(m); if (m.map) texs.add(m.map); if (m.emissiveMap) texs.add(m.emissiveMap); }); });
      SHARED.forEach((g) => geos.add(g)); geos.forEach((g) => g.dispose()); texs.forEach((t) => t.dispose()); mats.forEach((m) => m.dispose());
      R.dispose(); try { R.forceContextLoss(); } catch (e) { /* already gone */ }
      canvas.remove(); lay.remove(); tip.remove();
    },
  };
}
