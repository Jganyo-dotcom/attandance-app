const attendanceSchema = require("../../../models/attendance");
const peopleSchema = require("../../../models/People");
const sessionSchema = require("../../../models/session");
const UserSchema = require("../../../models/user.model");
const { connections } = require("../../../config/db");

const {
  validationForCreateSchema,
  validationForPasswordChange,
  updatePersonSchema,
  adminUpdate,
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
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);

    const now = new Date();
    const dateOnly = now.toISOString().split("T")[0];
    const startTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Check if *any* open session exists
    const existingSessionByAnother = await Session.findOne({
      status: "Open",
    }).sort({ createdAt: -1 });
    if (
      existingSessionByAnother &&
      existingSessionByAnother.author.toString() !== req.user.id
    ) {
      const person = await User.findById(existingSessionByAnother.author);
      return res.status(403).json({
        message: `${person?.name || "Another user"} has a session open. Ask them to close it.`,
      });
    }

    // Check if current user already has an open session
    const existingSession = await Session.findOne({
      status: "Open",
      author: req.user.id,
    });

    if (existingSession) {
      // 1. Export attendance for the open session
      await exportAttendance(
        { params: { sessionId: existingSession._id }, db: req.db },
        res,
      );

      // 2. Close the session
      await Session.findByIdAndUpdate(existingSession._id, {
        end: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "Closed",
        sessionDate: dateOnly,
      });
      const absentPeople = await People.find({ status: "A" }).select("_id");

      // Reset all people marked Present back to Absent
      await People.updateMany({ status: "P" }, { $set: { status: "A" } });

      // Add absent people to Attendance if not already recorded

      const existingRecords = await Attendance.find({
        sessionId: existingSession._id,
        status: "A",
      }).select("name");
      const existingIds = new Set(
        existingRecords.map((r) => r.name.toString()),
      );
      const newAbsent = absentPeople.filter(
        (p) => !existingIds.has(p._id.toString()),
      );

      if (newAbsent.length > 0) {
        const docs = newAbsent.map((p) => ({
          sessionId: existingSession._id,
          name: p._id,
          status: "A",
          date: dateOnly,
          markedBy: req.user.id,
        }));
        await Attendance.insertMany(docs);
      }

      // Important: stop here, because exportAttendance already streamed the file
      return;
    }

    // Otherwise create a new session
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
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);

    const { sessionId } = req.params;

    const now = new Date();
    const todayString = now.toISOString().split("T")[0];
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    // if its already closed do nothing
    const isClosed = await Session.findById(sessionId);
    if (isClosed.status === "Closed") {
      return res.status(200).json({ message: "Session closed already" });
    }

    // 1. Mark the session as closed
    const closedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        end: timeString,
        status: "Closed",
        sessionDate: todayString,
      },
      { new: true },
    );

    if (!closedSession) {
      return res.status(404).json({ message: "Session not found" });
    }

    const absentPeople = await People.find({ status: "A" }).select("_id");

    // 2. Reset all people who were marked Present back to Absent
    await People.updateMany({ status: "P" }, { $set: { status: "A" } });

    // 3. Find all absent people

    // 4. Find which absent people already have attendance records
    const existingRecords = await Attendance.find({
      sessionId,
      status: "A",
    }).select("name");
    const existingIds = new Set(existingRecords.map((r) => r.name.toString()));

    // 5. Filter out those already recorded
    const newAbsent = absentPeople.filter(
      (p) => !existingIds.has(p._id.toString()),
    );

    // 6. Bulk insert new absent records
    if (newAbsent.length > 0) {
      const docs = newAbsent.map((p) => ({
        sessionId,
        name: p._id,
        status: "A",
        date: todayString,
        markedBy: req.user.id,
      }));
      await Attendance.insertMany(docs);
    }

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
    const today = new Date().toISOString().split("T")[0];

    const { nameId } = req.params;

    // Find the latest open session
    const thatSession = await Session.findOne({ status: "Open" }).sort({
      date: -1,
    });
    if (!thatSession) {
      return res.status(400).json({ message: "No open session" });
    }

    // Check if person exists
    const person = await People.findById(nameId);
    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    // Prevent duplicate attendance
    const exists = await Attendance.findOne({
      session: thatSession._id,
      person: nameId,
    });
    if (exists) {
      return res.status(400).json({ message: "Already marked present" });
    }

    // Create attendance record
    const presentPerson = new Attendance({
      sessionId: thatSession._id,
      name: nameId,
      status: "P",
      markedBy: req.user.id,
      date: today,
    });

    // Update person status
    await People.findByIdAndUpdate(nameId, { status: "P" });

    // Save attendance
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
      gender: value.gender,
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

