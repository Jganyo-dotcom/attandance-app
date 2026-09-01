const attendanceSchema = require("../../../models/attendance");
const peopleSchema = require("../../../models/People");
const sessionSchema = require("../../../models/session");
const UserSchema = require("../../../models/user.model");
const { connections } = require("../../../config/db");
const mongoose = require("mongoose");
const { OrgSchema } = require("../../../models/org"); // separate Org schema
const QRCode = require("qrcode");
const crypto = require("crypto");
const {
  validationForCreateSchema,
  validationForPasswordChange,
  updatePersonSchema,
  adminUpdate,
} = require("../user_validation");
const ExcelJS = require("exceljs");
const { BrevoClient } = require("@getbrevo/brevo");
const bcrypt = require("bcrypt");
const { sendMail, sendUniversalMail } = require("../../../models/utils/email");
const StayedSchema = require("../../../models/stayed");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

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
    const userId = req.params.id;

    const deletedUser = await User.findByIdAndUpdate(
      userId,
      { isDeleted: true },
      { returnDocument: "after" },
    );

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
      const absentPeople = await People.find({ status: "A" }).select(
        "_id gender",
      );

      // Reset all people marked Present back to Absent
      await People.updateMany({ status: "P" }, { $set: { status: "A" } });
      await People.updateMany({ staying: true }, { $set: { staying: false } });

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
          gender: p.gender,
          date: dateOnly,
          markedBy: req.user.id,
        }));
        await Attendance.insertMany(docs);
      }

      // Important: stop here, because exportAttendance already streamed the file
      return;
    }

    // Otherwise create a new session
    const { title } = req.body;
    if (!title || title.length === 0) {
      return res
        .status(400)
        .json({ message: "Title is required to create a session" });
    }
    const newSession = new Session({
      date: dateOnly,
      start: startTime,
      title: title || "",
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

//Close session
// const closeSession = async (req, res) => {
//   try {
//     const User = connections.Main.model("User", UserSchema);
//     const Session = req.db.model("Session", sessionSchema);
//     const People = req.db.model("People", peopleSchema);
//     const Attendance = req.db.model("Attendance", attendanceSchema);

//     const { sessionId } = req.params;

//     const now = new Date();
//     const todayString = now.toISOString().split("T")[0];
//     const timeString = now.toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     });

//     // 1. Check if already closed
//     const user = req.user.id;

//     const isClosed = await Session.findById(sessionId);
//     const author = await User.findById(isClosed.author);
//     if (isClosed.author.toString() !== user.toString()) {
//       console.log("here");
//       return res.status(401).json({
//         message: `${author?.name ?? "someone"} opened this session, tell them to close it`,
//       });
//     }
//     if (!isClosed || isClosed.status === "Closed") {
//       return res.status(200).json({ message: "Session closed already" });
//     }

//     // 2. Mark session as closed
//     const closedSession = await Session.findByIdAndUpdate(
//       sessionId,
//       {
//         end: timeString,
//         status: "Closed",
//         date: new Date(todayString), // use Date type
//       },
//       { returnDocument: "after" },
//     );

//     if (!closedSession) {
//       return res.status(404).json({ message: "Session not found" });
//     }

//     // 4. Get absent people
//     const absentPeople = await People.find({ status: "A" }).select(
//       "_id gender isNewMember",
//     );

//     for (const p of absentPeople) {
//       await Attendance.updateOne(
//         { name: p._id, date: todayString }, // unique key
//         {
//           $set: {
//             sessionId,
//             status: "A",
//             gender: p.gender,
//             markedBy: req.user.id,
//             isNewMember: p.isNewMember,
//           },
//         },
//         { upsert: true },
//       );
//     }

//     // 3. Reset people statuses
//     await People.updateMany({ status: "P" }, { $set: { status: "A" } });
//     await People.updateMany({ staying: true }, { $set: { staying: false } });

//     // 🚀 Fire in the background without making the user wait!
//     checkOnMissingNewbies(req).catch((err) =>
//       console.error("Background email process error:", err),
//     );
//     sendWelcomeEmailToNewbies(req).catch((err) =>
//       console.error("Background email process error:", err),
//     );

//     return res.status(200).json({ message: "Session closed", closedSession });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

const closeSession = async (req, res) => {
  try {
    const User = connections.Main.model("User", UserSchema);
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);

    const { sessionId } = req.params;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // 1. Check if already closed
    const user = req.user.id;

    const isClosed = await Session.findById(sessionId);
    const author = await User.findById(isClosed.author);
    if (isClosed.author.toString() !== user.toString()) {
      console.log("here");
      return res.status(401).json({
        message: `${author?.name ?? "someone"} opened this session, tell them to close it`,
      });
    }
    if (!isClosed || isClosed.status === "Closed") {
      return res.status(200).json({ message: "Session closed already" });
    }

    // FIX: Extract the day the session was opened and format it as a pure YYYY-MM-DD string
    const sessionOpenedDateString =
      isClosed.date instanceof Date
        ? isClosed.date.toISOString().split("T")[0]
        : new Date(isClosed.date).toISOString().split("T")[0];

    // 2. Mark session as closed
    const closedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        end: timeString,
        status: "Closed",
        date: sessionOpenedDateString, // Saves as string to match your report
      },
      { returnDocument: "after" },
    );

    if (!closedSession) {
      return res.status(404).json({ message: "Session not found" });
    }

    // 4. Get absent people
    const absentPeople = await People.find({ status: "A" }).select(
      "_id gender isNewMember",
    );

    for (const p of absentPeople) {
      await Attendance.updateOne(
        { name: p._id, date: sessionOpenedDateString }, // Uses the clean opening date string
        {
          $set: {
            sessionId,
            status: "A",
            gender: p.gender,
            markedBy: req.user.id,
            isNewMember: p.isNewMember,
            date: sessionOpenedDateString, // Saves as pure text string in the database
          },
        },
        { upsert: true },
      );
    }

    // 3. Reset people statuses
    await People.updateMany({ status: "P" }, { $set: { status: "A" } });
    await People.updateMany({ staying: true }, { $set: { staying: false } });

    // 🚀 Fire in the background without making the user wait!
    checkOnMissingNewbies(req).catch((err) =>
      console.error("Background email process error:", err),
    );
    sendWelcomeEmailToNewbies(req).catch((err) =>
      console.error("Background email process error:", err),
    );

    return res.status(200).json({ message: "Session closed", closedSession });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const checkOnMissingNewbies = async (req) => {
  // Helper delay function for anti-spam tracking
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    const Attendance = req.db.model("Attendance", attendanceSchema);
    const People = req.db.model("People", peopleSchema);

    // 1. Get today's exact date string used for this session
    const todayDateString = new Date().toISOString().split("T")[0];

    console.log(`Sweeping for absent newbies on date: ${todayDateString}`);

    // 2. Query today's attendance for anyone marked Absent ('A') who is a New Member
    const absentNewbiesRecords = await Attendance.find({
      date: todayDateString,
      status: "A",
      isNewMember: true,
    }).select("name");

    if (absentNewbiesRecords.length === 0) {
      console.log("Wonderful! No newbies missed church today.");
      return;
    }

    // Extract the raw unique Person Object IDs
    const missingNewbieIds = absentNewbiesRecords.map((record) => record.name);

    // 3. Look up their real names and email contact info from the People Collection
    const missingPeopleDetails = await People.find({
      _id: { $in: missingNewbieIds },
    });

    let counter = 0;

    // 4. Loop through them and send out your universal emails safely
    for (const person of missingPeopleDetails) {
      // We explicitly AWAIT here because this is a batch worker loop
      await sendUniversalMail("WE_MISSED_YOU", {
        recipientEmail: person.email,
        recipientName: person.name,
        subject: "WE MISSED YOU TODAY AT CHURCH",
        personOrg: person.org,
      });
      counter++;

      // Strict 5-second anti-spam delay gate
      if (
        missingPeopleDetails.indexOf(person) !==
        missingPeopleDetails.length - 1
      ) {
        console.log(
          "Anti-Spam Delay: Waiting 5 seconds before checking on the next person...",
        );
        await delay(5000);
      }
    }

    console.log(
      `Successfully completed daily absent newbie check. Sent ${counter} care emails.`,
    );
  } catch (error) {
    console.error(
      "Error executing missing newbie email check tracking routine:",
      error,
    );
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
      sessionId: thatSession._id,
      name: nameId,
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
      gender: person.gender,
      isNewMember: person.isNewMember,
      isParentInChurch: person.isParentInChurch,
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

  // Duplicate check only if contact provided
  if (value.contact) {
    const existingPhone = await People.findOne({ contact: value.contact });
    if (existingPhone) {
      return res
        .status(400)
        .json({ message: "Phone number already exists in database" });
    }
  }

  lastCount = await People.findOne().sort({ count: -1 }).exec();

  const nextCount = lastCount ? lastCount.count + 1 : 1;

  try {
    const { name, department } = req.body;
    if (nextCount === null) {
      nextCount = 1;
    }

    const newPersonData = {
      name,
      department,
      org: req.user.org,
      level: value.level,
      gender: value.gender,
      memberType: value.memberType,
      count: nextCount,
    };

    if (value.isNewMember) {
      console.log(value.isNewMember);
      newPersonData.isNewMember = value.isNewMember;
      // Store as ISO string for consistency
      newPersonData.dateJoined = new Date().toISOString();
    }

    if (value.hasParentInChurch) {
      console.log(value.hasParentInChurch);
      newPersonData.isParentInChurch = value.hasParentInChurch;
    }

    if (value.contact && value.contact.trim().length > 0) {
      newPersonData.contact = value.contact;
    } else {
      newPersonData.contact = String(nextCount).padStart(10, "0");
      newPersonData.count = nextCount;
    }

    const newPerson = new People(newPersonData);
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

const sendWelcomeEmailToNewbies = async (req) => {
  // Helper function to handle the anti-spam delay
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const People = req.db.model("People", peopleSchema);

  // 1. Get today's date string (e.g., "2026-07-06")
  const todayDateString = new Date().toISOString().split("T")[0];

  // 2. CRITICAL FIX: Explicitly define the mathematical range limits using const
  const startDate = new Date(`${todayDateString}T00:00:00.000Z`);
  const endDate = new Date(`${todayDateString}T23:59:59.999Z`);

  try {
    console.log(
      `Starting background welcome email routine for date boundaries: ${todayDateString}`,
    );

    // 3. Query native ISODate ranges safely (No more regex errors!)
    const newbies = await People.find({
      isNewMember: true,
      dateJoined: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    if (newbies.length === 0) {
      console.log("No new members found today to welcome via email.");
      return; // Safe exit from background execution task
    }

    let emailsSent = 0;

    for (let i = 0; i < newbies.length; i++) {
      const person = newbies[i];

      // Validate email format basic check

      // Executing the universal function call safely
      await sendUniversalMail("Welcome_first_timers", {
        recipientEmail: person.email,
        recipientName: person.name,
        subject: "We loved fellowshiping with you today!",
        personOrg: person.org,
      });

      emailsSent++;

      // High-performance index-based anti-spam delay gate
      if (i < newbies.length - 1) {
        console.log(`Waiting 5 seconds before routing next welcome email...`);
        await delay(5000);
      }
    }

    console.log(
      `Completed process. ${emailsSent} welcome emails dispatched successfully.`,
    );
  } catch (err) {
    // Log the error inside your server console safely
    console.error(
      "Critical background welcome email processor error:",
      err.message,
    );
  }
};

// Delete person by ID

const deletePerson = async (req, res) => {
  const People = req.db.model("People", peopleSchema);
  const id = req.params.id;
  console.log("here");
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

    // Fetch current person
    const currentPerson = await People.findById(id);
    if (!currentPerson) {
      return res.status(404).json({ message: "Person not found" });
    }

    // Helper: detect generated contacts (10 digits, all padded zeros except last digits)
    const isGeneratedContact = (c) => /^0{5,}\d+$/.test(c);

    if (value.contact) {
      // If new contact is generated
      if (isGeneratedContact(value.contact)) {
        // If it's not the same as their existing generated contact
        if (currentPerson.contact !== value.contact) {
          // Check if another person already has this generated contact
          const existing = await People.findOne({
            contact: value.contact,
            _id: { $ne: id },
          });
          if (existing) {
            return res.status(400).json({
              message: "Generated contact already exists. Cannot modify.",
            });
          }
          // Reject outright if user is trying to tweak to another generated value
          return res.status(400).json({
            message: "You cannot change system-generated contact values.",
          });
        }
      } else {
        // For real phone numbers, enforce uniqueness
        const existingPhone = await People.findOne({
          contact: value.contact,
          _id: { $ne: id },
        });
        if (existingPhone) {
          return res
            .status(400)
            .json({ message: "Phone number already exists in database" });
        }
      }
    }

    // Build update object safely
    const updateData = { ...req.body };
    if (value.contact) {
      updateData.contact = value.contact;
    } else {
      delete updateData.contact;
    }

    const updatedPerson = await People.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: "after", runValidators: true },
    );

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

// Configure your Cloudinary keys (Make sure these are in your .env file!)

const updateAdminAndStaff = async (req, res) => {
  const User = connections.Main.model("User", UserSchema);
  const id = req.params.id;

  try {
    // 1. Validate the incoming text body data (Joi validation)
    const { error, value } = adminUpdate.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Check for duplicate Email
    const existingEmail = await User.findOne({
      email: value.email,
      _id: { $ne: id },
    });
    if (existingEmail) {
      return res
        .status(400)
        .json({ message: "Email already exist in database" });
    }

    // 3. Check for duplicate Username
    const existingUserName = await User.findOne({
      username: value.username,
      _id: { $ne: id },
    });
    if (existingUserName) {
      return res
        .status(400)
        .json({ message: "Username already exist in database" });
    }

    // Convert string ID to explicit ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // 4. Directly update MongoDB with the payload.
    // Since req.body contains the final Cloudinary image string link at 'avatarUrl',
    // Mongoose handles saving it perfectly without any extra middleware.
    const updatedPerson = await User.findByIdAndUpdate(
      objectId,
      { $set: req.body },
      { returnDocument: "after", runValidators: true }, // returns updated doc, enforces schema validation
    );

    if (!updatedPerson) {
      return res.status(404).json({ message: "Profile update not found" });
    }

    // 5. Send back the clean updated person document to the frontend
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

const updateDOBandProfilePicture = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const { id } = req.params;

    // Updated parameter mapping
    const { dob, email, isParentInChurch, isNewMember } = req.query;

    const updateFields = {};

    if (dob) {
      if (String(dob).trim().length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid input for Date Of Birth" });
      }
      updateFields.dob = dob;
    }

    // Handles true/false logic for isParentInChurch safely
    if (isParentInChurch !== undefined) {
      const parentString = String(isParentInChurch).toLowerCase().trim();
      updateFields.isParentInChurch = parentString === "true";
    }

    if (isNewMember !== undefined) {
      const memberString = String(isNewMember).toLowerCase().trim();
      updateFields.isNewMember = memberString === "true";
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();

      if (normalizedEmail.length === 0 || !normalizedEmail.includes("@")) {
        return res.status(400).json({ message: "Invalid input for email" });
      }

      const emailExists = await People.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (emailExists) {
        return res.status(409).json({ message: "Email already exists" });
      }

      updateFields.email = normalizedEmail;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    const targetPerson = await People.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { returnDocument: "after", runValidators: true },
    );

    if (!targetPerson) {
      return res.status(404).json({ message: "Person not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      person: targetPerson,
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Helper function to handle timing delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendBirthdayEmails = async () => {
  try {
    const today = new Date();
    console.log(`\n=========================================`);
    console.log(
      `[${new Date().toISOString()}] PRODUCTION: Launching Asynchronous Multi-Channel Birthday Engine...`,
    );

    // Strict midnight ranges for target date detection
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const birthdayPeople = [];

    // Step 1: Scan all sharded database nodes to pull today's global celebrants
    for (const orgName of Object.keys(connections)) {
      const db = connections[orgName];
      const People = db.model("People", peopleSchema);

      const orgBirthdays = await People.find({
        dob: { $gte: start, $lt: end },
      });

      birthdayPeople.push(
        ...orgBirthdays.map((p) => ({ ...p.toObject(), org: orgName })),
      );
    }

    console.log(
      `[SYSTEM LOG] Found ${birthdayPeople.length} total active celebrants globally today.`,
    );

    if (birthdayPeople.length === 0) {
      console.log(
        `[SYSTEM LOG] No birthday metrics found to process for ${today.toLocaleDateString()}. Exiting job safely.`,
      );
      console.log(`=========================================\n`);
      return;
    }

    // Step 2: Extract all verified system administrators across the Main architecture
    const User = connections.Main.model("User", UserSchema);
    const orgAdmins = await User.find({
      role: { $regex: /^admin$/i },
      isDeleted: false,
      disabled: false,
    });

    console.log(
      `[SYSTEM LOG] Found ${orgAdmins.length} active administrative targets across management channels.`,
    );

    // ==========================================
    // PIPELINE A: THE ADMINISTRATIVE NOTIFICATION BRANCH
    // ==========================================
    const runAdminPipeline = async () => {
      console.log(
        `[PIPELINE START] Administrative notification engine online.`,
      );

      for (let i = 0; i < orgAdmins.length; i++) {
        const admin = orgAdmins[i];
        if (!admin.email) continue;

        const filteredCelebrants = birthdayPeople.filter(
          (person) =>
            person.org.toLowerCase().trim() === admin.org.toLowerCase().trim(),
        );

        if (filteredCelebrants.length === 0) {
          console.log(
            `[SKIP LOG] Admin ${admin.email} has no registered celebrants today inside division: ${admin.org}`,
          );
          continue;
        }

        const adminHtmlRows = filteredCelebrants
          .map(
            (p) => `
            <tr>
              <td style="padding:12px;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9;"><strong>${p.name}</strong></td>
              <td style="padding:12px;font-size:14px;color:#475569;border-bottom:1px solid #f1f5f9;">${p.email || "N/A"}</td>
              <td style="padding:12px;font-size:12px;border-bottom:1px solid #f1f5f9;"><span style="background-color:#e2e8f0;color:#334155;padding:4px 8px;border-radius:4px;font-weight:600;">${p.org}</span></td>
            </tr>`,
          )
          .join("");

        try {
          const adminResponse =
            await brevo.transactionalEmails.sendTransacEmail({
              to: [{ email: admin.email, name: admin.name }],
              sender: { email: "elikemjjames@gmail.com", name: "PresencePro" },
              subject: `Daily Briefing: ${admin.org} Birthday Celebrants`,
              htmlContent: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Birthday Celebrants Summary</title>
              </head>
              <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:48px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                          <td style="padding-bottom:24px;border-bottom:1px solid #f1f5f9;">
                            <span style="font-size:18px;font-weight:700;color:#0f172a;">PresencePro System</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top:24px;">
                            <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#0f172a;">Today's ${admin.org} Birthday Records</h2>
                            <p style="margin:0 0 24px;font-size:14px;line-height:24px;color:#475569;">
                              Hello ${admin.name},<br><br>
                              The system identified the following members celebrating their birthdays today within the <strong>${admin.org}</strong> division on <strong>${today.toLocaleDateString()}</strong>:
                            </p>
                            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:24px;text-align:left;">
                              <thead>
                                <tr style="background-color:#f8fafc;">
                                  <th style="padding:12px;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0;">Name</th>
                                  <th style="padding:12px;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0;">Email Address</th>
                                  <th style="padding:12px;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0;">Organization</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${adminHtmlRows}
                              </tbody>
                            </table>
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
            });
          console.log(
            `📢 [ADMIN DIGEST DISPATCHED] Recipient: ${admin.email} | Division: ${admin.org} | ID: ${adminResponse.messageId || adminResponse.id}`,
          );
        } catch (error) {
          console.error(
            `[ERROR] Failed sending admin notification to ${admin.email}:`,
            error.message,
          );
        }

        // ⏳ Anti-spam pacing inside the admin loop
        if (i < orgAdmins.length - 1) {
          console.log(
            `[RATE LIMIT SHIELD] Pausing admin pipeline for 120 seconds before next dispatch...`,
          );
          await delay(120000);
        }
      }
      console.log(
        `[PIPELINE COMPLETE] Administrative notification engine finished processing.`,
      );
    };

    // ==========================================
    // PIPELINE B: THE DIRECT CELEBRANT CARD BRANCH
    // ==========================================
    const runCelebrantPipeline = async () => {
      console.log(`[PIPELINE START] Direct celebrant greeting engine online.`);
      const validCelebrants = birthdayPeople.filter((person) => person.email);

      if (validCelebrants.length === 0) {
        console.log(
          "[SYSTEM LOG] No valid celebrant email profiles detected today.",
        );
        return;
      }

      for (let i = 0; i < validCelebrants.length; i++) {
        const person = validCelebrants[i];

        // ⏳ Anti-spam pacing inside the celebrant loop (runs before each greeting email)
        console.log(
          `[RATE LIMIT SHIELD] Pausing for 120 seconds before delivering greeting to ${person.email}...`,
        );
        await delay(120000);

        try {
          const celebrantResponse =
            await brevo.transactionalEmails.sendTransacEmail({
              to: [{ email: person.email, name: person.name }],
              sender: { email: "elikemjjames@gmail.com", name: "PresencePro" },
              subject: `Happy Birthday! 🎉 (${today.toLocaleDateString()})`,
              htmlContent: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Happy Birthday</title>
              </head>
              <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:48px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.05);text-align:center;">
                        <tr>
                          <td style="font-size:48px;padding-bottom:16px;">🎉</td>
                        </tr>
                        <tr>
                          <td>
                            <h2 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0f172a;">Happy Birthday, ${person.name}!</h2>
                            <p style="margin:0 0 24px;font-size:15px;line-height:26px;color:#475569;text-align:left;">
                              On this special day, the entire community at <strong>${person.org}</strong> comes together to celebrate you.
                              Thank you for being an indispensable part of our journey. We value your presence and wish you a year ahead filled with joy, peace, and great achievements!
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top:1px solid #f1f5f9;padding-top:24px;margin-top:16px;">
                            <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">Warmest Regards,</p>
                            <p style="margin:4px 0 0;font-size:14px;color:#64748b;font-weight:500;">The PresencePro Team & ${person.org}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
            });
          console.log(
            `🎁 [CELEBRANT GREETING] (${i + 1}/${validCelebrants.length}) Sent to: ${person.email}, Brevo ID: ${celebrantResponse.messageId || celebrantResponse.id}`,
          );
        } catch (error) {
          console.error(
            `[ERROR] Failed sending direct greeting to ${person.email}:`,
            error.message,
          );
        }
      }
      console.log(
        `[PIPELINE COMPLETE] Direct celebrant engine finished processing.`,
      );
    };

    // ==========================================
    // EXECUTION SEQUENCING PIPELINES
    // ==========================================
    // 1. Run admin dispatches first
    await runAdminPipeline();

    // 2. Pause 2 minutes between admin summary and individual greetings
    console.log(
      `[RATE LIMIT SHIELD] Administrative block complete. Cooling down for 120 seconds before launching outreach block...`,
    );
    await delay(120000);

    // 3. Run individual user birthday card wishes
    await runCelebrantPipeline();

    console.log("All birthday lifecycle operations completed successfully.");
    console.log(`=========================================\n`);
  } catch (err) {
    console.error("Birthday email batch crash error:", err);
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
  console.log("Sending master report to: elikemjames@gmail.com");

  await sendMail({
    to: "elikemjjames@gmail.com",
    subject: "Attendance Report From Elitech",
    html: `
    <p>This mail is system generated. Please do not reply.</p>
    ${htmlBody}
  `,
  });

  // Send each table to admins of that org
  const adminsTeens = await User.find({ role: "Admin", org: "Teens" });
  const adminsVisa = await User.find({ role: "Admin", org: "Visa" });
  const adminsUOE = await User.find({ role: "Admin", org: "VisaUOE" });

  if (adminsTeens.length) {
    const emails = adminsTeens.map((u) => u.email);
    console.log("Sending Teens report to admins:", emails);
    await sendMail({
      to: emails,
      subject: "Teens Attendance Report from EliTech (Ignore 2026-02-21)",
      html: `
    <p>This mail is system generated. Please do not reply.</p>
    ${htmlTeens}
  `,
    });
  }

  if (adminsVisa.length) {
    const emails = adminsVisa.map((u) => u.email);
    console.log("Sending Visa report to admins:", emails);
    await sendMail({
      to: emails,
      subject: "Visa Attendance Report from EliTech",
      html: `
    <p>This mail is system generated. Please do not reply. Do well to tick attendace or account will be disabled</p>
    ${htmlVisa}
  `,
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

  console.log("Attendance collections emptied.");

  return { reportTeens, reportVisa, reportUOE };
};

// Controller function to return end-of-day attendance summary

// now let this be based on the databe you are requesting like that othes
// const endOfDayReport = async (req, res) => {
//   try {
//     // Get Attendance model from middleware-injected db
//     const Attendance =
//       req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

//     // Get date from query string, default to today if not provided
//     const requestedDate =
//       req.query.date || new Date().toISOString().split("T")[0];

//     // Query attendance records for that date
//     const records = await Attendance.find({ date: requestedDate });

//     // If no records for requested date, return "no data"
//     if (records.length === 0) {
//       return res.json({
//         message: `No attendance data available for ${requestedDate}`,
//       });
//     }

//     // Count P vs A
//     let present = 0;
//     let absent = 0;
//     records.forEach((r) => {
//       if (r.status === "P") present++;
//       if (r.status === "A") absent++;
//     });

//     // Respond with JSON the frontend can use
//     return res.json({
//       date: requestedDate,
//       present,
//       absent,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

const endOfDayReport = async (req, res) => {
  try {
    // Get Attendance model from middleware-injected db
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    // Extract sessionId from query parameter
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required." });
    }

    // Query attendance records for that specific session ID
    const records = await Attendance.find({ sessionId });

    // Handle case with no records
    if (records.length === 0) {
      return res.json({
        message: "No attendance data available for this session.",
      });
    }

    // Count Present vs Absent totals
    let present = 0;
    let absent = 0;
    records.forEach((r) => {
      if (r.status === "P") present++;
      if (r.status === "A") absent++;
    });

    // Respond with session ID and metrics
    return res.json({
      sessionId,
      present,
      absent,
    });
  } catch (err) {
    console.error("Error in endOfDayReport:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};



// const genderReport = async (req, res) => {
//   try {
//     const Attendance =
//       req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

//     const requestedDate =
//       req.query.date || new Date().toISOString().split("T")[0];

//     // Query attendance records for that date
//     const records = await Attendance.find({ date: requestedDate });

//     if (records.length === 0) {
//       return res.json({
//         message: `No attendance data available for ${requestedDate}`,
//       });
//     }

//     // Group by person+gender to spot duplicates
//     const grouped = {};
//     records.forEach((r) => {
//       const key = `${r.name}-${r.gender}`;
//       grouped[key] = (grouped[key] || 0) + 1;
//     });

//     // General counters
//     let femalePresent = 0;
//     let femaleAbsent = 0;
//     let malePresent = 0;
//     let maleAbsent = 0;
//     let unknownPresent = 0;
//     let unknownAbsent = 0;

//     // Parent in church counters
//     let parentInChurchFemalePresent = 0;
//     let parentInChurchFemaleAbsent = 0;
//     let parentInChurchMalePresent = 0;
//     let parentInChurchMaleAbsent = 0;

//     // New member counters
//     let newMemberFemalePresent = 0;
//     let newMemberFemaleAbsent = 0;
//     let newMemberMalePresent = 0;
//     let newMemberMaleAbsent = 0;

//     records.forEach((r) => {
//       if (r.gender === "F") {
//         if (r.status === "P") {
//           femalePresent++;
//           if (r.isParentInChurch) parentInChurchFemalePresent++;
//           if (r.isNewMember) newMemberFemalePresent++;
//         }
//         if (r.status === "A") {
//           femaleAbsent++;
//           if (r.isParentInChurch) parentInChurchFemaleAbsent++;
//           if (r.isNewMember) newMemberFemaleAbsent++;
//         }
//       } else if (r.gender === "M") {
//         if (r.status === "P") {
//           malePresent++;
//           if (r.isParentInChurch) parentInChurchMalePresent++;
//           if (r.isNewMember) newMemberMalePresent++;
//         }
//         if (r.status === "A") {
//           maleAbsent++;
//           if (r.isParentInChurch) parentInChurchMaleAbsent++;
//           if (r.isNewMember) newMemberMaleAbsent++;
//         }
//       } else {
//         if (r.status === "P") unknownPresent++;
//         if (r.status === "A") unknownAbsent++;
//       }
//     });

//     return res.json({
//       date: requestedDate,
//       females: { present: femalePresent, absent: femaleAbsent },
//       males: { present: malePresent, absent: maleAbsent },
//       withParentsInChurch: {
//         females: {
//           present: parentInChurchFemalePresent,
//           absent: parentInChurchFemaleAbsent,
//         },
//         males: {
//           present: parentInChurchMalePresent,
//           absent: parentInChurchMaleAbsent,
//         },
//       },
//       newMembers: {
//         females: {
//           present: newMemberFemalePresent,
//           absent: newMemberFemaleAbsent,
//         },
//         males: { present: newMemberMalePresent, absent: newMemberMaleAbsent }, // ✅ Fixed variable reference
//       },
//       unknowns: { present: unknownPresent, absent: unknownAbsent },
//       duplicates: grouped,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

// get all sessions

const genderReport = async (req, res) => {
  try {
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required." });
    }

    // Query attendance records filtered by session ID
    const records = await Attendance.find({ sessionId });

    if (records.length === 0) {
      return res.json({
        message: "No attendance data available for this session.",
      });
    }

    // Group by person + gender to identify duplicates
    const grouped = {};
    records.forEach((r) => {
      const key = `${r.name}-${r.gender}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });

    // General counters
    let femalePresent = 0,
      femaleAbsent = 0;
    let malePresent = 0,
      maleAbsent = 0;
    let unknownPresent = 0,
      unknownAbsent = 0;

    // Parent in church counters
    let parentInChurchFemalePresent = 0,
      parentInChurchFemaleAbsent = 0;
    let parentInChurchMalePresent = 0,
      parentInChurchMaleAbsent = 0;

    // New member counters
    let newMemberFemalePresent = 0,
      newMemberFemaleAbsent = 0;
    let newMemberMalePresent = 0,
      newMemberMaleAbsent = 0;

    records.forEach((r) => {
      if (r.gender === "F") {
        if (r.status === "P") {
          femalePresent++;
          if (r.isParentInChurch) parentInChurchFemalePresent++;
          if (r.isNewMember) newMemberFemalePresent++;
        }
        if (r.status === "A") {
          femaleAbsent++;
          if (r.isParentInChurch) parentInChurchFemaleAbsent++;
          if (r.isNewMember) newMemberFemaleAbsent++;
        }
      } else if (r.gender === "M") {
        if (r.status === "P") {
          malePresent++;
          if (r.isParentInChurch) parentInChurchMalePresent++;
          if (r.isNewMember) newMemberMalePresent++;
        }
        if (r.status === "A") {
          maleAbsent++;
          if (r.isParentInChurch) parentInChurchMaleAbsent++;
          if (r.isNewMember) newMemberMaleAbsent++;
        }
      } else {
        if (r.status === "P") unknownPresent++;
        if (r.status === "A") unknownAbsent++;
      }
    });

    return res.json({
      sessionId,
      females: { present: femalePresent, absent: femaleAbsent },
      males: { present: malePresent, absent: maleAbsent },
      withParentsInChurch: {
        females: {
          present: parentInChurchFemalePresent,
          absent: parentInChurchFemaleAbsent,
        },
        males: {
          present: parentInChurchMalePresent,
          absent: parentInChurchMaleAbsent,
        },
      },
      newMembers: {
        females: {
          present: newMemberFemalePresent,
          absent: newMemberFemaleAbsent,
        },
        males: {
          present: newMemberMalePresent,
          absent: newMemberMaleAbsent,
        },
      },
      unknowns: { present: unknownPresent, absent: unknownAbsent },
      duplicates: grouped,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const Session =
      req.db.models.Session || req.db.model("Session", sessionSchema);

    // Fetch all sessions
    const sessions = await Session.find({});

    // Send back with 200 OK
    res.status(200).json(sessions);
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const personalReport = async (req, res) => {
  try {
    const Session =
      req.db.models.Session || req.db.model("Session", sessionSchema);
    const People = req.db.models.People || req.db.model("People", peopleSchema);
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    // Default to today's date if none provided
    const requestedDate =
      req.query.date || new Date().toISOString().split("T")[0];
    const personId = req.params.personId;

    // Query attendance records for that person on that date
    const records = await Attendance.find({
      date: requestedDate,
      name: personId,
    }).populate("name", "name department contact");
    if (records.length === 0) {
      return res.status(404).json({
        message: `No attendance data availablee for person on ${requestedDate}`,
      });
    }

    return res.status(200).json({
      message: "Attendance records found",
      date: requestedDate,
      person: personId,
      records,
    });
  } catch (err) {
    console.error("Error fetching personal report:", err);
    return res.status(500).json({
      message: "Something went wrong while fetching personal report",
      error: err.message,
    });
  }
};

// GET /api/personal-report/:person?date=YYYY-MM-DD&range=downward
const personalReportHistory = async (req, res) => {
  try {
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    const requestedDate =
      req.query.date || new Date().toISOString().split("T")[0];
    const personId = req.params.personId;

    // Query all attendance records for that person from requestedDate onward
    const records = await Attendance.find({
      name: personId,
      date: { $gte: requestedDate },
    }).sort({ date: 1 }); // ascending order

    if (records.length === 0) {
      return res.status(404).json({
        message: `No attendance history found for ${personId} from ${requestedDate} onward`,
      });
    }

    return res.status(200).json({
      message: "Attendance history retrieved successfully",
      person: personId,
      fromDate: requestedDate,
      records,
    });
  } catch (err) {
    console.error("Error fetching attendance history:", err);
    return res.status(500).json({
      message: "Something went wrong while fetching attendance history",
      error: err.message,
    });
  }
};

const exportAttendanceHtml = async (req, res) => {
  try {
    const Session =
      req.db.models.Session || req.db.model("Session", sessionSchema);
    const People = req.db.models.People || req.db.model("People", peopleSchema);
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    const Users = connections.Main.model("User", UserSchema);

    const { date } = req.query;

    const data = await Attendance.find({ date })
      .populate("name") // People from tenant DB
      .populate("sessionId"); // Session from tenant DB

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    // Manually resolve markedBy from main DB
    const enriched = await Promise.all(
      data.map(async (row) => {
        const markedUser = await Users.findById(row.markedBy).lean();
        return {
          ...row.toObject(),
          markedBy: markedUser ? markedUser.name : null,
        };
      }),
    );

    res.json({
      attendance: enriched,
      footer: "Thank you for choosing ELITech. Contact: 0593320375",
    });
  } catch (err) {
    console.error("Error exporting attendance:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /api/get-person/:id
const getpersonById = async (req, res) => {
  const People = req.db.model("People", peopleSchema);
  try {
    const person = await People.findById(req.params.id);
    if (!person) return res.status(404).json({ message: "Person not found" });
    return res.status(200).json({ name: person.name, _id: person._id });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching person", error: err.message });
  }
};

// Find people who have missed 3 or more meetings
const findFrequentAbsentees = async (req, res) => {
  try {
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    // Group by person and count non-P statuses
    const pipeline = [
      {
        $match: { status: { $ne: "P" } }, // not present
      },
      {
        $group: {
          _id: "$name", // group by person
          missedCount: { $sum: 1 },
          sessions: { $push: "$sessionId" },
        },
      },
      {
        $match: { missedCount: { $gte: 3 } }, // missed 3 or more
      },
      {
        $lookup: {
          from: "people", // collection name for People
          localField: "_id",
          foreignField: "_id",
          as: "person",
        },
      },
      {
        $unwind: "$person",
      },
      {
        $project: {
          _id: 0,
          personName: "$person.name",
          department: "$person.department",
          missedCount: 1,
          sessions: 1,
        },
      },
    ];

    const absentees = await Attendance.aggregate(pipeline);

    res.json({ message: "Success", absentees });
  } catch (err) {
    console.error("Error finding frequent absentees:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const absenteesOrPresentPeople = async (req, res) => {
  try {
    console.log("hit");
    const People = req.db.model("People", peopleSchema);
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);

    const { dayOnedate, dayTwodate } = req.query;
    const { statusOne, statusTwo } = req.params;

    // Validate inputs
    if (!dayOnedate || !dayTwodate || !statusOne || !statusTwo) {
      return res.status(400).json({
        message:
          "Missing required parameters (dayOnedate, dayTwodate, statusOne, statusTwo).",
      });
    }

    const dayOne = await Attendance.find({ date: dayOnedate }).populate("name");
    const dayTwo = await Attendance.find({ date: dayTwodate }).populate("name");

    // Guard against no records
    if (!dayOne.length) {
      return res.status(404).json({
        message: `No attendance records found for Day One (${dayOnedate}).`,
        absentees: [],
      });
    }
    if (!dayTwo.length) {
      return res.status(404).json({
        message: `No attendance records found for Day Two (${dayTwodate}).`,
        absentees: [],
      });
    }

    // Extract people
    const peopledayOne = dayOne.map((p) => ({
      name: p.name,
      status: p.status,
    }));
    const peopledayTwo = dayTwo.map((p) => ({
      name: p.name,
      status: p.status,
    }));

    // Compare safely
    const absentees = peopledayTwo.filter((p2) => {
      const p1 = peopledayOne.find((p1) => {
        // Handle ObjectId, populated doc, or string
        const id1 = p1.name?._id || p1.name;
        const id2 = p2.name?._id || p2.name;
        return String(id1) === String(id2);
      });
      return p1 && p1.status === statusOne && p2.status === statusTwo;
    });

    // Guard against no matches
    if (!absentees.length) {
      return res.status(200).json({
        message: "No matching absentees found for the given criteria.",
        absentees: [],
      });
    }

    // Success
    return res.status(200).json({
      message: "Your list is ready",
      absentees,
    });
  } catch (error) {
    console.error("Error in absenteesOrPresentPeople:", error);
    return res.status(500).json({
      message: "Internal server error. Please try again later.",
      error: error.message,
    });
  }
};

const thoseWhoStayed = async (req, res) => {
  try {
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);
    const People = req.db.models.People || req.db.model("People", peopleSchema);
    const Stayed = req.db.models.Stayed || req.db.model("Stayed", StayedSchema);

    const requestedDate =
      req.query.date || new Date().toISOString().split("T")[0];

    const list = await Stayed.find({ date: requestedDate }).populate("name");

    if (!list || list.length === 0) {
      return res.status(404).json({ message: "This is empty" });
    }

    return res.status(200).json({ message: "success", list });
  } catch (error) {
    console.error("Error fetching stayed list:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const markthoseWhoStayed = async (req, res) => {
  const Session = req.db.model("Session", sessionSchema);
  const People = req.db.model("People", peopleSchema);
  const Attendance =
    req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);
  const Stayed = req.db.models.Stayed || req.db.model("Stayed", StayedSchema);

  const requestedDate =
    req.query.date || new Date().toISOString().split("T")[0];
  const nameId = req.params.id;

  const person = await People.findById(nameId);
  if (!person) {
    return res.status(404).json({ message: "Person not found" });
  }

  const updateToStayed = await People.findByIdAndUpdate(nameId, {
    staying: true,
  });

  const thatSession = await Session.findOne({ status: "Open" }).sort({
    createdAt: -1,
  });
  if (!thatSession) {
    return res.status(400).json({ message: "No open session" });
  }

  const alreadyExist = await Stayed.findOne({
    name: nameId,
    sessionId: thatSession._id,
  });

  if (alreadyExist) {
    return res.status(400).json({ message: "Already exist" });
  }

  const today = new Date().toISOString().split("T")[0];
  const create = new Stayed({
    sessionId: thatSession._id,
    name: nameId,
    status: "P",
    markedBy: req.user.id,
    date: today,
    gender: person.gender,
  });

  await create.save();

  return res
    .status(200)
    .json(
      { message: `${person.name} stayed for next service` },
      updateToStayed,
    );
};

const undoStayed = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance =
      req.db.models.Attendance || req.db.model("Attendance", attendanceSchema);
    const Stayed = req.db.models.Stayed || req.db.model("Stayed", StayedSchema);

    const { id } = req.params;

    // Find the currently open session
    const theSession = await Session.findOne({ status: "Open" });
    if (!theSession) {
      return res.status(404).json({ message: "No opened session" });
    }

    // Find the stayed record
    const stayedRecord = await Stayed.findOne({
      sessionId: theSession._id,
      name: id,
    });

    if (!stayedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Reset the person's staying flag
    await People.findByIdAndUpdate(id, { staying: false });

    // Delete the stayed record
    await stayedRecord.deleteOne();

    return res.status(200).json({
      message: "Stayed record deleted",
      personId: id,
    });
  } catch (error) {
    console.error("Error undoing stayed:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const checkSessions = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    sessions = await Session.findOne({ status: "Open" });
    if (!sessions) {
      return res.status(200).json({ isOpened: false });
    } else {
      return res
        .status(200)
        .json({ isOpened: true, id: sessions._id, title: sessions.title });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Its me, something went wrong" });
  }
};

const resetAdminPasswordStatus = async (req, res) => {
  try {
    // Always use the main DB connection to initialize the User model
    const User = connections.Main.model("User", UserSchema);
    const adminId = req.params.id;

    if (!adminId) {
      return res
        .status(400)
        .json({ error: "Admin ID is required in request parameters" });
    }

    // Find the admin by ID
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if it's already false to prevent unnecessary database saves
    if (admin.hasChangedPassword === false) {
      return res.status(200).json({
        message:
          "Admin's password change flag is already set to temporary mode.",
      });
    }

    // Transform the flag back to false
    admin.hasChangedPassword = false;
    await admin.save();

    return res.status(200).json({
      message: `🔒 Security lock restored for ${admin.name}! Account status set back to temporary password restriction.`,
    });
  } catch (err) {
    console.error("Error transforming password state metadata:", err);
    return res.status(500).json({
      error: "Something went wrong resetting status",
      message: err.message,
    });
  }
};

// Admin route: generate new org code

const generateOrgCode = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const Org = req.db.model("Org", OrgSchema);
    const org = req.user.org; // comes from admin token

    // Generate secure random 6-digit code
    const newCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update or create org record with new code + expiry
    const updatedOrg = await Org.findOneAndUpdate(
      { name: org },
      { accessCode: newCode, accessCodeExpiresAt: expiresAt },
      { returnDocument: "after", upsert: true },
    );

    res.json({
      message: "New access code generated successfully",
      org: updatedOrg.name,
      code: updatedOrg.accessCode,
      expiresAt: updatedOrg.accessCodeExpiresAt,
    });
  } catch (err) {
    console.error("Error generating org code:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const findOrgCode = async (req, res) => {
  try {
    const Org = req.db.model("Org", OrgSchema);
    const orgName = req.user.org; // comes from admin token

    // Find the org record by name
    const existingOrg = await Org.findOne({ name: orgName });

    if (!existingOrg || !existingOrg.accessCode) {
      return res.status(404).json({
        message: "No access code found for this organization",
      });
    }

    // Check if code is expired
    if (
      existingOrg.accessCodeExpiresAt &&
      existingOrg.accessCodeExpiresAt < new Date()
    ) {
      return res.status(400).json({
        message: "Access code has expired. Please generate a new one.",
      });
    }

    res.json({
      message: "Existing access code retrieved successfully",
      org: existingOrg.name,
      code: existingOrg.accessCode,
      expiresAt: existingOrg.accessCodeExpiresAt,
    });
  } catch (err) {
    console.error("Error finding org code:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// POST request matching frontend call structure
const generateQrCode = async (req, res) => {
  try {
    // The exact destination link you specified
    const finalDestinationUrl =
      "https://elikemtech.netlify.app/everyone/public-attendance.html";

    // Setup clear, highly scannable high-resolution QR layout configurations
    const qrStyles = {
      errorCorrectionLevel: "H", // High resiliency layer ensures fast scanning
      type: "image/png",
      margin: 1,
      color: {
        dark: "#0f172a", // Modern deep slate blue ink
        light: "#ffffff", // Crisp white clean block backing
      },
    };

    // Convert the Netlify string into a base64 Data URL asset block
    const generatedBase64Image = await QRCode.toDataURL(
      finalDestinationUrl,
      qrStyles,
    );

    // Send the structured data directly back to the front-end view layer
    return res.status(200).json({
      success: true,
      url: finalDestinationUrl,
      qrImage: generatedBase64Image,
    });
  } catch (err) {
    console.error("Express QR Engine Failure:", err);
    return res.status(500).json({
      error: "Failed to generate public route mapping data.",
      message: err.message,
    });
  }
};

const AdminGetSubmittedPersons = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const org = req.user.org;

    // Step 1: Validate tenant organization connection

    // Step 3: Build query restricted to org AND submitted records
    // Step 3: Build strict base constraints
    // (Using explicit true makes sure you only pull submitted records)
    let query = {
      org: org,
      submitted: true,
      status: { $ne: "P" },
    };

    // Step 4: Add search filters cleanly inside an $and block if text exists
    const search = req.query.search ? req.query.search.trim() : "";
    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { contact: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    // Step 5: Pagination Math
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipValue = (page - 1) * limit;

    // Run aggregations and count metrics
    const total = await People.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1; // Fallback to 1 if empty

    const females = await People.countDocuments({ ...query, gender: "F" });
    const males = await People.countDocuments({ ...query, gender: "M" });

    // Fetch paginated staff documents
    const staff = await People.find(query)
      .skip(skipValue)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Step 6: Define Prev and Next logic parameters
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    // Send complete response package
    res.json({
      message: "Submitted members retrieved successfully",
      staff,
      page,
      totalPages,
      total,
      limit,
      females,
      males,
      org,
      hasPrevPage, // Frontend reads this to toggle Prev button state
      hasNextPage, // Frontend reads this to toggle Next button state
    });
  } catch (err) {
    console.error("Error fetching submitted records:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const adminDismiss = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const org = req.user.org;
    const id = req.params.id;
    const person = await People.findByIdAndUpdate(
      id,
      { submitted: false },
      { returnDocument: "after" },
    );
    if (!person || person.length === 0) {
      return res.status(204).json({ message: "Person not found" });
    }

    return res.status(200).json({ message: "Cancelled during processing" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "ITs not you its me, something went wrong" });
  }
};

const getNewMembersByDate = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const { type, value } = req.query;

    if (!type || !value) {
      return res.status(400).json({
        message: "Missing query parameters. 'type' and 'value' are required.",
      });
    }

    let startDate, endDate;

    // 1. Calculate the start and end of the date window dynamically
    if (type === "full") {
      // value is "2026-07-06"
      startDate = new Date(`${value}T00:00:00.000Z`);
      endDate = new Date(`${value}T23:59:59.999Z`);
    } else if (type === "month") {
      // value is "2026-07"
      const [year, month] = value.split("-");
      startDate = new Date(
        Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0),
      );
      // Gets the exact last millisecond of that calendar month
      endDate = new Date(
        Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999),
      );
    } else if (type === "year") {
      // value is "2026"
      const yearNum = parseInt(value);
      startDate = new Date(Date.UTC(yearNum, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));
    } else {
      return res.status(400).json({ message: "Invalid type selection." });
    }

    console.log(
      `[Database Query] Searching range from: ${startDate.toISOString()} to: ${endDate.toISOString()}`,
    );

    // 2. Query Mongoose using clean mathematical range operators ($gte / $lt)
    const newbies = await People.find({
      isNewMember: true,
      dateJoined: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: newbies.length,
      newMembers: newbies,
    });
  } catch (err) {
    console.error("Backend error filtering newbies:", err);
    return res.status(500).json({
      message: "Something went wrong while executing search criteria",
      error: err.message,
    });
  }
};

// Lightweight health-check endpoint to keep the server warm
const healthCheck = (req, res) => {
  console.log(
    "Ping received at " + new Date().toISOString() + " - Keeping server awake!",
  );

  res.status(200).json({
    status: "active",
    message: "Server is warm and operational.",
  });
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
  genderReport,
  personalReport,
  personalReportHistory,
  getpersonById,
  exportAttendanceHtml,
  findFrequentAbsentees,
  absenteesOrPresentPeople,
  markthoseWhoStayed,
  undoStayed,
  thoseWhoStayed,
  checkSessions,
  resetAdminPasswordStatus,
  generateOrgCode,
  findOrgCode,
  getAllSessions,
  generateQrCode,
  AdminGetSubmittedPersons,
  adminDismiss,
  updateDOBandProfilePicture,
  sendBirthdayEmails,
  healthCheck,
  getNewMembersByDate,
  // cleanupTodayDuplicates,
};
