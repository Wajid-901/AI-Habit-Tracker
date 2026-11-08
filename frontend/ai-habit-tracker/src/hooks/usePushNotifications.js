import { useState, useCallback, useEffect } from "react";
import api from "../api/axios.js";

// Backend VAPID public key (base64url). Must equal backend VAPID_PUBLIC_KEY.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Whether this browser can do Web Push at all.
const supported =
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  typeof window !== "undefined" &&
  "PushManager" in window;

// Convert a base64url public key to the Uint8Array web-push expects.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// Races a promise against a timeout. Rejects with Error('timeout') if ms elapses first.
function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms)
  );
  return Promise.race([promise, timer]);
}

// Web Push subscription helper.
// Returns { supported, permission, subscribed, subscribe, unsubscribe }.
// subscribe() resolves to { ok: true } or { ok: false, reason } where reason is
// one of: "unsupported", "no-vapid-key", "denied", "sw-timeout", "network".
export default function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);

  // When permission is granted, check whether a push subscription already
  // exists. Lets the UI hide for already-subscribed users and re-surface for
  // granted-but-unsubscribed users (recovery after a failed save).
  useEffect(() => {
    if (!supported || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await withTimeout(navigator.serviceWorker.ready, 10_000);
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!sub);
      } catch {
        /* ignore — leaves subscribed=false so the card stays recoverable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permission]);

  const subscribe = useCallback(async () => {
    if (!supported || typeof Notification === "undefined") {
      return { ok: false, reason: "unsupported" };
    }
    if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "no-vapid-key" };

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return { ok: false, reason: "denied" };

      let reg;
      try {
        reg = await withTimeout(navigator.serviceWorker.ready, 10_000);
      } catch {
        return { ok: false, reason: "sw-timeout" };
      }

      // Reuse an existing subscription if present (idempotent — backend upserts).
      // If one exists but was created with a different VAPID key it will throw a
      // DOMException when we try to use it — unsubscribe it and re-subscribe.
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        try {
          sub = await withTimeout(
            reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            }),
            10_000
          );
        } catch (err) {
          if (err?.message === "timeout") return { ok: false, reason: "sw-timeout" };
          // DOMException: likely a stale subscription with a mismatched VAPID key.
          // Unsubscribe and retry once.
          if (err?.name === "DOMException" || err instanceof DOMException) {
            try {
              const staleSub = await reg.pushManager.getSubscription();
              if (staleSub) await staleSub.unsubscribe();
              sub = await withTimeout(
                reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                }),
                10_000
              );
            } catch {
              return { ok: false, reason: "vapid-mismatch" };
            }
          } else {
            return { ok: false, reason: "network", error: err };
          }
        }
      }

      await api.post("/notifications/subscribe", {
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys,
      });

      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: "network", error: err };
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!supported) return { ok: false, reason: "unsupported" };

    try {
      const reg = await withTimeout(navigator.serviceWorker.ready, 10_000);
      const sub = await reg.pushManager.getSubscription();

      if (!sub) return { ok: false, reason: "no-subscription" };

      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await api.delete("/notifications/unsubscribe", { data: { endpoint } });

      setSubscribed(false);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: "network", error: err };
    }
  }, []);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}
