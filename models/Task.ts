// models/Task.ts
import mongoose, { Schema, Types } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    note: { type: String, trim: true, default: "" },
    completed: { type: Boolean, default: false },
    dueAt: { type: Date, default: null, index: true },
    order: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high"],
      default: "none",
      index: true,
    },

    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    listId: {
      type: Types.ObjectId,
      ref: "TaskList",
      required: true,
      index: true,
    },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

TaskSchema.index({ listId: 1, order: 1 });
TaskSchema.index({ listId: 1, completed: 1 });
TaskSchema.index({ title: "text", note: "text" });

// >>> wichtiger Teil: altes Model aus dem Cache entfernen (nur in Dev nötig)
try {
  mongoose.deleteModel("Task");
} catch {}
export const Task = mongoose.model("Task", TaskSchema);
