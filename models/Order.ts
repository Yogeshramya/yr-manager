import mongoose, { Schema, model, models } from "mongoose";

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: [
      {
        serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        notes: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["New Order", "Design", "Approval", "Production", "Packing", "Delivery", "Completed"],
      default: "New Order",
    },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: { type: Date },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: "User" },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Order = models.Order || model("Order", OrderSchema);
