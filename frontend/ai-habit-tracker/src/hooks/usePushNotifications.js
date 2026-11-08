import { useState, useCallback, useEffect } from "react";
import api from "../api/axios.js";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Browser push support check
const supported =
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  typeof window !== "undefined" &&
  "PushManager" in window;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// Race a promise against a ms timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Try to create a fresh push subscription with the current VAPID key
async function createSubscription(reg) {
  if (!VAPID_PUBLIC_KEY) throw new Error("no-vapid-key");
  try {
    return await withTimeout(
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }),
      10_000
    );
  } catch (err) {
    // Stale key: clear old sub and retry once
    if (err?.name === "DOMException" || err instanceof DOMException) {
      const stale = await reg.pushManager.getSubscription();
      if (stale) await stale.unsubscribe();
      return await withTimeout(
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }),
        10_000
      );
    }
    throw err;
  }
}

export default function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);

  // On mount: if permission already granted, ensure a valid subscription exists.
  // If the stored subscription is stale (VAPID mismatch), silently replace it.
  useEffect(() => {
    if (!supported || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!VAPID_PUBLIC_KEY) return;

    let cancelled = false;
    (async () => {
      try {
        const reg = await withTimeout(navigator.serviceWorker.ready, 10_000);
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          // Permission granted but no sub — silently re-subscribe
          sub = await createSubscription(reg);
          await api.post("/notifications/subscribe", { endpoint: sub.endpoint, keys: sub.toJSON().keys });
        }

        if (!cancelled) setSubscribed(true);
      } catch {
        // Leave subscribed=false — card will offer to retry
        if (!cancelled) setSubscribed(false);
      }
    })();
    return () => { cancelled = true; };
  }, [permission]);

  const subscribe = useCallback(async () => {
    if (!supported || typeof Notification === "undefined") return { ok: false, reason: "unsupported" };
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

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        try {
          sub = await createSubscription(reg);
        } catch (err) {
          if (err?.message === "timeout") return { ok: false, reason: "sw-timeout" };
          if (err?.message === "no-vapid-key") return { ok: false, reason: "no-vapid-key" };
          return { ok: false, reason: "network", error: err };
        }
      }

      await api.post("/notifications/subscribe", { endpoint: sub.endpoint, keys: sub.toJSON().keys });
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
