import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    created_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export default mongoose.model("Task", TaskSchema);
