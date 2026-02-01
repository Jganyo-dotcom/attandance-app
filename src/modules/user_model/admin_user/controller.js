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

// Create a new session
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
      status: "open",
      author: req.user.id,
    });

    await newSession.save();
    return res
      .status(200)
      .json({ message: "Session has been created", newSession });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const closeSession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const today = new Date();
    const dateOnly = today.toISOString().split("T")[0];
    const startTime = today.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newSession = Session.findByIdAndUpdate({
      end: today,
      status: "closed",
    });

    return res.status(200).json({ message: "Session has been closed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Mark someone present
const markAsPresent = async (req, res) => {
  try {
    const { id: sessionId, nameId } = req.params;
    const thatSession = await Session.findById(sessionId);

    if (!thatSession || thatSession.status === "closed") {
      return res.status(401).json({ message: "Session is not available" });
    }

    const presentPerson = new Attendance({
      sessionId,
      status: "P",
      name: nameId,
      markedBy: req.user.id,
    });

    await presentPerson.save();
    return res
      .status(200)
      .json({ message: `${nameId} marked present by ${req.user.id}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Mark someone absent
const markAsAbsent = async (req, res) => {
  try {
    const { id: sessionId, nameId } = req.params;

    const record = await Attendance.findOne({
      sessionId,
      name: nameId,
      status: "P",
    });
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    await Attendance.findByIdAndDelete(record._id);
    return res
      .status(200)
      .json({ message: `${nameId} marked absent by ${req.user.id}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const createPerson = async (req, res) => {
  try {
    const { name, department, contact } = req.query;
    const newPerson = new People({
      name: name,
      department: department,
      contact: contact,
    });
    newPerson.save();
    return res.status(201).json({
      message: `${newPerson.name} has been added to database`,
      newPerson,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const searchPersonByName = async (req, res) => {
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
};
