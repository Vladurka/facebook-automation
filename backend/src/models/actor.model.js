import mongoose from "mongoose";

const actorSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    groupId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true, expireAfterSeconds: 1800 }
);

export const Actor = mongoose.model("Actor", actorSchema);
