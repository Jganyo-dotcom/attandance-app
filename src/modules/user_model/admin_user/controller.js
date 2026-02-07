const attendanceSchema = require("../../../models/attendance");
const peopleSchema = require("../../../models/People");
const sessionSchema = require("../../../models/session");
const UserSchema = require("../../../models/user.model");
const { connections } = require("../../../config/db");

const {
  validationForCreateSchema,
  validationForPasswordChange,
  updatePersonSchema,
} = require("../user_validation");
const ExcelJS = require("exceljs");

const verif_staff_account = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  try {
    const staff_id = req.params.id;
    const verifThisAccount = await User.findById(staff_id);
    if (!verifThisAccount)
      return res.status(404).json({ message: "Account not found" });
    if (verifThisAccount.role !== "Staff")
      return res.status(404).json({ message: "Account not Staff account" });
    if (verifThisAccount.org !== req.user.org)
      return res.status(401).json({ message: "Not allowed" });
    if (req.user.role !== "Admin")
      return res.status(404).json({ message: "Account not Staff account" });
    if (verifThisAccount.disabled === true)
      return res.status(404).json({ message: "Account is a blocked account" });
    await User.findByIdAndUpdate(staff_id, { verifiedByAdmin: true });
    return res.status(200).json({ message: "Account has been verifield" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "something went wrong " });
  }
};

const unblock_staff_account = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  try {
    const staff_id = req.params.id;
    const unblockThisAccount = await User.findById(staff_id);
    if (!unblockThisAccount)
      return res.status(404).json({ message: "Account not found" });
    if (unblockThisAccount.org !== req.user.org)
      return res.status(404).json({ message: "Not allowed" });
    if (unblockThisAccount.role !== "Staff")
      return res.status(404).json({ message: "Account not Staff account" });
    await User.findByIdAndUpdate(staff_id, {
      disabled: false,
      login_attempt: 3,
    });
    return res.status(200).json({ message: "Account has been unblocked" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "something went wrong" });
  }
};
// Controller: get pending accounts (improved)
const pendingAccounts = async (req, res) => {
  console.log("come");
  const User = connections.Main.model("User", UserSchema);
  try {
    // Query params for pagination and sorting
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(5, parseInt(req.query.limit || "20", 10)),
    );
    const sortBy = req.query.sortBy || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    // Build query
    const filter = { verifiedByAdmin: false, org: req.user.org };

    // Count total for pagination
    const total = await User.countDocuments(filter);

    // Fetch documents with projection and lean for performance
    const accounts = await User.find(filter)
      .select("name username email login_attempt") // return only needed fields
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    console.log(accounts);
    return res.status(200).json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data: accounts,
    });
  } catch (err) {
    console.error("pendingAccounts error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching pending accounts" });
  }
};

const getAllStaff = async (req, res) => {
  console.log("come");
  const User = connections.Main.model("User", UserSchema);
  try {
    // Sorting params (optional)
    const sortBy = req.query.sortBy || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    // Build query
    const filter = { verifiedByAdmin: true, org: req.user.org, role: "Staff" };

    // Fetch all documents with projection and lean for performance
    const accounts = await User.find(filter)
      .select("name username email login_attempt") // only needed fields
      .sort({ [sortBy]: sortDir })
      .lean();

    return res.status(200).json({
      data: accounts,
    });
  } catch (err) {
    console.error("getAllStaff error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching staff accounts" });
  }
};

// Controller: get disabled accounts
const getDisabledAccounts = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  try {
    // Pagination and sorting
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(5, parseInt(req.query.limit || "20", 10)),
    );
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    // Filter for disabled accounts
    const filter = { disabled: true, org: req.user.org };

    // Count total
    const total = await User.countDocuments(filter);

    // Fetch documents with projection and lean
    const accounts = await User.find(filter)
      .select(
        "name username email login_attempt disabled disabledAt createdAt role",
      ) // adjust fields as needed
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      data: accounts,
    });
  } catch (err) {
    console.error("getDisabledAccounts error:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching disabled accounts" });
  }
};

// routes/user.js

// Middleware should decode JWT and attach user info to req.user
const deleteAdmin = async (req, res) => {
  try {
    const User = connections.Main.model("User", UserSchema);
    const userId = req.params.id; // assuming JWT middleware sets req.user

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ message: "Server error deleting account" });
  }
};

// Delete pending account
const unverify = async (req, res) => {
  try {
    const User = connections.Main.model("User", UserSchema);
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ message: "Server error deleting user" });
  }
};

// Create a new session (admin only)
// const {
//   SessionSchema,
//   PeopleSchema,
//   RegisterSchema,
// } = require("../models/schemas");
// const ExcelJS = require("exceljs");
// const { validationForCreateSchema } = require("../validation");

