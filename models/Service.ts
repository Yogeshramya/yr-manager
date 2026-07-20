import mongoose, { Schema, model, models } from "mongoose";

const ServiceSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    defaultPrice: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  },
  { timestamps: true }
);

export const Service = models.Service || model("Service", ServiceSchema);
