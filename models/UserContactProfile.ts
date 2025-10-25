import { Schema, model, models, Model, Types } from "mongoose";

export interface UserContactProfileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // verweist auf User._id

  avatarUrl?: string;
  bannerUrl?: string;

  firstName?: string;
  lastName?: string;

  company?: string; // ✅ hinzugefügt
  position?: string; // ✅ hinzugefügt

  email?: string;
  phone?: string;

  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;

  website?: string;
  linkedin?: string;
  telegram?: string;
  instagram?: string;

  bio?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const UserContactProfileSchema = new Schema<UserContactProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    avatarUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },

    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },

    company: { type: String, default: "" }, // ✅ hinzugefügt
    position: { type: String, default: "" }, // ✅ hinzugefügt

    email: { type: String, default: "" },
    phone: { type: String, default: "" },

    street: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },

    website: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    telegram: { type: String, default: "" },
    instagram: { type: String, default: "" },

    bio: { type: String, default: "" },
  },
  { timestamps: true }
);

const UserContactProfile: Model<UserContactProfileDoc> =
  models.UserContactProfile ||
  model<UserContactProfileDoc>("UserContactProfile", UserContactProfileSchema);

export default UserContactProfile;
