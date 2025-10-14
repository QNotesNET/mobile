// models/PagesContext.ts
import { Schema, model, models, Model, Types } from "mongoose";

export interface PagesContextDoc {
  _id: Types.ObjectId;

  // Verknüpfung zur Page
  page: Types.ObjectId;        // ref: "Page"

  // Metadaten
  notebookId?: string;         // aus imageUrl (/pages/<id>/…)
  imageUrl?: string;

  // Inhalte
  text?: string;               // gesamter, gesäuberter OCR-Text
  wa: string[];                // bestätigte WA-Einträge
  cal: string[];               // bestätigte Kalender-Einträge
  todo: string[];              // bestätigte Aufgaben

  createdAt?: Date;
  updatedAt?: Date;
}

const PagesContextSchema = new Schema<PagesContextDoc>(
  {
    page: { type: Schema.Types.ObjectId, ref: "Page", required: true, index: true },
    notebookId: { type: String, default: "" },
    imageUrl: { type: String, default: "" },

    text: { type: String, default: "" },
    wa:   { type: [String], default: [] },
    cal:  { type: [String], default: [] },
    todo: { type: [String], default: [] },
  },
  { timestamps: true }
);

const PagesContext: Model<PagesContextDoc> =
  (models.PagesContext as Model<PagesContextDoc>) ||
  model<PagesContextDoc>("PagesContext", PagesContextSchema);

export default PagesContext;
