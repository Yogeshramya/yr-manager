import mongoose, { Schema, model, models } from "mongoose";

const BusinessSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    gstin: { type: String },
    currency: { type: String, default: "INR" },
    upiId: { type: String },
    logo: { type: String },
    brandingColor: { type: String, default: "#dcc522" },
    settings: {
      subscriptionPlan: { type: String, default: "Free" },
      defaultInvoiceNotes: { type: String, default: "Thank you for your business!" },
    },
  },
  { timestamps: true }
);

export const Business = models.Business || model("Business", BusinessSchema);
