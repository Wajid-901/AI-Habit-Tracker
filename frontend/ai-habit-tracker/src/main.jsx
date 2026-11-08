import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { registerSW } from "virtual:pwa-register";
import { startKeepAlive } from "./utils/keepAlive.js";
import "./index.css";
import App from "./App.jsx";

registerSW({ immediate: true });

// Warm the Render backend immediately to avoid cold-start delays on login
startKeepAlive();

// Reload when the new SW activates so fresh assets are served
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATED") window.location.reload();
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
