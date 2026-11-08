import { useState } from "react";
import usePushNotifications from "../hooks/usePushNotifications.js";

export default function NotificationPermission() {
  const { supported, permission, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState("idle");
  const [busy, setBusy] = useState(false);

  // Hide if push is unsupported, permission already granted, or dismissed
  if (!supported || permission === "granted" || !visible) return null;

  const handleEnable = async () => {
    setBusy(true);
    const res = await subscribe();
    setBusy(false);
    if (res.ok) { setVisible(false); return; }
    if (res.reason === "denied") setStatus("denied");
    else if (res.reason === "no-vapid-key") setStatus("unavailable");
    else if (res.reason === "unsupported") setStatus("unsupported");
    else if (res.reason === "sw-timeout") setStatus("sw-timeout");
    else setStatus("error");
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 max-w-xs rounded-xl border border-[var(--divider)] bg-[var(--surface-strong)] backdrop-blur-xl p-4 shadow-xl">
      <p className="text-sm font-semibold">Stay on track 🔔</p>
      <p className="mt-1 text-xs text-soft">
        Get a nudge for unfinished habits — even when the tab is closed.
      </p>

      {status === "denied" && (
        <p className="mt-2 text-xs text-rose-500">Blocked — enable notifications in your browser settings.</p>
      )}
      {status === "unsupported" && (
        <p className="mt-2 text-xs text-amber-500">Not supported in this browser.</p>
      )}
      {status === "unavailable" && (
        <p className="mt-2 text-xs text-amber-500">Not available right now — try again later.</p>
      )}
      {status === "sw-timeout" && (
        <p className="mt-2 text-xs text-amber-500">Service unavailable — refresh and retry.</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-amber-500">Something went wrong — please try again.</p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-soft hover:text-[var(--text)]"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable Notifications"}
        </button>
      </div>
    </div>
  );
}
