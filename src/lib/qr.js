// QR tags for engines. A tag holds this dashboard's own address with ?engine=<id>; scanning it
// opens the dashboard, asks for a login if the phone isn't signed in, then opens that engine's
// record. Nothing about the engine is in the code itself, and nothing becomes public.
// The `qrcode` library loads on demand, so it stays out of the main bundle.

export const ENGINE_PARAM = "engine";

// The address a tag points at: this page, with only ?engine=<id>.
export function engineUrl(id) {
  const u = new URL(window.location.href);
  u.search = ""; u.hash = "";
  u.searchParams.set(ENGINE_PARAM, String(id));
  return u.toString();
}

// The engine id a scanned tag opened the dashboard with (or null), taken off the address bar so
// a reload doesn't open it again.
export function takeEngineParam() {
  try {
    const u = new URL(window.location.href);
    const id = u.searchParams.get(ENGINE_PARAM);
    if (!id) return null;
    u.searchParams.delete(ENGINE_PARAM);
    window.history.replaceState(window.history.state, "", u.toString());
    return id;
  } catch (e) { return null; }
}

// The QR code as an SVG string, black on white (it prints and scans the same in either theme).
export async function qrSvg(text) {
  const QR = (await import("qrcode")).default;
  return QR.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
}
