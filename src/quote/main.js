// The customer's quote page (quote.html, migration 0018). The link is /quote.html#t=<token>: the token
// sits after the #, so it never reaches a server log or a referrer. The page asks the database for
// that one quote (quote_view, with the public anon key) and sends the answer back (quote_decide).
// Nothing from the dashboard is loaded here.
const URL_ = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const app = document.getElementById("app");
const tok = new URLSearchParams(location.hash.replace(/^#/, "")).get("t") || "";

const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const money = (n) => "$" + (+n || 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const taxName = (r) => { const p = Math.round((+r || 0) * 1000) / 10; return (Math.abs(p - 5) < 0.01 ? "GST " : "HST ") + p + "%"; };
const longDate = (iso) => { const d = /^\d{4}-\d{2}-\d{2}/.test(String(iso || "")) ? new Date(String(iso).slice(0, 10) + "T12:00:00Z") : iso ? new Date(iso) : null; return d && !isNaN(d) ? d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : ""; };
const initials = (n) => String(n || "").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase() || "Q";

async function rpc(fn, body) {
  const r = await fetch(URL_ + "/rest/v1/rpc/" + fn, { method: "POST", headers: { "Content-Type": "application/json", apikey: ANON, Authorization: "Bearer " + ANON }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

const GONE = {
  gone: ["This link doesn't work any more", "The shop may have sent you a newer one. Call or email them and they'll send it again."],
  expired: ["This quote link has expired", "Prices can change. Ask the shop for an up-to-date quote."],
  none: ["No quote here", "Open the link exactly as the shop sent it."],
};
function showGone(kind, shop) {
  const [t, sub] = GONE[kind] || GONE.gone;
  app.innerHTML = (shop ? shopHead(shop) : "") + `<div class="card"><h2 style="font-family:var(--fd);margin:0 0 6px">${esc(t)}</h2><p style="margin:0;color:var(--tx2)">${esc(sub)}</p></div>`;
}
function shopHead(s) {
  const bits = [s.phone && `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ""))}">${esc(s.phone)}</a>`, s.email && `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`,
    s.site && `<a href="https://${esc(s.site.replace(/^https?:\/\//, ""))}" rel="noopener">${esc(s.site.replace(/^https?:\/\//, ""))}</a>`, s.address && `<span>${esc(s.address)}</span>`].filter(Boolean);
  return `<header class="shop"><div class="logo" aria-hidden="true">${esc(initials(s.name))}</div><div><h1>${esc(s.name)}</h1>${s.tagline ? `<div class="tag">${esc(s.tagline)}</div>` : ""}</div></header>` +
    (bits.length ? `<div class="contact">${bits.join("")}</div>` : "");
}

let data = null, step = "";
function render() {
  const { shop, quote: q, decision } = data;
  document.title = (q.num ? "Quote " + q.num : "Your quote") + " · " + shop.name;
  const lines = q.items.map((i) => `<tr><td>${esc(i.d)}</td><td class="n">${+i.q || 0}</td><td class="n">${money(i.r)}</td><td class="n">${money((+i.q || 0) * (+i.r || 0))}</td></tr>`).join("");
  let state = "";
  if (decision) {
    const ok = decision.decision === "approved";
    state = `<div class="state ${ok ? "ok" : "no"}" role="status"><b>${ok ? "✓ Approved" : "Declined"}</b>${ok ? `Approved by ${esc(decision.name)} on ${esc(longDate(decision.at))}. Thank you, ${esc(shop.name)} will be in touch to book it in.` : `You declined this quote on ${esc(longDate(decision.at))}. ${esc(shop.name)} has been told. If you change your mind, give them a call.`}</div>`;
  } else if (q.status === "invoiced") {
    state = `<div class="state ok" role="status"><b>Already invoiced</b>This quote has gone ahead and been invoiced.</div>`;
  }
  const form = decision || q.status === "invoiced" ? "" : `
    <section class="card noprint" aria-labelledby="dh"><h2 id="dh" style="font-family:var(--fd);font-size:22px;margin:0">Go ahead with this quote?</h2>
      <label for="nm">Your name</label><input id="nm" autocomplete="name" maxlength="80" placeholder="Who is approving it">
      <label for="nt">Anything to add? <span style="font-weight:400;color:var(--mt)">(optional)</span></label><textarea id="nt" maxlength="500" placeholder="A good day to bring it in, a PO number…"></textarea>
      <div class="row">${step === "decline"
        ? `<button class="go" id="no2" style="background:var(--r);border-color:var(--r)">Yes, decline the quote</button><button id="back">Go back</button>`
        : `<button class="go" id="yes">✓ Approve ${money(q.total)}</button><button id="no">Decline</button>`}</div>
      <div class="why" id="why">${step === "decline" ? "The shop will be told you declined." : "Type your name to approve. It counts as your sign-off."}</div><div class="err" id="err" role="alert"></div>
    </section>`;
  app.innerHTML = shopHead(shop) + state + `
    <article class="card" aria-labelledby="qn"><div class="qhead"><div><div class="kick">Quote</div><div class="qnum" id="qn">${esc(q.num || "")}</div></div>
      <div style="text-align:right">${q.date ? `<div class="kick">${esc(longDate(q.date))}</div>` : ""}${q.customer ? `<div class="for">For ${esc(q.customer)}</div>` : ""}</div></div>
      ${q.description ? `<p class="desc">${esc(q.description)}</p>` : ""}
      <table><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Price</th><th scope="col">Amount</th></tr></thead><tbody>${lines}</tbody></table>
      <div class="tot"><span>Subtotal</span><span>${money(q.sub)}</span><span>${esc(taxName(q.taxRate))}</span><span>${money(q.tax)}</span><span class="big">Total</span><span class="bign">${money(q.total)} <span style="font-size:13px;color:var(--mt)">CAD</span></span></div>
      ${q.validUntil ? `<div class="valid">Good for ${esc(q.validUntil)}${q.date ? " from " + esc(longDate(q.date)) : ""}.</div>` : ""}
    </article>` + form + `<p class="small noprint"><button id="pr">🖨 Print or save as PDF</button></p>`;
  const $ = (id) => document.getElementById(id);
  $("pr").onclick = () => window.print();
  if (!$("nm")) return;
  const keep = (k) => { const v = sessionStorage.getItem("q:" + k); if (v && $(k)) $(k).value = v; $(k) && $(k).addEventListener("input", () => { try { sessionStorage.setItem("q:" + k, $(k).value); } catch (e) { /* private mode */ } }); };
  try { keep("nm"); keep("nt"); } catch (e) { /* storage blocked */ }
  const send = async (dec) => {
    const name = $("nm").value.trim(), note = $("nt").value.trim();
    if (dec === "approved" && !name) { $("err").textContent = "Type your name first, so the shop knows who approved it."; $("nm").focus(); return; }
    app.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    try {
      const r = await rpc("quote_decide", { p_token: tok, p_decision: dec, p_name: name, p_note: note });
      if (r && r.error) {
        if (r.error === "decided" || r.error === "invoiced") { data = await rpc("quote_view", { p_token: tok }); render(); return; }
        if (GONE[r.error]) { showGone(r.error, shop); return; }
        throw new Error(r.error);
      }
      data = r; step = ""; render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      app.querySelectorAll("button").forEach((b) => { b.disabled = false; });
      $("err").textContent = "That didn't go through. Check your connection and try again.";
    }
  };
  if ($("yes")) $("yes").onclick = () => send("approved");
  if ($("no")) $("no").onclick = () => { step = "decline"; render(); };
  if ($("back")) $("back").onclick = () => { step = ""; render(); };
  if ($("no2")) $("no2").onclick = () => send("declined");
}

(async () => {
  if (!URL_ || !ANON) { app.innerHTML = `<div class="card">Quote links need the shop's cloud setup.</div>`; return; }
  if (!/^[0-9a-f]{64}$/.test(tok)) { showGone("none"); return; }
  try {
    data = await rpc("quote_view", { p_token: tok });
    if (!data || data.error) { showGone(data && data.error); return; }
    render();
  } catch (e) {
    app.innerHTML = `<div class="card"><h2 style="font-family:var(--fd);margin:0 0 6px">Couldn't load the quote</h2><p style="margin:0 0 12px">Check your connection and try again.</p><button onclick="location.reload()">↻ Try again</button></div>`;
  }
})();
