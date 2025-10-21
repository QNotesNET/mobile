// models/GoogleAccount.ts
import { Schema, model, models, Types } from "mongoose";

const GoogleAccountSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true, required: true },
    sub: String,           // Google User ID
    email: String,
    scope: String,
    accessToken: String,
    refreshToken: String,
    expiryDate: Date,
  },
  { timestamps: true }
);

export default models.GoogleAccount || model("GoogleAccount", GoogleAccountSchema);
