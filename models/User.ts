// models/User.ts
import { Schema, model, models, Model, Types } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role?: string;

  // << neu (für Passwort-Reset)
  resetToken?: string | null;
  resetTokenExpiresAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: String,
    lastName: String,
    role: String,

    // Felder für Passwort-Reset
    resetToken: { type: String, index: true, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);

export default User;
