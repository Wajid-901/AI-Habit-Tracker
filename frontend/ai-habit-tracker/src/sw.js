import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

// After activating, tell all open tabs to reload so they pick up new assets
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) client.postMessage({ type: "SW_UPDATED" });
    })
  );
});

precacheAndRoute(self.__WB_MANIFEST);

// Show notification when a push arrives
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = event.data ? { body: event.data.text() } : {}; }
  event.waitUntil(
    self.registration.showNotification(data.title || "Habit Tracker", {
      body: data.body || "",
      icon: data.icon || "/pwa-192x192.png",
      badge: data.badge || "/pwa-192x192.png",
      data: data.data || {},
    })
  );
});

// Focus existing window or open a new one on notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      return clients.openWindow ? clients.openWindow(target) : null;
    })
  );
});
