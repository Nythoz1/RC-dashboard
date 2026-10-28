import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  // Three pages: the dashboard; the Engine Lab (engine-lab.html, src/engineLab/), which the
  // dashboard's Engine Lab view shows in a frame and which shares its copy of three.js; and the
  // customer's quote page (quote.html, src/quote/), the one page that needs no login.
  build: { rollupOptions: { input: { main: "index.html", lab: "engine-lab.html", quote: "quote.html" } } },
});