const updateAdminAndStaff = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const id = req.params.id;

  try {
    const { error, value } = adminUpdate.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const existingEmail = await User.findOne({
      email: value.email,
      _id: { $ne: id },
    });
    if (existingEmail) {
      return res
        .status(400)
        .json({ message: "Email already exist in database" });
    }
    const existingUserName = await User.findOne({
      username: value.username,
      _id: { $ne: id },
    });
    if (existingUserName) {
      return res
        .status(400)
        .json({ message: "Username already exist in database" });
    }
    // Convert to ObjectId explicitly
    const objectId = new mongoose.Types.ObjectId(id);

    // Apply only the fields provided in req.body
    const updatedPerson = await User.findByIdAndUpdate(
      objectId,
      { $set: req.body },
      { new: true, runValidators: true }, // return updated doc, enforce schema validation
    );

    if (!updatedPerson) {
      return res.status(404).json({ message: "Profile update not found" });
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
    const females = await People.countDocuments({ gender: "F" });
    const males = await People.countDocuments({ gender: "M" });

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
      females,
      males,
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

    const session = await Session.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Fetch all people once
    const people = await People.find({ status: { $in: ["P", "A"] } }).lean();

    // Fetch all attendance records for this session once
    const attendanceRecords = await Attendance.find({
      sessionId: session._id,
    }).lean();
    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.name.toString(), r]),
    );

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
      fgColor: { argb: "FF1F4E78" },
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
      fgColor: { argb: "FF2E75B6" },
    };

    // Add rows with alternating colors
    let rowIndex = 5;
    for (const p of people) {
      const attendanceRecord = attendanceMap.get(p._id.toString());

      const row = worksheet.addRow({
        name: p.name,
        department: p.department,
        contact: p.contact,
        status: p.status,
        markedAt: attendanceRecord
          ? new Date(attendanceRecord.createdAt).toLocaleString()
          : "",
      });

      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowIndex % 2 === 0 ? "FFF2F2F2" : "FFFFFFFF" },
      };

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
      fgColor: { argb: "FF1F4E78" },
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
const { sendMail } = require("../../../models/utils/email");

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
const pastAttendance = async () => {
  const User = connections.Main.model("User", UserSchema);
  const attendanceTeens = connections.Teens.model(
    "Attendance",
    attendanceSchema,
  );
  const attendanceVisa = connections.Visa.model("Attendance", attendanceSchema);
  const attendanceUOE = connections.VisaUOE.model(
    "Attendance",
    attendanceSchema,
  );

  // Helpers
  function groupByDate(records) {
    const dailyReport = {};
    records.forEach((r) => {
      const day = new Date(r.date).toISOString().split("T")[0];
      if (!dailyReport[day]) dailyReport[day] = { P: 0, A: 0 };
      if (r.status === "P") dailyReport[day].P++;
      if (r.status === "A") dailyReport[day].A++;
    });
    return Object.entries(dailyReport).map(([date, counts]) => ({
      date,
      present: counts.P,
      absent: counts.A,
    }));
  }

  function buildTable(title, reportTable) {
    let html = `
      <h2>${title}</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background-color:#007bff;color:white;">
            <th>Date</th><th>Present (P)</th><th>Absent (A)</th>
          </tr>
        </thead><tbody>
    `;
    reportTable.forEach((row) => {
      html += `<tr><td>${row.date}</td><td>${row.present}</td><td>${row.absent}</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  // Query records
  const recordsTeens = await attendanceTeens.find({
    reported: false,
    forget: false,
  });
  const recordsVisa = await attendanceVisa.find({
    reported: false,
    forget: false,
  });
  const recordsUOE = await attendanceUOE.find({
    reported: false,
    forget: false,
  });

  // Group
  const reportTeens = groupByDate(recordsTeens);
  const reportVisa = groupByDate(recordsVisa);
  const reportUOE = groupByDate(recordsUOE);

  // Build HTML
  const htmlTeens = buildTable("Teens Attendance", reportTeens);
  const htmlVisa = buildTable("Visa Attendance", reportVisa);
  const htmlUOE = buildTable("VisaUOE Attendance", reportUOE);

  // Master email body
  const htmlBody = htmlTeens + htmlVisa + htmlUOE;

  // Send master report to central address
  console.log("Sending master report to: elikemjjames@gmail.com");
  await sendMail({
    to: "elikemjjames@gmail.com",
    subject: "Monthly Attendance Report From Elitech",
    html: htmlBody,
  });

  // Send each table to admins of that org
  const adminsTeens = await User.find({ role: "admin", org: "Teens" });
  const adminsVisa = await User.find({ role: "admin", org: "Visa" });
  const adminsUOE = await User.find({ role: "admin", org: "VisaUOE" });

  if (adminsTeens.length) {
    const emails = adminsTeens.map((u) => u.email);
    console.log("Sending Teens report to admins:", emails);
    await sendMail({
      to: emails,
      subject: "Teens Attendance Report from EliTech",
      html: htmlTeens,
    });
  }

  if (adminsVisa.length) {
    const emails = adminsVisa.map((u) => u.email);
    console.log("Sending Visa report to admins:", emails);
    await sendMail({
      to: emails,
      subject: "Visa Attendance Report from EliTech",
      html: htmlVisa,
    });
  }

  if (adminsUOE.length) {
    const emails = adminsUOE.map((u) => u.email);
    console.log("Sending VisaUOE report to admins:", emails);
    await sendMail({
      to: emails,
      subject: "VisaUOE Attendance Report from EliTech",
      html: htmlUOE,
    });
  }

  // After sending, clear collections to free space
  console.log("Clearing attendance collections to free space...");

  console.log("Attendance collections emptied.");

  return { reportTeens, reportVisa, reportUOE };
};

// Controller function to return end-of-day attendance summary

// now let this be based on the databe you are requesting like that othes
const endOfDayReport = async (req, res) => {
  try {
    // Get Attendance model from middleware-injected db
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    // Get date from query string, default to today if not provided
    const requestedDate =
      req.query.date || new Date().toISOString().split("T")[0];

    // Query attendance records for that date
    const records = await Attendance.find({ date: requestedDate });

    // If no records for requested date, return "no data"
    if (records.length === 0) {
      return res.json({
        message: `No attendance data available for ${requestedDate}`,
      });
    }

    // Count P vs A
    let present = 0;
    let absent = 0;
    records.forEach((r) => {
      if (r.status === "P") present++;
      if (r.status === "A") absent++;
    });

    // Respond with JSON the frontend can use
    return res.json({
      date: requestedDate,
      present,
      absent,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const genderReport = async (req, res) => {
  try {
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    const requestedDate =
      req.query.date || new Date().toISOString().split("T")[0];

    // Query attendance records for that date
    const records = await Attendance.find({ date: requestedDate });

    if (records.length === 0) {
      return res.json({
        message: `No attendance data available for ${requestedDate}`,
      });
    }

    // Counters
    let femalePresent = 0;
    let femaleAbsent = 0;
    let malePresent = 0;
    let maleAbsent = 0;

    records.forEach((r) => {
      if (r.gender === "F") {
        if (r.status === "P") femalePresent++;
        if (r.status === "A") femaleAbsent++;
      }
      if (r.gender === "M") {
        if (r.status === "P") malePresent++;
        if (r.status === "A") maleAbsent++;
      }
    });

    return res.json({
      date: requestedDate,
      females: { present: femalePresent, absent: femaleAbsent },
      males: { present: malePresent, absent: maleAbsent },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
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
  updateAdminAndStaff,
  endOfDayReport,
  pastAttendance,
  genderReport
};
