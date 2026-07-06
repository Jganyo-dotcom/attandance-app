const attendance = require("../../models/attendance");
const People = require("../../models/People");
const session = require("../../models/session");
const UserSchema = require("../../models/user.model");
const { connections } = require("../../config/db");
const crypto = require("crypto");
const { sendMail, sendUniversalMail } = require("../../models/utils/email");
const { BrevoClient } = require("@getbrevo/brevo");
const Joi = require("joi");
const getOtpTemplate = require("../../EmailTemplates/VerificationEmail");
// Always bind User to the main connection

// Now you can safely use User everywhere

const {
  validationForRegisterSchema,
  validationForLogin,
} = require("./user_validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { receiveMessageOnPort } = require("worker_threads");
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

      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ==========================================
    // PASSWORD IS CORRECT PAST This point
    // ==========================================

    // OTP verification flow for unverified users
    if (tryingToLoginUser.isVerified) {
      try {
        // Step 1: Generate a secure 6-digit OTP string
        const otpCode = crypto.randomInt(100000, 999999).toString();

        // Step 2: Save OTP + expiry to user
        tryingToLoginUser.verifiedToken = otpCode;
        tryingToLoginUser.verifiedTokenExpiry = Date.now() + 5 * 60 * 1000;
        await tryingToLoginUser.save();
        const currentYear = new Date().getFullYear();
        // Step 3: Prepare Brevo email payload
        
        sendUniversalMail("OTP", {
          recipientEmail: tryingToLoginUser.email,
          recipientName: tryingToLoginUser.name,
          subject: "ACCOUNT VERIFICATION (PresencePro)",
          otpCode: otpCode
        }).catch(err => console.error("Non-blocking background email failure:", err));

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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Decodes the token using your system secret
    const decoded = jwt.verify(token, process.env.JWT_SECRETE);

    const User = connections.Main.model("User", UserSchema);
    const user = await User.findById(decoded.id);

    // 1. Account exist check
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: "Account not found" });
    }

    // 2. Verified account check
    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not active" });
    }

    // 3. Blocked state verification checks
    if (user.disabled && !["Admin", "Manager", "Staff"].includes(user.role)) {
      return res.status(403).json({ message: "Your account was blocked" });
    }

    // 4. Admin approval gate check
    if (!user.verifiedByAdmin) {
      return res
        .status(403)
        .json({ message: "Your account has not yet been verified" });
    }

    // FIX: Swapped out broken "tryingToLoginUser" variables for the correct "user" object reference
    return res.status(200).json({
      message: "Token valid",
      token, // Returning the token keeps your onboarding sync routine functional
      safe_user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        org: user.org,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Token verification exception reached:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const deleteall = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  //const users = await User.deleteMany({});
  return res.status(200).json({ message: "Deleted" });
};



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

    if (!identifier) {
      return res.status(400).json({ message: "Identifier is required." });
    }

    // 1. Fetch user account matching configuration parameter parameters
    const user = await User.findOne({
      $or: [
        { email: identifier.trim() }, 
        { username: identifier.trim() }
      ],
    });

    // 2. Prevent User Enumeration Identity Leaks: Always return same message if missing OR deleted
    if (!user || user.isDeleted === true) {
      return res.status(200).json({
        message: "If this account exists, a reset link will be sent to the registered email.",
      });
    }

    // 3. Generate token securely
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    
    // 4. Synchronize expirations: Setting database schema time limit matrix to match email (15 minutes)
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; 
    await user.save();

    const resetLink = `https://elikemtech.netlify.app/reset-password.html?token=${token}`;

    // 5. Fire your universal background email sender (Do NOT await!)
    sendUniversalMail("forgetPassword", {
      recipientEmail: user.email,
      recipientName: user.username || user.name,
      subject: "Password Reset - PresencePro",
      custome: resetLink
    }).catch((emailErr) => {
      console.error("Background password delivery failed server tracking:", emailErr.message);
    });

    // 6. CRITICAL FIX: Explicitly send response back so frontend stops spinning loading icons
    return res.status(200).json({
      message: "If this account exists, a reset link will be sent to the registered email.",
    });

  } catch (err) {
    console.error("Critical password generation route breakdown error:", err);
    return res.status(500).json({ message: "Something went wrong while processing reset link request." });
  }
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
