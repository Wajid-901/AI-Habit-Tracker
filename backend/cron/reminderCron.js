import cron from "node-cron";
import User from "../models/User.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import PushSubscription from "../models/PushSubscription.js";
import { todayKey, calcStreak } from "../utils/dateHelpers.js";
import { buildReminderMessage, sendNotification } from "../services/pushService.js";

// Daily reminder run. For every user, load today's habits, find which are not
// yet completed, build a reminder message through the AI seam and push it to
// that user's subscriptions. Users with everything done get no notification.
const runReminders = async () => {
  try {
    const users = await User.find({}, "_id");

    for (const user of users) {
      try {
        const userId = user._id;

        // Every non-archived habit is "due today" (the Habit schema has no
        // per-day-of-week mask — same assumption logController.getToday uses).
        const habits = await Habit.find({ userId, isArchived: false });

        if (!habits.length) continue;

        // Completed today = existence of a HabitLog row for today's date key.
        const completedIds = new Set(
          (
            await HabitLog.find({
              userId,
              completedDate: todayKey(),
            }).distinct("habitId")
          ).map(String)
        );

        // Build unfinished habits with their current streak.
        const unfinishedHabits = [];

        for (const habit of habits) {
          if (completedIds.has(String(habit._id))) continue;

          const logs = await HabitLog.find({ userId, habitId: habit._id })
            .sort({ completedDate: -1 })
            .select("completedDate -_id");

          const { current } = calcStreak(logs.map((l) => l.completedDate));

          unfinishedHabits.push({ habit, streak: current });
        }

        // All habits completed today -> nothing to send.
        if (!unfinishedHabits.length) continue;

        const message = buildReminderMessage({
          user,
          totalToday: habits.length,
          completedCount: habits.length - unfinishedHabits.length,
          unfinishedHabits,
        });

        // The seam may return null (e.g. all done) — skip if so.
        if (!message) continue;

        const subs = await PushSubscription.find({ userId });

        if (!subs.length) continue;

        let sent = 0;

        for (const sub of subs) {
          const result = await sendNotification(sub, {
            title: "Habit Tracker",
            body: message,
            icon: "/pwa-192x192.png",
            data: { url: "/" },
          });

          if (result === "sent") sent += 1;
        }

        console.log(
          `[reminderCron] sent ${sent} notification(s) to user ${userId}`
        );
      } catch (err) {
        // A failure for one user must not stop the whole run.
        console.error(`[reminderCron] error for user ${user._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[reminderCron] run failed:", err.message);
  }
};

// Schedule daily at 8:00 PM (server local time).
const task = cron.schedule("0 20 * * *", runReminders);

export { runReminders, task };
