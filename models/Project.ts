// models/Project.ts
import { Schema, model, models, Types, InferSchemaType, Model } from "mongoose";

const ProjectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // optional – für später:
    description: { type: String, default: "" },
    status: { type: String, default: "open" }, // z.B. "open" | "done" | "archived"
    // notebooks: [{ type: Schema.Types.ObjectId, ref: "Notebook" }], // kannst du später aktivieren
  },
  { timestamps: true }
);

ProjectSchema.index({ ownerId: 1, updatedAt: -1 });

export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & { _id: Types.ObjectId };

const Project: Model<ProjectDoc> =
  (models.Project as Model<ProjectDoc>) || model<ProjectDoc>("Project", ProjectSchema);

export default Project;
