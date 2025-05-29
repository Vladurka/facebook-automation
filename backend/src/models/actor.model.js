import mongoose from "mongoose";

const actorSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Actor = mongoose.model("Actor", actorSchema);
