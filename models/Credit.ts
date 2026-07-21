import mongoose, { Schema, model, models } from "mongoose";

const CreditSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    lenderName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    dateTaken: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    logId: {
      type: Schema.Types.ObjectId,
      ref: "ChecklistLog",
      default: null,
    },
    checklistItemId: {
      type: Schema.Types.ObjectId,
      ref: "ChecklistItem",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Returned", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

if (models.Credit && !models.Credit.schema.paths.logId) {
  delete (models as any).Credit;
}

export const Credit = models.Credit || model("Credit", CreditSchema);

