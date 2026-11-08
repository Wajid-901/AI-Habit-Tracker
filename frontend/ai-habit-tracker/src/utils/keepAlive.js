// keepAlive.js
// Pings the backend /api/health every 14 minutes so Render's free tier
// never goes to sleep while a user has the app open.
// This eliminates the 30-60 second cold start on login/register.

const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
const HEALTH_URL = `${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:8000"}/api/health`;

let timer = null;

async function ping() {
  try {
    await fetch(HEALTH_URL, { method: "GET", cache: "no-store" });
  } catch {
    // silent — if the server is down we don't need to log noise
  }
}

export function startKeepAlive() {
  // Ping immediately on startup to warm the server as soon as the app loads
  ping();
  // Then ping every 14 minutes
  if (!timer) {
    timer = setInterval(ping, INTERVAL_MS);
  }
}

export function stopKeepAlive() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
