import mongoose, { Schema, model, models, Types } from "mongoose";

const TaskListSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },

    // Referenz auf User (aus "users" Collection)
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

TaskListSchema.index({ userId: 1, name: 1 }, { unique: false });

export const TaskList = models.TaskList || model("TaskList", TaskListSchema);
