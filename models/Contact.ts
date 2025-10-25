// models/Contact.ts
import { Schema, model, models, Model, Types } from "mongoose";

export interface ContactDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // Besitzer des Kontakts

  firstName: string;
  lastName: string;
  email: string;
  phone?: string;

  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;

  position?: string;
  company?: string;

  avatarUrl?: string;

  notes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const ContactSchema = new Schema<ContactDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },

    street: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },

    position: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },

    avatarUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Optional: kombinierter Index für schnellere Suche (z. B. im Dashboard)
ContactSchema.index({ userId: 1, lastName: 1, firstName: 1 });

const Contact: Model<ContactDoc> =
  (models.Contact as Model<ContactDoc>) ||
  model<ContactDoc>("Contact", ContactSchema);

export default Contact;
