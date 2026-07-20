import mongoose, { Schema, model, models } from "mongoose";

const ChecklistLogSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    checklistItemId: {
      type: Schema.Types.ObjectId,
      ref: "ChecklistItem",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true, // Normalized to midnight (00:00:00.000) of the target day
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Ensure only one log entry per checklist item per day
ChecklistLogSchema.index({ businessId: 1, checklistItemId: 1, date: 1 }, { unique: true });

export const ChecklistLog = models.ChecklistLog || model("ChecklistLog", ChecklistLogSchema);
