// Custom service worker (compiled by vite-plugin-pwa injectManifest).
import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

// autoUpdate: take over from the previous SW immediately.
self.skipWaiting();
clientsClaim();

// Precache the build assets injected by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

// Show a notification when a push arrives.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = event.data ? { body: event.data.text() } : {};
  }

  const title = data.title || "Habit Tracker";
  const options = {
    body: data.body || "",
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing app window, or open one, when the notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (client.url.includes(target) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow ? clients.openWindow(target) : null;
      })
  );
});
