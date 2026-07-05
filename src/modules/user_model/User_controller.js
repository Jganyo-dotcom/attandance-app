const attendance = require("../../models/attendance");
const People = require("../../models/People");
const session = require("../../models/session");
const UserSchema = require("../../models/user.model");
const { connections } = require("../../config/db");
const crypto = require("crypto");
const { sendMail } = require("../../models/utils/email");
const { BrevoClient } = require("@getbrevo/brevo");

// Always bind User to the main connection

// Now you can safely use User everywhere

const {
  validationForRegisterSchema,
  validationForLogin,
} = require("./user_validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

const registerNewUser = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const { error, value } = validationForRegisterSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  // find email is existing
  const existing_user = await User.findOne({ email: value.email });
  if (existing_user) {
    return res.status(400).json({ message: "email already exist" });
  }
  const existing_username = await User.findOne({
    username: value.username,
  });
  if (existing_username) {
    return res.status(400).json({ message: "username already taken" });
  }
  if (value.confirm_password !== value.password) {
    return res.status(400).json({ message: "passwords do not much" });
  }

  try {
    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashed_password = await bcrypt.hash(value.password, salt);

    // go on to register user
    const User_info = new User({
      email: value.email,
      name: value.name,
      username: value.username,
      role: "Staff",
      password: hashed_password,
      org: value.org,
    });
    await User_info.save();
    //send back the user
    const newUser = {
      id: User_info._id,
      email: value.email,
      name: value.name,
      org: value.org,
    };
    res.status(201).json({ message: "user successfully registered", newUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message:
        "something went wrong if error persists kindly contact the administrator",
    });
  }
};

