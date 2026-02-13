const attendance = require("../../models/attendance");
const People = require("../../models/People");
const session = require("../../models/session");
const UserSchema = require("../../models/user.model");
const { connections } = require("../../config/db");
const crypto = require("crypto");
const { sendMail } = require("../../models/utils/email");

// Always bind User to the main connection

// Now you can safely use User everywhere

const {
  validationForRegisterSchema,
  validationForLogin,
} = require("./user_validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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

    // Find user by email or username
    let tryingToLoginUser;
    if (value.main.includes("@")) {
      tryingToLoginUser = await User.findOne({ email: value.main });
    } else {
      tryingToLoginUser = await User.findOne({ username: value.main });
    }

    if (!tryingToLoginUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Blocked account check
    if (
      tryingToLoginUser.disabled &&
      !["Admin", "Manager"].includes(tryingToLoginUser.role)
    ) {
      return res.status(403).json({ message: "Your account was blocked" });
    }

    // Verification check
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
      await tryingToLoginUser.save();

      if (
        tryingToLoginUser.login_attempt <= 0 &&
        !["Admin", "Manager"].includes(tryingToLoginUser.role)
      ) {
        tryingToLoginUser.disabled = true;
        await tryingToLoginUser.save();
        return res.status(403).json({ message: "Account has been blocked" });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Successful login: reset attempts
    tryingToLoginUser.login_attempt = 3;
    await tryingToLoginUser.save();

    // Generate JWT
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
      },
      process.env.JWT_SECRETE, // corrected env variable name
      { expiresIn: process.env.EXPIRES_IN },
    );

    // Safe user object
    const safe_user = {
      id: tryingToLoginUser._id,
      username: tryingToLoginUser.username,
      name: tryingToLoginUser.name,
      email: tryingToLoginUser.email,
      role: tryingToLoginUser.role,
      hasChangedPassword: tryingToLoginUser.hasChangedPassword,
      org: tryingToLoginUser.org,
    };

    return res.status(200).json({
      message: "Login was successful",
      safe_user,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong while logging in" });
  }
};
const deleteall = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const users = await User.deleteMany({});
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
    const User = connections.Main.model("User", UserSchema);
    const admins = await User.find({ role: "Admin" });
    res.json(admins);
  } catch (err) {
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

const passLink = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const { identifier } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!user) {
    return res.json({
      message: "If this account exists, a reset link will be sent.",
    });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetLink = `https://elikemtech.netlify.app/reset-password.html?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Password Reset",
    html: `<p>Kindly Click <a href="${resetLink}">here</a> to reset your password.If you didnt request this kindly report to your admin</p>`,
  });

  res.json({ message: "If this account exists, a reset link will be sent." });
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

module.exports = {
  registerNewUser,
  LoginUser,
  deleteall,
  createAdmin,
  deleteAdmin,
  getAdmins,
  resetPassword,
  passLink,
};
