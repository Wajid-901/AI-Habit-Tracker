// Pings /api/health every 14 min to prevent Render free tier cold starts
const INTERVAL_MS = 14 * 60 * 1000;
const HEALTH_URL = `${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:8000"}/api/health`;

let timer = null;

async function ping() {
  try { await fetch(HEALTH_URL, { method: "GET", cache: "no-store" }); } catch { /* silent */ }
}

export function startKeepAlive() {
  ping();
  if (!timer) timer = setInterval(ping, INTERVAL_MS);
}

export function stopKeepAlive() {
  if (timer) { clearInterval(timer); timer = null; }
}
