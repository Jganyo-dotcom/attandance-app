const mongoose = require("mongoose");

const OrgSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    accessCode: { type: String, minlength: 6, maxlength: 6 },
    accessCodeExpiresAt: { type: Date },
  },
  { timestamps: true },
);


const mongoose = require("mongoose");

const OrgSchemaForPasskey = new mongoose.Schema(
  {
    org: { type: String, required: true },
    accessCode: { type: String, required: true },
    
    // Account Lockout Fields
    failedAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },

    // Password Reset Fields
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);



module.exports = {OrgSchema,OrgSchemaForPasskey};
