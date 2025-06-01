import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: true,
      unique: true,
    },
    c_user: {
      type: String,
      required: true,
    },
    xs: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Account = mongoose.model("Account", accountSchema);
