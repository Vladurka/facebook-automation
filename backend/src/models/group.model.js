import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
});

export const Group = mongoose.model("Group", groupSchema);
