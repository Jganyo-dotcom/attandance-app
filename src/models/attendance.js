const mongoose = require("mongoose");

const RegisterSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "session",
      required: true,
    },
    status: { type: String, enum: ["P", "A"], default: "N/A" },
    name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Register", RegisterSchema);
