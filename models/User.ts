import { Schema, model, models, Model, Types } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  name?: string;            // optional: full name (first + last)
  orgIds?: Types.ObjectId[];
  role?: "user" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    name: { type: String },
    orgIds: [{ type: Schema.Types.ObjectId, ref: "Org" }],
    role: { type: String, enum: ["user", "admin"], default: "user" }
  },
  { timestamps: true }
);

const User: Model<UserDoc> = (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
export default User;
