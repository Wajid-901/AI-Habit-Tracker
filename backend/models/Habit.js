import mongoose from "mongoose";

const CATEGORIES = [
  "Health",
  "Fitness",
  "Productivity",
  "Learning",
  "Social",
  "Finance",
  "Creative",
  "Other",
  "Mindfulness",
];

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      enum: CATEGORIES,
      default: "Other",
    },

    frequency: {
      type: String,
      enum: ["daily", "weekly"],
      default: "daily",
    },

    targetDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 7,
    },

    color: {
      type: String,
      default: "#6366F1",
    },

    icon: {
      type: String,
      default: "default-icon",
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const HABIT_CATEGORIES = CATEGORIES;

const Habit = mongoose.model("Habit", habitSchema);

export default Habit;