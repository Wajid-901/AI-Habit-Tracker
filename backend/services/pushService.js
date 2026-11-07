import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

// Initialize web-push with VAPID details. If any VAPID env var is missing we
// log a clear warning and skip setup so the rest of the app still boots — we do
// NOT throw. Callers that send notifications will simply fail per-subscription.
export const initPush = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
    console.warn(
      "[pushService] VAPID keys are not fully configured. " +
        "Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_EMAIL in your .env " +
        "to enable push notifications."
    );
    return;
  }

  // Accept either a bare email (you@example.com) or an existing "mailto:" prefix.
  const subject = /^mailto:/.test(VAPID_EMAIL)
    ? VAPID_EMAIL
    : `mailto:${VAPID_EMAIL}`;

  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
};

// Normalize a stored PushSubscription (or any {endpoint, keys} object) into the
// plain shape web-push expects, so mongoose documents work transparently.
const toPushSubscription = (sub) => ({
  endpoint: sub.endpoint,
  keys: {
    p256dh: sub.keys?.p256dh,
    auth: sub.keys?.auth,
  },
});

/**
 * Send a push notification to a single subscription.
 *
 * @param {object} subscription - { endpoint, keys: { p256dh, auth } }
 * @param {object|string} payload - notification object ({title, body, icon, data})
 *                                 or a pre-stringified body
 * @returns {Promise<"sent"|"removed"|"failed">} Never throws.
 *
 * Invalid/expired subscriptions (HTTP 404/410) are deleted from the DB.
 * All other errors are logged and swallowed so one bad subscription cannot
 * abort a batch send (e.g. the daily cron).
 */
export const sendNotification = async (subscription, payload) => {
  const sub = toPushSubscription(subscription);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);

  try {
    await webpush.sendNotification(sub, body);
    return "sent";
  } catch (err) {
    const status = err?.statusCode;

    // 404/410 => subscription is no longer valid; remove it from the DB.
    if (status === 404 || status === 410) {
      try {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      } catch (delErr) {
        console.error(
          "[pushService] Failed to delete expired subscription:",
          delErr.message
        );
      }
      return "removed";
    }

    // Network, rate-limit, 5xx, etc. — log and continue without throwing.
    console.error(
      `[pushService] sendNotification failed (status ${
        status || "unknown"
      }):`,
      err.message
    );
    return "failed";
  }
};

/**
 * AI INTEGRATION POINT
 * -------------------
 * This is the single, swappable place where reminder message text is produced.
 * It is intentionally kept separate from the delivery path (sendNotification) so
 * the body can later be replaced with an async AI-generated message (e.g. Groq)
 * using the same `context` shape, without touching the send logic.
 *
 * No AI generation is implemented yet — this is the static version.
 *
 * context shape:
 *   {
 *     user:             <User doc>,
 *     totalToday:       <Number>  total habits due today,
 *     completedCount:   <Number>  habits completed today,
 *     unfinishedHabits: [{ habit: <Habit doc>, streak: <Number> }]  (not done today)
 *   }
 *
 * @returns {string|null} a message string, or null when there is nothing to send.
 */
export const buildReminderMessage = (context) => {
  const unfinishedHabits = context?.unfinishedHabits || [];

  if (unfinishedHabits.length === 0) return null;

  if (unfinishedHabits.length === 1) {
    const { habit, streak } = unfinishedHabits[0];

    if (streak >= 2) {
      return `🔥 Don't lose your ${streak}-day ${habit.name} streak.`;
    }

    return `${habit.name} is the only habit left today.`;
  }

  return `${unfinishedHabits.length} habits still waiting today — don't lose your consistency.`;
};

/**
 * Delete expired/stale subscriptions. Web Push has no reliable expiry field;
 * the primary invalidation signal is the 404/410 handled in sendNotification.
 * This helper is a conservative cleanup hook for stale entries (default 180 days)
 * and is never auto-invoked — call it manually if periodic pruning is wanted.
 */
export const deleteExpiredSubscriptions = async (maxAgeDays = 180) => {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const result = await PushSubscription.deleteMany({ createdAt: { $lt: cutoff } });
  return result?.deletedCount || 0;
};

// Initialize once at module load.
initPush();
