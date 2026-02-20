const mongoose = require("mongoose");

const PeopleSchema = new mongoose.Schema(
  {
    name: { type: String, minlength: 5, required: true },
    department: { type: String, required: true },
    level: { type: String, required: true, default: "N/A" },
    contact: { type: String, minlength: 10, sparse: true, unique: true },
    status: { type: String, enum: ["P", "A"], default: "A" },
    org: { type: String, enum: ["Visa", "Teens", "VisaUOE"], default: "N/A" },
    count: { type: Number, required: true, default: 1 },
    gender: { type: String, enum: ["M", "F", "N/A"], default: "N/A" },
  },
  { timestamps: true },
);

PeopleSchema.index({ name: 1 });

module.exports = PeopleSchema;
