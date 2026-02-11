const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, minlength: 5, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, minlength: 6, required: true },
    username: { type: String, minlength: 2, required: true },
    verifiedByAdmin: { type: Boolean, required: true, default: false },
    login_attempt: { type: Number, required: true, default: 3 },
    role: { type: String, required: true },
    disabled: { type: Boolean, required: true, default: false },
    hasChangedPassword: { type: Boolean, required: true, default: false },
    org: {
      type: String,
      enum: ["Main", "Visa", "Teens", "N/A", "Visa-UOE"],
      default: "N/A",
    },
  },
  { timestamps: true },
);

module.exports = UserSchema;
