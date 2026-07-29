const sessionSchema = require("../../../models/session");
const peopleSchema = require("../../../models/People");
const attendanceSchema = require("../../../models/attendance");
const bcrypt = require("bcrypt");
const { OrgSchemaForPasskey } = require("../../../models/org"); // Adjust path
const {
  perfectAttendanceLeaderboardSchema,
  earlyBirdLeaderboardSchema,
  newbieRetentionLeaderboardSchema,
} = require("../../../models/rewards");
const crypto = require("crypto");

// Helper to convert time strings (like "08:30 AM", "2:15 PM", or "14:00") into minutes from midnight

const parseTimeToMinutes = (timeStr) => {
  const is12Hour = /am|pm/i.test(timeStr);
  let [time, modifier] = timeStr.toLowerCase().split(/(am|pm)/);
  let [hours, minutes] = time.trim().split(":").map(Number);
  if (is12Hour && modifier === "pm" && hours < 12) hours += 12;
  if (is12Hour && modifier === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getPerfectAttendanceWinners = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);
    const Leaderboard = req.db.model(
      "PerfectAttendanceLeaderboard",
      perfectAttendanceLeaderboardSchema,
    );

    // Grab startDate, endDate, and the new strict parameter (defaults to false if not sent)
    const { startDate, endDate, strict } = req.query;
    if (!startDate || !endDate)
      return res.status(400).json({ message: "Missing dates" });

    const isStrict = strict === "true";

    // 1. Find all closed church sessions between dates
    const closedSessions = await Session.find({
      status: "Closed",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .select("_id")
      .lean();

    const totalSessions = closedSessions.length;
    if (totalSessions === 0)
      return res.status(200).json({ message: "No sessions", winners: [] });

    const sessionIds = closedSessions.map((s) => s._id);

    // 2. Grab all present logs
    const allPresentRecords = await Attendance.find({
      sessionId: { $in: sessionIds },
      status: "P",
    })
      .select("name")
      .lean();

    // 3. Count attendances in memory
    const attendanceTracker = {};
    for (let i = 0; i < allPresentRecords.length; i++) {
      const personId = allPresentRecords[i].name.toString();
      attendanceTracker[personId] = (attendanceTracker[personId] || 0) + 1;
    }

    // 4. Determine target candidates based on mode rules
    let candidateIds = [];
    let usedFallback = false;

    // First try: Hunt for strict 100% perfect attendance matching totalSessions
    for (const personId in attendanceTracker) {
      if (attendanceTracker[personId] === totalSessions) {
        candidateIds.push(personId);
      }
    }

    // Fallback trigger: If nobody is perfect AND user allowed fallbacks, look for runners-up
    if (candidateIds.length === 0 && !isStrict) {
      usedFallback = true;
      // Accept everyone who showed up at least once so we can pick the highest remaining values
      candidateIds = Object.keys(attendanceTracker);
    }

    // If there are still no records at all, wipe old cache and leave early
    if (candidateIds.length === 0) {
      await Leaderboard.deleteMany({});
      return res
        .status(200)
        .json({ message: "No matching attendees found", top5: [] });
    }

    // 5. Gather profiles for evaluated people
    const profiles = await People.find({ _id: { $in: candidateIds } })
      .select("name gender phone")
      .lean();

    // 6. Map scores, sort from highest to lowest, and extract top 5
    let participants = profiles.map((p) => ({
      personId: p._id,
      name: p.name,
      gender: p.gender,
      phone: p.phone,
      totalPresentCount: attendanceTracker[p._id.toString()],
    }));

    participants.sort((a, b) => b.totalPresentCount - a.totalPresentCount);
    const top5 = participants
      .slice(0, 5)
      .map((player, idx) => ({ rank: idx + 1, ...player }));

    // 7. Write to cache table
    await Leaderboard.deleteMany({});
    if (top5.length > 0) await Leaderboard.insertMany(top5);

    return res.status(200).json({
      message: usedFallback
        ? "No perfect attendees found. Fell back to top available runners-up!"
        : "Perfect Attendance Leaderboard updated strictly!",
      fallbackApplied: usedFallback,
      top5,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getEarlyBirdRewardWinners = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);
    const Leaderboard = req.db.model(
      "EarlyBirdLeaderboard",
      earlyBirdLeaderboardSchema,
    );

    const { startDate, endDate, targetTime } = req.query;
    if (!startDate || !endDate || !targetTime)
      return res.status(400).json({ message: "Missing params" });

    const cutoffMinutes = parseTimeToMinutes(targetTime);
    const sessionsInRange = await Session.find({
      status: "Closed",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .select("_id")
      .lean();

    if (sessionsInRange.length === 0)
      return res.status(200).json({ message: "No sessions", winners: [] });
    const sessionIds = sessionsInRange.map((s) => s._id);

    const attendanceRecords = await Attendance.find({
      sessionId: { $in: sessionIds },
      status: "P",
    })
      .select("name createdAt")
      .lean();

    const personStats = {};
    for (let i = 0; i < attendanceRecords.length; i++) {
      const rec = attendanceRecords[i];
      const personId = rec.name.toString();

      const recordTimeStr = new Date(rec.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const [recHours, recMinutes] = recordTimeStr.split(":").map(Number);
      const recordMinutes = recHours * 60 + recMinutes;

      if (recordMinutes <= cutoffMinutes) {
        if (!personStats[personId]) {
          personStats[personId] = {
            earlyDaysCount: 0,
            totalEarlyMinutesMargin: 0,
          };
        }
        personStats[personId].earlyDaysCount += 1;
        // Keep track of how many total minutes early they were across all days
        personStats[personId].totalEarlyMinutesMargin +=
          cutoffMinutes - recordMinutes;
      }
    }

    const activeIds = Object.keys(personStats);
    const profiles = await People.find({ _id: { $in: activeIds } })
      .select("name gender phone")
      .lean();

    let leaderboardEntries = profiles.map((p) => {
      const stats = personStats[p._id.toString()];
      return {
        personId: p._id,
        name: p.name,
        gender: p.gender,
        phone: p.phone,
        earlyDaysCount: stats.earlyDaysCount,
        averageEarlyMinutes: Math.round(
          stats.totalEarlyMinutesMargin / stats.earlyDaysCount,
        ),
      };
    });

    // Advanced Ranking: Sort by most early days first. If equal, sort by highest average minutes early.
    leaderboardEntries.sort((a, b) => {
      if (b.earlyDaysCount !== a.earlyDaysCount) {
        return b.earlyDaysCount - a.earlyDaysCount;
      }
      return b.averageEarlyMinutes - a.averageEarlyMinutes;
    });

    const top5 = leaderboardEntries
      .slice(0, 5)
      .map((player, idx) => ({ rank: idx + 1, ...player }));

    await Leaderboard.deleteMany({});
    if (top5.length > 0) await Leaderboard.insertMany(top5);

    return res
      .status(200)
      .json({ message: "Early Bird Leaderboard updated!", top5 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getNewbieRetentionWinners = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);
    const Leaderboard = req.db.model(
      "NewbieRetentionLeaderboard",
      newbieRetentionLeaderboardSchema,
    );

    const newbies = await People.find({ isNewMember: true })
      .select("_id name phone gender")
      .lean();
    let candidates = [];

    for (const person of newbies) {
      const history = await Attendance.find({ name: person._id })
        .sort({ date: 1 })
        .select("status")
        .lean();

      let maxStreak = 0;
      let currentStreak = 0;

      for (let i = 0; i < history.length; i++) {
        if (history[i].status === "P") {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 0; // Chain broken by Absence
        }
      }

      if (maxStreak > 0) {
        candidates.push({
          personId: person._id,
          name: person.name,
          phone: person.phone,
          gender: person.gender,
          longestStreak: maxStreak,
        });
      }
    }

    // Sort by longest calculated streak descending
    candidates.sort((a, b) => b.longestStreak - a.longestStreak);
    const top5 = candidates
      .slice(0, 5)
      .map((player, idx) => ({ rank: idx + 1, ...player }));

    await Leaderboard.deleteMany({});
    if (top5.length > 0) await Leaderboard.insertMany(top5);

    return res
      .status(200)
      .json({ message: "Newbie Retention Leaderboard updated!", top5 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// =========================================================================
// 0. INITIAL CREATE PASSKEY (For First-Time Setup Only)
// =========================================================================
const createInitialOrganizationPasskey = async (req, res) => {
  try {
    const OrgPasskeyModel = req.db.model("OrgPasskey", OrgSchemaForPasskey);
    const { accessCode } = req.body;
    const orgName = req.user.org; // Securely fetched from JWT auth state context

    // 1. Validation for essential inputs
    if (!orgName) {
      return res
        .status(400)
        .json({ message: "User organization context is missing" });
    }

    if (!accessCode) {
      return res
        .status(400)
        .json({ message: "Access code is required for initial setup" });
    }

    if (accessCode.length !== 6) {
      return res
        .status(400)
        .json({ message: "The access code must be exactly 6 characters long" });
    }

    // 2. Guard Clause: Block request if a passkey record already exists for this church
    const thatOrg = await OrgPasskeyModel.findOne({ org: orgName });

    if (thatOrg && thatOrg.accessCode) {
      return res.status(400).json({
        message:
          "Code has already been set for this organization. If you want to change it, use the change passkey route.",
      });
    }

    // 3. Hash the first-time passkey securely using bcrypt
    const saltRounds = 10;
    const hashedAccessCode = await bcrypt.hash(accessCode, saltRounds);

    // 4. Save the document configuration to the collection
    const newOrgPasskey = new OrgPasskeyModel({
      org: orgName,
      accessCode: hashedAccessCode,
      failedAttempts: 0,
      lockoutUntil: null,
    });

    await newOrgPasskey.save();

    return res.status(201).json({
      message: `Passkey successfully initialized and locked for organization: ${orgName}`,
    });
  } catch (err) {
    console.error("Create Passkey Error:", err);
    return res.status(500).json({
      message: "Internal server error initializing organization passkey",
    });
  }
};

// Configure the transactional email client for Brevo
// Stored inside .env file

// LOCKOUT THRESHOLDS
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// =========================================================================
// 1. VERIFY PASSKEY (With Intelligent Account Lockout System)
// =========================================================================
const verifyOrganizationPasskey = async (req, res) => {
  try {
    const OrgPasskeyModel = req.db.model("OrgPasskey", OrgSchemaForPasskey);
    const { accessCode } = req.body;
    const orgName = req.user.org;

    const thatOrg = await OrgPasskeyModel.findOne({ org: orgName });
    if (!thatOrg)
      return res.status(404).json({ message: "Organization not found" });

    // Check if account is currently locked out
    if (thatOrg.lockoutUntil && thatOrg.lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (thatOrg.lockoutUntil - new Date()) / 60000,
      );
      return res.status(403).json({
        message: `This account is locked due to multiple failed entry attempts. Try again in ${remainingMinutes} minutes.`,
      });
    }

    // Compare code
    const isMatch = await bcrypt.compare(accessCode, thatOrg.accessCode);

    if (!isMatch) {
      // Increment failures
      thatOrg.failedAttempts += 1;

      if (thatOrg.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        thatOrg.lockoutUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60000,
        );
        thatOrg.failedAttempts = 0; // Reset counter for post-lockout cycle
        await thatOrg.save();
        return res.status(403).json({
          message:
            "Security threshold breached. Account locked out for 15 minutes.",
        });
      }

      await thatOrg.save();
      return res.status(401).json({
        message: "Invalid passkey code string.",
        attemptsRemaining: MAX_FAILED_ATTEMPTS - thatOrg.failedAttempts,
      });
    }

    // Success: Reset tracking counters
    thatOrg.failedAttempts = 0;
    thatOrg.lockoutUntil = null;
    await thatOrg.save();

    return res
      .status(200)
      .json({ message: "Passkey verification verified successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal verification error" });
  }
};

// =========================================================================
// 2. CHANGE PASSKEY (For Active Logged-In Authorized Admins)
// =========================================================================
const changeOrganizationPasskey = async (req, res) => {
  try {
    const OrgPasskeyModel = req.db.model("OrgPasskey", OrgSchemaForPasskey);
    const { oldAccessCode, newAccessCode } = req.body;
    const orgName = req.user.org;

    if (!oldAccessCode || !newAccessCode || newAccessCode.length !== 6) {
      return res.status(400).json({
        message: "Please supply a valid old code and a new 6-character code",
      });
    }

    const thatOrg = await OrgPasskeyModel.findOne({ org: orgName });
    if (!thatOrg)
      return res.status(404).json({ message: "Organization not found" });

    // Validate past passcode authority
    const isValid = await bcrypt.compare(oldAccessCode, thatOrg.accessCode);
    if (!isValid)
      return res
        .status(401)
        .json({ message: "Your current passkey is incorrect" });

    // Hash and store the updated passcode mapping
    thatOrg.accessCode = await bcrypt.hash(newAccessCode, 10);
    await thatOrg.save();

    return res
      .status(200)
      .json({ message: "Organization passkey updated successfully!" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error modifying passcode" });
  }
};

// =========================================================================
// 3. FORGOT PASSKEY (Generates Token
// =========================================================================

const forgotOrganizationPasskey = async (req, res) => {
  try {
    // SAFE CHECK: Prevents OverwriteModelError crashes on frequent hits
    const OrgPasskeyModel =
      req.db.models.OrgPasskey ||
      req.db.model("OrgPasskey", OrgSchemaForPasskey);

    const { email } = req.body;
    const orgName = req.user.org; // Pull secure contextual state validation from token

    const thatOrg = await OrgPasskeyModel.findOne({ org: orgName });
    if (!thatOrg) {
      return res
        .status(404)
        .json({ message: "Organization data link mismatch" });
    }

    // Generate secure random crypto-token to deliver to the mail inbox
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Securely cache the token value as a hash in database storage
    thatOrg.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    thatOrg.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour token duration
    await thatOrg.save();

    // FIXED: Corrected path interpolation construction rules
    const resetUrl = `https://yourdomain.com{resetToken}`;

    // Premium, mobile-responsive clean email template execution

    sendSmtpEmail.sender = {
      name: "Church Tech Admin",
      email: "admin@yourchurch.com", // Ensure this identity is completely verified inside Brevo dashboard setups
    };
    sendSmtpEmail.to = [{ email: email }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return res.status(200).json({
      message:
        "Recovery authorization payload dispatched completely via Brevo service infrastructure lines.",
    });
  } catch (err) {
    console.error("Brevo Email Sending Error Node Context Caught:", err);
    return res.status(500).json({
      message:
        "An architectural failure blocked password recovery execution sequence workflows.",
    });
  }
};

// =========================================================================
// 4. RESET PASSKEY (Consumes Token & Completes Update)
// =========================================================================
const resetOrganizationPasskey = async (req, res) => {
  try {
    const OrgPasskeyModel = req.db.model("OrgPasskey", OrgSchemaForPasskey);
    const { token, newAccessCode } = req.body;

    if (!token || !newAccessCode || newAccessCode.length !== 6) {
      return res
        .status(400)
        .json({ message: "Token and valid 6-digit access code are required" });
    }

    // Hash incoming URL query token string to find its match inside DB logs
    const encryptedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const thatOrg = await OrgPasskeyModel.findOne({
      resetPasswordToken: encryptedToken,
      resetPasswordExpiresAt: { $gt: new Date() }, // Must be larger than present time clock
    });

    if (!thatOrg)
      return res
        .status(400)
        .json({ message: "Reset token is invalid or has expired." });

    // Commit new access token securely
    thatOrg.accessCode = await bcrypt.hash(newAccessCode, 10);

    // Purge single-use token entries from tracking document block
    thatOrg.resetPasswordToken = null;
    thatOrg.resetPasswordExpiresAt = null;
    thatOrg.failedAttempts = 0; // Release locks if applicable
    thatOrg.lockoutUntil = null;

    await thatOrg.save();

    return res.status(200).json({
      message: "Passkey reset successfully. You can now use your new code.",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error processing security token swap" });
  }
};

// =========================================================================
// CHECK PASSKEY SETUP STATUS
// =========================================================================
const getPasskeyStatus = async (req, res) => {
  try {
    console.log("Checking passkey configuration status...");
    const OrgPasskeyModel =
      req.db.models.OrgPasskey ||
      req.db.model("OrgPasskey", OrgSchemaForPasskey);
    const orgName = req.user.org;

    const thatOrg = await OrgPasskeyModel.findOne({ org: orgName });

    // Check if accessCode exists and is non-empty
    const isConfigured = Boolean(thatOrg && thatOrg.accessCode);

    if (isConfigured) {
      return res.status(400).json({
        configured: true,
        message: "Passkey has already been set for this organization.",
      });
    }

    return res.status(200).json({
      configured: false,
      message: "No passkey configured. Setup is required.",
    });
  } catch (err) {
    console.error("Error checking passkey status:", err);
    return res.status(500).json({ message: "Error retrieving passkey status" });
  }
};

module.exports = {
  getPerfectAttendanceWinners,
  getEarlyBirdRewardWinners,
  getNewbieRetentionWinners,
  verifyOrganizationPasskey,
  changeOrganizationPasskey,
  forgotOrganizationPasskey,
  resetOrganizationPasskey,
  createInitialOrganizationPasskey,
  getPasskeyStatus,
};
