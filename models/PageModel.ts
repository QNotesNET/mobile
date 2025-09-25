// models/PageModel.ts
import { Schema, model, models, Model, Types, InferSchemaType } from "mongoose";

export interface PageImage {
  url: string;
  width?: number;
  height?: number;
  createdAt?: Date;
}

const ImageSchema = new Schema<PageImage>({
  url: { type: String, required: true },
  width: Number,
  height: Number,
  createdAt: { type: Date, default: Date.now },
});

const PageSchema = new Schema(
  {
    notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
    pageIndex:  { type: Number, required: true },
    pageToken:  { type: String, required: true, unique: true, index: true },
    images:     [ImageSchema],
  },
  { timestamps: true }
);

// pro Notebook darf pageIndex nur einmal vorkommen
PageSchema.index({ notebookId: 1, pageIndex: 1 }, { unique: true });

// abgeleiteter TS-Typ (praktisch für .lean<...>())
export type PageDoc = InferSchemaType<typeof PageSchema> & { _id: Types.ObjectId };

// Mongoose Model
const Page: Model<PageDoc> = (models.Page as Model<PageDoc>) || model<PageDoc>("Page", PageSchema);
export default Page;
