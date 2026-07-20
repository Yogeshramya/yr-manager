import mongoose, { Schema, model, models } from "mongoose";

const ExpenseSchema = new Schema(
  {
    category: {
      type: String,
      enum: [
        "Rent",
        "Electricity",
        "Internet",
        "Salary",
        "Fuel",
        "Ink",
        "Paper",
        "Packing",
        "Courier",
        "Machine Maintenance",
        "Marketing",
        "Other",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    receiptUrl: { type: String },
    notes: { type: String },
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  },
  { timestamps: true }
);

export const Expense = models.Expense || model("Expense", ExpenseSchema);
