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
    gender: { type: String, enum: ["M", "F", "N/A"], default: "N/A" },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    reported: { type: Boolean, default: false },
    forget: { type: Boolean, default: false },
    date: { type: Date },
  },
  { timestamps: true },
);

module.exports = RegisterSchema;
