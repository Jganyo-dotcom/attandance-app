const mongoose = require("mongoose");

const Session = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true, default: "N/A" },
    status: {
      type: String,
      enum: ["Open", "closed"],
      required: true,
      default: "open",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Session", SessionSchema);