const LoginUser = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);

  try {
    // Validate request body
    const { error, value } = validationForLogin.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Find user by email OR username (Case-insensitive check is highly recommended here)
    const tryingToLoginUser = await User.findOne({
      $or: [{ email: value.main.trim() }, { username: value.main.trim() }],
    });

    if (!tryingToLoginUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Deleted account check first
    if (tryingToLoginUser.isDeleted === true) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Blocked account check
    if (
      tryingToLoginUser.disabled &&
      !["Admin", "Manager"].includes(tryingToLoginUser.role)
    ) {
      return res.status(403).json({ message: "Your account was blocked" });
    }

    // Admin verification check
    if (!tryingToLoginUser.verifiedByAdmin) {
      return res
        .status(403)
        .json({ message: "Your account has not yet been verified" });
    }

    // Compare passwords
    const comparePasswords = await bcrypt.compare(
      value.password,
      tryingToLoginUser.password,
    );

    if (!comparePasswords) {
      tryingToLoginUser.login_attempt -= 1;

      if (
        tryingToLoginUser.login_attempt <= 0 &&
        !["Admin", "Manager"].includes(tryingToLoginUser.role)
      ) {
        tryingToLoginUser.disabled = true;
      }

      await tryingToLoginUser.save();

      if (tryingToLoginUser.disabled) {
        return res.status(403).json({ message: "Account has been blocked" });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ==========================================
    // PASSWORD IS CORRECT PAST This point
    // ==========================================

    // OTP verification flow for unverified users
    if (!tryingToLoginUser.isVerified) {
      try {
        // Step 1: Generate a secure 6-digit OTP string
        const otpCode = crypto.randomInt(100000, 999999).toString();

        // Step 2: Save OTP + expiry to user
        tryingToLoginUser.verifiedToken = otpCode;
        tryingToLoginUser.verifiedTokenExpiry = Date.now() + 5 * 60 * 1000;
        await tryingToLoginUser.save();

        // Step 3: Prepare Brevo email payload
        const emailData = {
          to: [
            { email: tryingToLoginUser.email, name: tryingToLoginUser.name },
          ],
          sender: { email: "elikemjjames@gmail.com", name: "PresencePro" },
          subject: "Account Verification",
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Your Account</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:48px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                      <tr>
                        <td style="padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
                          <span style="font-size:18px;font-weight:700;color:#0f172a;">PresencePro</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:24px;">
                          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#0f172a;">Verify your identity</h2>
                          <p style="margin:0 0 24px;font-size:14px;line-height:24px;color:#475569;">
                            Hello ${tryingToLoginUser.name},<br><br>
                            Use the following one-time password (OTP) to complete your verification:
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:16px 0 24px;">
                          <table border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;border-radius:8px;">
                            <tr>
                              <td style="padding:14px 32px;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a;">
                                ${otpCode}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0 0 32px;font-size:13px;line-height:22px;color:#64748b;">
                            This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #f1f5f9;padding-top:24px;">
                          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:18px;">
                            &copy; ${new Date().getFullYear()} PresencePro. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        };

        // Step 4: Send email
        await brevo.transactionalEmails.sendTransacEmail(emailData);
        console.log("OTP email sent to:", tryingToLoginUser.email);

        // Explicit return prevents moving down into standard success token generation blocks
        return res.status(200).json({
          message: "An OTP has been sent to your email for verification.",
          otp: true,
        });
      } catch (err) {
        console.error("OTP send error:", err);
        return res.status(500).json({ message: "Failed to send OTP email" });
      }
    }

    // ==========================================
    // FULLY VERIFIED USER LOGGING IN SUCCESS
    // ==========================================
    tryingToLoginUser.login_attempt = 3;
    await tryingToLoginUser.save();

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: tryingToLoginUser._id,
        name: tryingToLoginUser.name,
        email: tryingToLoginUser.email,
        role: tryingToLoginUser.role,
        username: tryingToLoginUser.username,
        disabled: tryingToLoginUser.disabled,
        verifiedByAdmin: tryingToLoginUser.verifiedByAdmin,
        org: tryingToLoginUser.org,
        isDeleted: tryingToLoginUser.isDeleted,
      },
      process.env.JWT_SECRETE,
      { expiresIn: process.env.EXPIRES_IN },
    );

    // Safe user payload profile configuration matrix
    const safe_user = {
      id: tryingToLoginUser._id,
      username: tryingToLoginUser.username,
      name: tryingToLoginUser.name,
      email: tryingToLoginUser.email,
      role: tryingToLoginUser.role,
      hasChangedPassword: tryingToLoginUser.hasChangedPassword,
      org: tryingToLoginUser.org,
      avatarUrl: tryingToLoginUser.avatarUrl,
      isVerified: tryingToLoginUser.isVerified,
    };

    return res.status(200).json({
      message: "Login was successful",
      safe_user,
      token,
    });
  } catch (err) {
    console.error("Critical login controller breakdown error:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong while logging in" });
  }
};

