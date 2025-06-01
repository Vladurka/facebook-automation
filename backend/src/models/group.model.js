import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
});

export const Group = mongoose.model("Group", groupSchema);
