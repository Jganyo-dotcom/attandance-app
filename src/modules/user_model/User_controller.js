const attendance = require("../../models/attendance");
const People = require("../../models/People");
const session = require("../../models/session");
const UserSchema = require("../../models/user.model");
const { connections } = require("../../config/db");

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

    let imageUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "buses",
      });
      imageUrl = result.secure_url;
    }

    // go on to register user
    const User_info = new User({
      email: value.email,
      name: value.name,
      username: value.username,
      dp:
        imageUrl ||
        "https://www.google.com/imgres?q=devs&imgurl=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fen%2F8%2F8f%2FDevs_Title_Card.png&imgrefurl=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FDevs_(TV_series)&docid=KbZeQOQ2ieMbIM&tbnid=LHsCFt94XsSu0M&vet=12ahUKEwiorszovM-SAxUoXEEAHYjBEaEQnPAOegQIFhAB..i&w=446&h=223&hcb=2&ved=2ahUKEwiorszovM-SAxUoXEEAHYjBEaEQnPAOegQIFhAB",
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
      dp: tryingToLoginUser.dp,
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

module.exports = {
  registerNewUser,
  LoginUser,
  deleteall,
  createAdmin,
  deleteAdmin,
  getAdmins,
};
