const mongoose = require("mongoose");

const PeopleSchema = new mongoose.Schema(
  {
    name: { type: String, minlength: 5, required: true },
    department: { type: String, required: true },
    contact: { type: String, minlength: 10, required: true, unique: true },
    status: { type: String, enum: ["P", "A"], default: "A" },
  },
  { timestamps: true },
);

PeopleSchema.index({ name: 1 });

module.exports = mongoose.model("People", PeopleSchema);
