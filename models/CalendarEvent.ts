import mongoose, { Schema, Types } from "mongoose";

const CalendarEventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true },
    allDay: { type: Boolean, default: false },
    calendarId: {
      type: Types.ObjectId,
      ref: "Calendar",
      required: true,
      index: true,
    },
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },

    source: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      index: true,
    },
    sourceId: { type: String, default: null, index: true }, // Google event id
    sourceCalendarId: { type: String, default: null }, // "primary" o.ä.
    sourceEtag: { type: String, default: null },
    sourceUpdatedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

CalendarEventSchema.index({ calendarId: 1, start: 1 });
CalendarEventSchema.index({
  title: "text",
  description: "text",
  location: "text",
});

try {
  mongoose.deleteModel("CalendarEvent");
} catch {}
export const CalendarEvent = mongoose.model(
  "CalendarEvent",
  CalendarEventSchema
);
