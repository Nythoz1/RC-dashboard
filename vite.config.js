import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  // Two pages: the dashboard, and the Engine Lab (engine-lab.html, src/engineLab/), which the
  // dashboard's Engine Lab view shows in a frame. It shares the dashboard's copy of three.js.
  build: { rollupOptions: { input: { main: "index.html", lab: "engine-lab.html" } } },
});
