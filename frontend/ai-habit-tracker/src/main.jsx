import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { registerSW } from "virtual:pwa-register";
import { startKeepAlive } from "./utils/keepAlive.js";
import "./index.css";
import App from "./App.jsx";

// Register the service worker with auto-update.
registerSW({ immediate: true });

// Ping the backend immediately so Render's free tier warms up before
// the user even reaches the login form. Keeps pinging every 14 min.
startKeepAlive();

// When the new SW activates and claims this client, it sends SW_UPDATED.
// Reloading here ensures the app picks up freshly precached assets
// without the user needing to delete and reinstall the PWA.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATED") {
      window.location.reload();
    }
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
