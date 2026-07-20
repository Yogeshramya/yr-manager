import mongoose, { Schema, model, models } from "mongoose";

const ChecklistItemSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Income", "Expense"],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate checklist item titles within the same business
ChecklistItemSchema.index({ businessId: 1, title: 1 }, { unique: true });

export const ChecklistItem = models.ChecklistItem || model("ChecklistItem", ChecklistItemSchema);
