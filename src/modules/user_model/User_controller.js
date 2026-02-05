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
   
    const { error, value } = validationForLogin.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    let tryingToLoginUser;

    if (value.main.includes("@")) {
      //find the user
      tryingToLoginUser = await User.findOne({ email: value.main });
    } else {
      tryingToLoginUser = await User.findOne({
        username: value.main,
      });
    }

    if (!tryingToLoginUser) {
      return res.status(404).json({ message: "user not found" });
    }

    // check if disabled
    if (
      tryingToLoginUser.disabled === true &&
      tryingToLoginUser.role !== "Admin"
    ) {
      return res.status(404).json({ message: "Your account was blocked" });
    }

    // check if the account has been verified
    if (tryingToLoginUser.verifiedByAdmin === false) {
      return res
        .status(404)
        .json({ message: "Your account has not yet been verified" });
    }
    //compare passwords and login
    const compare_passwords = await bcrypt.compare(
      value.password,
      tryingToLoginUser.password,
    );
    if (!compare_passwords) {
      tryingToLoginUser.login_attempt = tryingToLoginUser.login_attempt - 1;
      await tryingToLoginUser.save();
      if (
        tryingToLoginUser.login_attempt <= 0 &&
        tryingToLoginUser.role !== "Admin"
      ) {
        tryingToLoginUser.disabled = true;
        await tryingToLoginUser.save();
        return res.status(401).json({ message: "Account has been blocked" });
      }
      return res.status(401).json({ message: "invalid credentials" });
    }

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
      process.env.JWT_SECRETE,
      { expiresIn: process.env.EXPIRES_IN },
    );

    const safe_user = {
      id: tryingToLoginUser._id,
      username: tryingToLoginUser.username,
      name: tryingToLoginUser.name,
      email: tryingToLoginUser.email,
      role: tryingToLoginUser.role,
      hasChangedPassword: tryingToLoginUser.hasChangedPassword,
    };
    tryingToLoginUser.login_attempt = 3;

    //if password is right
    res.status(200).json({
      message: "login was successful",
      safe_user,
      token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "something went wrong while logging in" });
  }
};
const deleteall = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const users = await User.deleteMany({});
  return res.status(200).json({ message: "Deleted" });
};

module.exports = { registerNewUser, LoginUser, deleteall };
