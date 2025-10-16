import mongoose, { Schema, Types } from "mongoose";

const CalendarSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    color: { type: String, default: "#000000" },
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

try {
  mongoose.deleteModel("Calendar");
} catch {}
export const Calendar = mongoose.model("Calendar", CalendarSchema);