// Create a new session

const createSession = async (req, res) => {
  try {
    const User = connections.Main.model("User", UserSchema);
    const Session = req.db.model("Session", sessionSchema);
    const today = new Date();

    // Check if current user already has an open session
    const existingSession = await Session.findOne({
      status: "Open",
      author: req.user.id,
    });

    // Check if *any* open session exists o
    const existingSessionByanother = await Session.findOne({
      status: "Open",
    }).sort({ createdAt: -1 }); // newest first
    console.log();
    if (
      existingSessionByanother &&
      existingSessionByanother.author.toString() !== req.user.id
    ) {
      const person = await User.findById(existingSessionByanother.author);
      return res.status(403).json({
        message: `${person?.name || "Another user"} has a session open. Ask them to close it.`,
      });
    }

    if (existingSession) {
      // Directly call exportAttendance, which streams the file back
      await exportAttendance(
        { params: { sessionId: existingSession._id }, db: req.db },
        res,
      );
      return; // stop here, response already sent
    }

    // Otherwise create a new session
    const dateOnly = today.toISOString().split("T")[0];
    const startTime = today.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newSession = new Session({
      date: dateOnly,
      start: startTime,
      end: "N/A",
      status: "Open",
      author: req.user.id,
    });

    await newSession.save();
    return res.status(201).json({
      message: "Session created",
      sessionId: newSession._id,
      newSession,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Close session
const closeSession = async (req, res) => {
  try {
    const Session =
      (await req.db.models.Session) || req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);

    const { sessionId } = req.params;
    const today = new Date();

    const closedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        end: today.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Closed",
      },
      { new: true },
    );

    if (!closedSession)
      return res.status(404).json({ message: "Session not found" });

    await People.updateMany({ status: "P" }, { $set: { status: "A" } });

    return res.status(200).json({ message: "Session closed", closedSession });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Mark present
const markAsPresent = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);

    const { nameId } = req.params;
    const thatSession = await Session.findOne({ status: "Open" }).sort({
      date: -1,
    });
    if (!thatSession)
      return res.status(400).json({ message: "No open session" });

    const presentPerson = new Attendance({
      sessionId: thatSession._id,
      status: "P",
      name: nameId,
      markedBy: req.user.id,
    });

    await People.findByIdAndUpdate(nameId, { status: "P" });
    await presentPerson.save();

    return res.status(200).json({ message: "Marked present", presentPerson });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Mark absent
const markAsAbsent = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);

    const { nameId } = req.params;
    const thatSession = await Session.findOne({ status: "Open" }).sort({
      date: -1,
    });
    if (!thatSession)
      return res.status(400).json({ message: "No open session" });

    const record = await Attendance.findOne({
      sessionId: thatSession._id,
      name: nameId,
      status: "P",
    });
    if (!record)
      return res.status(404).json({ message: "Attendance record not found" });

    await Attendance.findByIdAndDelete(record._id);
    await People.findByIdAndUpdate(nameId, { status: "A" });

    return res.status(200).json({ message: "Marked absent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Create person
const createPerson = async (req, res) => {
  const People = req.db.model("People", peopleSchema);
  const { error, value } = validationForCreateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const existingPhone = await People.findOne({ contact: value.contact });
  if (existingPhone) {
    return res
      .status(400)
      .json({ message: "phone number already exist in database" });
  }
  try {
    const { name, department, contact, level } = req.body;
    const newPerson = new People({
      name,
      department,
      contact,
      org: req.user.org,
      level: value.level,
    });
    await newPerson.save();

    return res
      .status(201)
      .json({ message: `${newPerson.name} added`, newPerson });
  } catch (err) {
    console.error("Error creating person:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

// Delete person by ID
const mongoose = require("mongoose");

const deletePerson = async (req, res) => {
  const People = req.db.models.People || req.db.model("People", peopleSchema);
  const id = req.params.id;

  try {
    // Convert to ObjectId explicitly (optional but safer)
    const objectId = new mongoose.Types.ObjectId(id);

    // Delete and capture the document
    const deletedPerson = await People.findByIdAndDelete(objectId);

    if (!deletedPerson) {
      return res.status(404).json({ message: "Person not found" });
    }

    return res.status(200).json({
      message: `${deletedPerson.name} deleted successfully`,
      deletedPerson,
    });
  } catch (err) {
    console.error("Error deleting person:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

const updatePerson = async (req, res) => {
  const People = req.db.models.People || req.db.model("People", peopleSchema);
  const id = req.params.id;

  try {
    const { error, value } = updatePersonSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const existingPhone = await People.findOne({
      contact: value.contact,
      _id: { $ne: id },
    });
    if (existingPhone) {
      return res
        .status(400)
        .json({ message: "phone number already exist in database" });
    }
    // Convert to ObjectId explicitly
    const objectId = new mongoose.Types.ObjectId(id);

    // Apply only the fields provided in req.body
    const updatedPerson = await People.findByIdAndUpdate(
      objectId,
      { $set: req.body },
      { new: true, runValidators: true }, // return updated doc, enforce schema validation
    );

    if (!updatedPerson) {
      return res.status(404).json({ message: "Person not found" });
    }

    return res.status(200).json({
      message: `${updatedPerson.name} updated successfully`,
      updatedPerson,
    });
  } catch (err) {
    console.error("Error updating person:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

// Search person
const searchPersonByName = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const regex = new RegExp(req.params.name, "i");
    const people = await People.find({
      $or: [{ name: regex }, { department: regex }, { contact: regex }],
    });

    if (!people || people.length === 0)
      return res.status(404).json({ message: "No person found" });
    return res.status(200).json(people);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get all persons with pagination
const getAllPersons = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : "";

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    const total = await People.countDocuments(query);
    const staff = await People.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      message: "All is well",
      staff,
      page,
      totalPages: Math.ceil(total / limit),
      total,
      limit,
    });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Get all absent people
const getAllAbsent = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : "";

    let query = { status: "A" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    const totalAbsent = await People.countDocuments(query);
    const absentList = await People.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      total: totalAbsent,
      page,
      limit,
      totalPages: Math.ceil(totalAbsent / limit),
      data: absentList,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Export attendance

const exportAttendance = async (req, res) => {
  try {
    const Session =
      req.db.models.Session || req.db.model("Session", sessionSchema);
    const People = req.db.models.People || req.db.model("People", peopleSchema);
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const people = await People.find({ status: { $in: ["P", "A"] } });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    // Title row
    worksheet.addRow(["Attendance Report"]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
    titleRow.alignment = { horizontal: "center" };
    titleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" }, // dark blue
    };
    worksheet.mergeCells(`A1:E1`);

    // Session info
    worksheet.addRow([`Session created: ${session.date} ${session.start}`]);
    worksheet.addRow([]);

    // Define columns
    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Department", key: "department", width: 20 },
      { header: "Contact", key: "contact", width: 20 },
      { header: "Status", key: "status", width: 10 },
      { header: "Marked At", key: "markedAt", width: 25 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(4);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B6" }, // lighter blue
    };

    // Add rows with alternating colors
    let rowIndex = 5;
    for (const p of people) {
      const attendanceRecord = await Attendance.findOne({
        sessionId: session._id,
        name: p._id,
      });

      const row = worksheet.addRow({
        name: p.name,
        department: p.department,
        contact: p.contact,
        status: p.status,
        markedAt: attendanceRecord
          ? attendanceRecord.createdAt.toLocaleString()
          : "",
      });

      // Alternate row colors
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowIndex % 2 === 0 ? "FFF2F2F2" : "FFFFFFFF" },
      };

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      rowIndex++;
    }

    // Footer message
    worksheet.addRow([]);
    const footerRow = worksheet.addRow([
      "Thank you for choosing ELITech. , Contact: 0593320375",
    ]);
    footerRow.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    footerRow.alignment = { horizontal: "center" };
    footerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" }, // dark blue background
    };
    worksheet.mergeCells(`A${footerRow.number}:E${footerRow.number}`);

    // Build filename
    const createdDate = new Date(session.date).toISOString().split("T")[0];
    const filename = `attendance_${createdDate}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting attendance:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const bcrypt = require("bcrypt");

const AdminChangePassword = async (req, res) => {
  try {
    // Always use the main DB connection
    const User = connections.Main.model("User", UserSchema);
    const adminId = req.params.id;

    // Validate request body
    const { error } = validationForPasswordChange.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }
    // Prevent same password reuse
    if (currentPassword === newPassword) {
      return res
        .status(401)
        .json({ error: "New password cannot be the same as current password" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(401).json({ error: "Passwords don't match" });
    }

    // Find admin by ID
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Compare old password with stored hash
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    admin.password = hashedNewPassword;
    admin.hasChangedPassword = true;
    await admin.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  verif_staff_account,
  unblock_staff_account,
  getDisabledAccounts,
  pendingAccounts,
  createSession,
  markAsPresent,
  markAsAbsent,
  closeSession,
  createPerson,
  searchPersonByName,
  getAllPersons,
  getAllAbsent,
  exportAttendance,
  deletePerson,
  AdminChangePassword,
  deleteAdmin,
  unverify,
  getAllStaff,
  updatePerson,
};
