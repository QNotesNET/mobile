import { Schema, model, models, Model, Types } from "mongoose";

export type PageScanStatus = "queued" | "processing" | "succeeded" | "failed";

export interface PageScanDoc {
  _id: Types.ObjectId;
  page: Types.ObjectId;          // Ref auf Page
  notebookId: Types.ObjectId;    // Owner-Notebook
  imageUrl: string;              // zuletzt analysiertes Bild
  status: PageScanStatus;
  text?: string;                 // gereinigter Volltext (ohne --kw)
  wa?: string[];
  cal?: string[];
  todo?: string[];
  error?: string | null;         // Fehlermeldung, falls failed
  createdAt?: Date;
  updatedAt?: Date;
}

const PageScanSchema = new Schema<PageScanDoc>(
  {
    page: { type: Schema.Types.ObjectId, ref: "Page", required: true, index: true, unique: true },
    notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
    imageUrl: { type: String, required: true },
    status: { type: String, enum: ["queued", "processing", "succeeded", "failed"], default: "queued", index: true },
    text: String,
    wa: { type: [String], default: [] },
    cal: { type: [String], default: [] },
    todo: { type: [String], default: [] },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

const PageScan: Model<PageScanDoc> =
  (models.PageScan as Model<PageScanDoc>) || model<PageScanDoc>("PageScan", PageScanSchema);

export default PageScan;
