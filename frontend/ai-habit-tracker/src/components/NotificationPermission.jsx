import { useState } from "react";
import usePushNotifications from "../hooks/usePushNotifications.js";

// Small, fixed-position card shown to logged-in users to enable push.
// Hides itself on success, when already granted AND subscribed, or when unsupported.
// Stays visible if permission was granted but the subscription save failed (recovery).
export default function NotificationPermission() {
  const { supported, permission, subscribed, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | denied | unsupported | unavailable | error
  const [busy, setBusy] = useState(false);

  // Nothing to show if push is unsupported, or already granted AND subscribed.
  if (!supported || (permission === "granted" && subscribed) || !visible) return null;

  const handleEnable = async () => {
    setBusy(true);
    const res = await subscribe();
    setBusy(false);

    if (res.ok) {
      setVisible(false);
      return;
    }

    if (res.reason === "denied") setStatus("denied");
    else if (res.reason === "no-vapid-key") setStatus("unavailable");
    else if (res.reason === "unsupported") setStatus("unsupported");
    else if (res.reason === "sw-timeout") setStatus("sw-timeout");
    else setStatus("error");
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Stay on track 🔔
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Get a friendly nudge for unfinished habits — even when the tab is closed.
      </p>

      {status === "denied" && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          Notifications blocked — enable them in your browser settings.
        </p>
      )}
      {status === "unsupported" && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Notifications aren&apos;t supported in this browser.
        </p>
      )}
      {status === "unavailable" && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Notifications aren&apos;t available right now. Please try again later.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Something went wrong. Please try again.
        </p>
      )}
      {status === "sw-timeout" && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Could not reach the notification service. Please refresh and try again.
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable Notifications"}
        </button>
      </div>
    </div>
  );
}
