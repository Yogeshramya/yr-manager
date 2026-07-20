import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, trim: true, lowercase: true },
    email: { type: String },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Super Admin", "Business Owner", "Manager", "Staff"],
      default: "Staff",
    },
    businessId: { type: Schema.Types.ObjectId, ref: "Business" },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);
