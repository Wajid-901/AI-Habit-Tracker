import PushSubscription from "../models/PushSubscription.js";
import { sendNotification } from "../services/pushService.js";

// POST /api/notifications/subscribe
// Upsert (keyed by endpoint) the browser push subscription for the logged-in
// user. Re-subscribing does not duplicate because `endpoint` is unique.
// 201 on a new subscription, 200 on an existing one being refreshed.
export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        message: "endpoint and keys.p256dh/keys.auth are required",
      });
    }

    const existing = await PushSubscription.findOne({ endpoint });

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          userId: req.user.id,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(existing ? 200 : 201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notifications/unsubscribe
// Remove the logged-in user's subscription(s). If `endpoint` is provided in the
// body only that one is removed; otherwise all of the user's subscriptions are.
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    const filter = { userId: req.user.id };

    if (endpoint) filter.endpoint = endpoint;

    await PushSubscription.deleteMany(filter);

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/notifications/test
// Send a test notification to every subscription the logged-in user has.
// 404 if the user has no subscription yet.
export const sendTestNotification = async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.user.id });

    if (!subs.length) {
      return res.status(404).json({ message: "No subscription found" });
    }

    let sent = 0;

    for (const sub of subs) {
      const result = await sendNotification(sub, {
        title: "Habit Tracker",
        body: "Push notifications are working! 🔔",
        icon: "/pwa-192x192.png",
      });

      if (result === "sent") sent += 1;
    }

    return res.status(200).json({ success: true, sent });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
