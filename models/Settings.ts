// models/Setting.ts
import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const SubSchema = new Schema(
  {
    model: { type: String, default: "" },       // z.B. "gpt-4o-mini"
    resolution: { type: String, default: "" },  // z.B. "low" | "medium" | "high"
    prompt: { type: String, default: "" },
  },
  { _id: false }
);

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, default: "global" },

    // Bilderkennung (Vision)
    vision: { type: SubSchema, default: () => ({}) },

    // Seitennummern-Erkennung (OCR-ish)
    pageDetect: { type: SubSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "settings" }
);

export type SettingDoc = InferSchemaType<typeof SettingSchema>;

const Setting: Model<SettingDoc> =
  (mongoose.models.Setting as Model<SettingDoc>) ||
  mongoose.model<SettingDoc>("Setting", SettingSchema);

export default Setting;
