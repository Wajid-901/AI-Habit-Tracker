import mongoose from "mongoose";

// Stores a browser Push API subscription for a user.
// `endpoint` is unique so re-subscribing upserts instead of duplicating.
// `createdAt`/`updatedAt` are auto-managed via timestamps (matches other models).
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
