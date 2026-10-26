// engine-lab.html entry: picks the engine from ?engine=<id> (ISX15 when missing or unknown), loads its
// definition on demand and starts the lab. The list of engines lives in ./engines/index.js.
import { ENGINES, engineIdOf } from "./engines/index.js";
import { runLab } from "./core.js";

const q = new URLSearchParams(location.search);
const id = engineIdOf(q.get("engine"));
const sel = document.getElementById("engSel");
sel.innerHTML = ENGINES.map((e) => `<option value="${e.id}">${e.label}</option>`).join("");
sel.value = id;
sel.onchange = () => { const u = new URL(location.href); u.searchParams.set("engine", sel.value); ["part", "parts", "why"].forEach((k) => u.searchParams.delete(k)); location.href = u.toString(); };
ENGINES.find((e) => e.id === id).load().then((E) => runLab(E, {
  part: q.get("part") || "",
  parts: (q.get("parts") || "").split(",").map((s) => s.trim()).filter(Boolean),
  why: q.get("why") || "",
})).catch((e) => {
  console.error(e);
  const l = document.getElementById("loading");
  if (l) l.textContent = /webgl|context/i.test(String(e && e.message)) ? "This browser can't show 3D here (WebGL is off or not supported). Try Chrome, Edge or Safari with hardware acceleration on." : "The engine didn't load. Reload the page to try again.";
});
