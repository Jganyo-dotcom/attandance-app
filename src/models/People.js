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
    memberType: { type: Boolean, required: false, default: false },
    gender: { type: String, enum: ["M", "F", "N/A"], default: "N/A" },
    staying: { type: Boolean, required: false, default: false },
    submitted: { type: Boolean, required: true, default: false },
    dob: { type: Date, required: false, default: null },
    isNewMember: { type: Boolean, default: null },
    dateJoined: { type: Date, required: false, default: null },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      default: null,
    },
  },
  { timestamps: true },
);

PeopleSchema.index({ name: 1 });

module.exports = PeopleSchema;
