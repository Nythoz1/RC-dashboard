import React from "react";
import { createRoot } from "react-dom/client";
import App from "./RollinCoalDashboard.jsx";

// Note: StrictMode is intentionally omitted. It double-invokes effects in dev,
// which would fire the load/save storage effects twice against the real DB.
createRoot(document.getElementById("root")).render(<App />);
