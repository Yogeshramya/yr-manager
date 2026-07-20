import mongoose, { Schema, model, models } from "mongoose";

const IncomeSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Partial"],
      default: "Paid",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Card"],
      default: "UPI",
    },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  },
  { timestamps: true }
);

export const Income = models.Income || model("Income", IncomeSchema);
