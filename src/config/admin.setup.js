const Joi = require("joi");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Users = require("../models/user.model");
const UserSchema = require("../models/user.model");
const { connections } = require("../config/db");


const registerAdminfunction = async () => {
  const User = connections.Main.model("User", UserSchema);
  try {
    // hash super admin password
    const password = "Iamtheadminhere";

    const salt = await bcrypt.genSalt(10); // ✅ await here
    const hashed_password = await bcrypt.hash(password, salt); // ✅ await here

    const registerAdmin = new User({
      name: "Elikem James Ganyo",
      email: "elikem@gmail.com",
      password: hashed_password, // now a real string
      role: "Admin",
      username: "Jgany",
      verifiedByAdmin: true,
      org: "Teens",
    });

    await registerAdmin.save();
    console.log("Admin has been created");
  } catch (error) {
    console.error(error);
    console.log("something went wrong");
  }
};

module.exports = { registerAdminfunction };
