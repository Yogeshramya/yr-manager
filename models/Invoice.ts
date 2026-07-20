import mongoose, { Schema, model, models } from "mongoose";

const InvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    gstAmount: { type: Number, default: 0 },
    subTotal: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      default: "Draft",
    },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  },
  { timestamps: true }
);

export const Invoice = models.Invoice || model("Invoice", InvoiceSchema);
