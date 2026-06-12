const mongoose = require("mongoose");

const OrgSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    accessCode: { type: String, minlength: 6, maxlength: 6 },
    accessCodeExpiresAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = OrgSchema;
