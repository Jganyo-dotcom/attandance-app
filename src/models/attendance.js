const mongoose = require("mongoose");

const RegisterSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    status: { type: String, enum: ["P", "A", "N/A"], default: "N/A" },
    name: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
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

module.exports = RegisterSchema;
