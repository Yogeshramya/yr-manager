import mongoose, { Schema, model, models } from "mongoose";

const InventorySchema = new Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, default: "units" },
    minThreshold: { type: Number, default: 10 },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  },
  { timestamps: true }
);

export const Inventory = models.Inventory || model("Inventory", InventorySchema);