const verifyVerificationToken = async (req, res) => {
  try {
    const { email, otp } = req.body; // user submits email + OTP
    const User = connections.Main.model("User", UserSchema);
    // Step 1: Find the user by email
    const user = await User.findOne({
      $or: [{ email }, { username: email }],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Step 2: Check if OTP matches
    if (user.verifiedToken !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Step 3: Check if OTP is expired
    if (user.verifiedTokenExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // Step 4: Mark user as verified
    user.isVerified = true;
    user.verifiedToken = null; // clear token
    user.verifiedTokenExpiry = null;
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        disabled: user.disabled,
        verifiedByAdmin: user.verifiedByAdmin,
        org: user.org,
        isDeleted: user.isDeleted,
      },
      process.env.JWT_SECRETE,
      { expiresIn: process.env.EXPIRES_IN },
    );

    // Safe user object
    const safe_user = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      hasChangedPassword: user.hasChangedPassword,
      org: user.org,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
    };

    return res.json({
      success: true,
      message: "Account verified successfully!",
      token,
      safe_user,
    });
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const VerifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRETE);

    const User = connections.Main.model("User", UserSchema);
    const user = await User.findById(decoded.id);

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not active" });
    }

    if (user.disabled && !["Admin", "Manager", "Staff"].includes(user.role)) {
      return res.status(403).json({ message: "Your account was blocked" });
    }

    if (!user.verifiedByAdmin) {
      return res
        .status(403)
        .json({ message: "Your account has not yet been verified" });
    }

    return res.status(200).json({
      message: "Token valid",
      safe_user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        org: user.org,
        avatarUrl: tryingToLoginUser.avatarUrl,
        isVerified: tryingToLoginUser.isVerified,
      },
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const deleteall = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  //const users = await User.deleteMany({});
  return res.status(200).json({ message: "Deleted" });
};

const Joi = require("joi");

// Validation schema
const adminSchema = Joi.object({
  name: Joi.string().required(),
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  org: Joi.string().required(),
});

const getAdmins = async (req, res) => {
  try {
    // 🎯 Use the compiled connection registry directly to stop memory caching loops
    const User = connections.Main.models["User"]
      ? connections.Main.model("User")
      : connections.Main.model("User", UserSchema);

    // This strict query will now reliably find all 7 active admins
    const admins = await User.find({ role: "Admin", isDeleted: false });

    console.log(`Active Admins Found: ${admins.length}`);
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Add new admin
const createAdmin = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const { error } = adminSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashed_password = await bcrypt.hash(req.body.password, salt);

    const newAdmin = new User({
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      password: hashed_password,
      role: "Admin",
      org: req.body.org,
      verifiedByAdmin: true,
      hasChangedPassword: false,
    });

    await newAdmin.save();
    res.json({ message: "Admin created successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", err });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Admin deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error", err });
  }
};

// Initialize Brevo client with the modern v4+ client architecture

const passLink = async (req, res) => {
  try {
    const User = connections.Main.model("User", UserSchema);
    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (user.isDeleted === true) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Always respond with generic message to prevent user enumeration
    if (!user) {
      return res.json({
        message: "If this account exists, a reset link will be sent.",
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    const resetLink = `https://elikemtech.netlify.app/reset-password.html?token=${token}`;

    // Prepare Brevo email matching the modern SDK structure
    const emailData = {
      subject: "Password Reset - PresencePro ",
      htmlContent: `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Dear User,</p>
            <p>We received a request to restore access to your <strong>Attendify</strong> account.</p>
            <p>Kindly click the link below to safely reset your password:</p>
            <p style="margin: 20px 0;">
              <a href="${resetLink}" style="background-color: #2c3e50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p>This verification link will expire in <strong>1 hour</strong>.</p>
            <p style="color: #7f8c8d; font-size: 0.9em;">If you didn’t request this change, you can safely ignore this email or report it to your system administrator.</p>
            <br>
            <p>Best regards,<br>
            <strong>PresencePro  Support Team</strong></p>
          </body>
        </html>
      `,
      sender: {
        name: "PresencePro  Support Team",
        email: "elikemjjames@gmail.com",
      },
      to: [
        {
          email: user.email,
          name: user.username || "User",
        },
      ],
    };

    // Correct invocation via the namespaced transactionalEmails instance
    const response =
      await brevo.transactionalEmails.sendTransacEmail(emailData);
    console.log("Password reset email dispatched. ID:", response.messageId);
  } catch (err) {
    // Graceful error logging so bad email attempts don't crash your server routing
    console.error(
      "Brevo implementation error:",
      err.response?.body || err.message,
    );
  }

  // Consistent fallback resolution message
  return res.json({
    message: "If this account exists, a reset link will be sent.",
  });
};
// Reset password endpoint
const resetPassword = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const { token, newPassword } = req.body;

  try {
    // Find user with matching token and not expired
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (user.isDeleted === true) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user record
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add this temporarily to your express routes
const temp = async (req, res) => {
  try {
    const User = connections.Main.model("User", UserSchema);

    // Explicitly target the records where MongoDB stored the literal string "false"
    const result = await User.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } },
    );

    console.log(`Successfully fixed ${result.modifiedCount} admin documents!`);
    res.send(
      `<h1>Database Fixed!</h1><p>Modified ${result.modifiedCount} accounts from string to boolean.</p>`,
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
  }
};

module.exports = {
  registerNewUser,
  LoginUser,
  deleteall,
  createAdmin,
  deleteAdmin,
  getAdmins,
  resetPassword,
  passLink,
  temp,
  VerifyToken,
  verifyVerificationToken,
};
