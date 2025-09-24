// models/Page.ts
import { Schema, model, models, Model, Types } from "mongoose";

export interface PageImage {
  url: string;
  width?: number;
  height?: number;
  createdAt?: Date;
}

export interface PageDoc {
  _id: Types.ObjectId;
  notebookId: Types.ObjectId;
  pageIndex: number;
  pageToken: string;
  images: PageImage[];
  createdAt?: Date;
  updatedAt?: Date;
}

const PageSchema = new Schema<PageDoc>(
  {
    notebookId: { type: Schema.Types.ObjectId, required: true, index: true },
    pageIndex:  { type: Number, required: true },
    pageToken:  { type: String, required: true, unique: true, index: true },
    images:     [{
      url: { type: String, required: true },
      width: Number,
      height: Number,
      createdAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

const Page: Model<PageDoc> = (models.Page as Model<PageDoc>) || model<PageDoc>("Page", PageSchema);
export default Page;
