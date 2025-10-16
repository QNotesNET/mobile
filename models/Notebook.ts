import mongoose, { Schema, InferSchemaType, Types } from "mongoose";

const NotebookSchema = new Schema({
  title: { type: String, required: true, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sharedWith: [{ type: Schema.Types.ObjectId, ref: "User" }],
  projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },

}, { timestamps: true });

NotebookSchema.index({ ownerId: 1, createdAt: -1 });

export type NotebookDoc = InferSchemaType<typeof NotebookSchema> & { _id: Types.ObjectId };

export default mongoose.models.Notebook ||
  mongoose.model<NotebookDoc>("Notebook", NotebookSchema);
