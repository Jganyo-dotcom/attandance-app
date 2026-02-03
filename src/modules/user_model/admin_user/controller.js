const Attendance = require("../../../models/attendance");
const People = require("../../../models/People");
const Session = require("../../../models/session");
const userSchema = require("../../../models/user.model");

const verif_staff_account = async (req, res) => {
  try {
    const staff_id = req.params.id;
    const verifThisAccount = await userSchema.findById(staff_id);
    if (!verifThisAccount)
      return res.status(404).json({ message: "Account not found" });
    if (verifThisAccount.role !== "Staff")
      return res.status(404).json({ message: "Account not Staff account" });
    if (verifThisAccount.disabled === true)
      return res.status(404).json({ message: "Account is a blocked account" });
    await userSchema.findByIdAndUpdate(staff_id, { verifiedByAdmin: true });
    return res.status(200).json({ message: "Account has been verifield" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Account has been verifield" });
  }
};

const unblock_staff_account = async (req, res) => {
  try {
    const staff_id = req.params.id;
    const unblockThisAccount = await userSchema.findById(staff_id);
    if (!unblockThisAccount)
      return res.status(404).json({ message: "Account not found" });
    if (unblockThisAccount.role !== "Staff")
      return res.status(404).json({ message: "Account not Staff account" });
    await userSchema.findByIdAndUpdate(staff_id, {
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
    const filter = { verifiedByAdmin: false };

    // Count total for pagination
    const total = await userSchema.countDocuments(filter);

    // Fetch documents with projection and lean for performance
    const accounts = await userSchema
      .find(filter)
      .select("name username email login_attempt") // return only needed fields
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

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

// Controller: get disabled accounts
const getDisabledAccounts = async (req, res) => {
  try {
    // Pagination and sorting
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(5, parseInt(req.query.limit || "20", 10)),
    );
    const sortDir = req.query.sortDir === "asc" ? 1 : -1;

    // Filter for disabled accounts
    const filter = { disabled: true };

    // Count total
    const total = await userSchema.countDocuments(filter);

    // Fetch documents with projection and lean
    const accounts = await userSchema
      .find(filter)
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

// Create a new session (admin only)
const createSession = async (req, res) => {
  try {
    const today = new Date();
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
      message: "Session has been created",
      sessionId: newSession._id, // expose ID if needed
      newSession,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Close the current session (admin only)
const closeSession = async (req, res) => {
  try {
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

    if (!closedSession) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Reset people statuses
    await People.updateMany({ status: "P" }, { $set: { status: "A" } });

    return res
      .status(200)
      .json({ message: "Session has been closed", closedSession });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Mark someone present (staff)
const markAsPresent = async (req, res) => {
  try {
    const { nameId } = req.params;

    // Find the current open session automatically
    const thatSession = await Session.findOne({ status: "Open" }).sort({
      date: -1,
    });
    if (!thatSession) {
      return res.status(400).json({ message: "No open session available" });
    }

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

// Mark someone absent (staff)
const markAsAbsent = async (req, res) => {
  try {
    const { nameId } = req.params;

    // Find the current open session automatically
    const thatSession = await Session.findOne({ status: "Open" }).sort({
      date: -1,
    });
    if (!thatSession) {
      return res.status(400).json({ message: "No open session available" });
    }

    const record = await Attendance.findOne({
      sessionId: thatSession._id,
      name: nameId,
      status: "P",
    });

    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    await Attendance.findByIdAndDelete(record._id);
    await People.findByIdAndUpdate(nameId, { status: "A" });

    return res.status(200).json({ message: "Marked absent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const createPerson = async (req, res) => {
  const { error} = validationForCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const { name, department, contact } = req.body; // ✅ use body

    const newPerson = new People({
      name,
      department,
      contact,
    });

    await newPerson.save(); // ✅ await save

    return res.status(201).json({
      message: `${newPerson.name} has been added to database`,
      newPerson,
    });
  } catch (err) {
    console.error("Error creating person:", err);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

const searchPersonByName = async (req, res) => {
  try {
    const name = req.params.name;
    // Weak search: case-insensitive, partial match
    const regex = new RegExp(name, "i");
    s;
    const people = await Person.find({
      $or: [{ name: regex }, { department: regex }, { contact: regex }],
    });

    if (!people || people.length === 0) {
      return res.status(404).json({ message: "No person found" });
    }
    return res.status(200).json(people);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /api/staff?page=1&limit=20
// Get all persons with pagination + search
const getAllPersons = async (req, res) => {
  try {
    // Parse query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search ? req.query.search.trim() : "";

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // search by name
        { department: { $regex: search, $options: "i" } }, // search by department
        { contact: { $regex: search, $options: "i" } }, // search by contact
      ];
    }

    // Count total documents matching query
    const total = await People.countDocuments(query);

    // Calculate pagination values
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch paginated data
    const staff = await People.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional sort

    res.json({
      message: "Staff list retrieved successfully",
      staff,
      page,
      totalPages,
      total,
      limit,
    });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Get all absent people with pagination
// Get all absent people with pagination + search
const getAllAbsent = async (req, res) => {
  try {
    // Default values if not provided
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const search = req.query.search ? req.query.search.trim() : "";

    // Build query
    let query = { status: "A" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // search by name
        { department: { $regex: search, $options: "i" } }, // search by department
        { contact: { $regex: search, $options: "i" } }, // search by contact
      ];
    }

    // Count total absent people matching query
    const totalAbsent = await People.countDocuments(query);

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch absent people with pagination
    const absentList = await People.find(query).skip(skip).limit(limit);

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

const ExcelJS = require("exceljs");
const { validationForCreateSchema } = require("../user_validation");

const exportAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find the session by ID
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get all people with status P or A
    const people = await People.find({ status: { $in: ["P", "A"] } });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    // Add big header with session creation date/time
    worksheet.addRow([`Attendance Report`]);
    worksheet.getRow(1).font = { size: 16, bold: true };
    worksheet.addRow([`Session created: ${session.date} ${session.start}`]);
    worksheet.addRow([]); // blank row before table

    // Define columns
    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Department", key: "department", width: 20 },
      { header: "Contact", key: "contact", width: 20 },
      { header: "Status", key: "status", width: 10 },
      { header: "Marked At", key: "markedAt", width: 25 },
    ];

    // Add rows with marked time
    for (const p of people) {
      const attendanceRecord = await Attendance.findOne({
        sessionId: session._id,
        name: p._id,
      });

      worksheet.addRow({
        name: p.name,
        department: p.department,
        contact: p.contact,
        status: p.status,
        markedAt: attendanceRecord
          ? attendanceRecord.createdAt.toLocaleString()
          : "",
      });
    }

    // Build filename with session creation date
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
};
