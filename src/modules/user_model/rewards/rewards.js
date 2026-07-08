
const Session = require("../../../models/session")
const People = require("../../../models/People")
const Attendance = require("../../../models/attendance")
const {
  perfectAttendanceLeaderboardSchema,
  earlyBirdLeaderboardSchema,
  newbieRetentionLeaderboardSchema
} = require("../../../models/rewards");


// Helper to convert time strings (like "08:30 AM", "2:15 PM", or "14:00") into minutes from midnight

const parseTimeToMinutes = (timeStr) => {
  const is12Hour = /am|pm/i.test(timeStr);
  let [time, modifier] = timeStr.toLowerCase().split(/(am|pm)/);
  let [hours, minutes] = time.trim().split(':').map(Number);
  if (is12Hour && modifier === 'pm' && hours < 12) hours += 12;
  if (is12Hour && modifier === 'am' && hours === 12) hours = 0;
  return (hours * 60) + minutes;
};


const getPerfectAttendanceWinners = async (req, res) => {
  try {
    const Session = req.db.model("Session", sessionSchema);
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);
    const Leaderboard = req.db.model("PerfectAttendanceLeaderboard", perfectAttendanceLeaderboardSchema);

    // Grab startDate, endDate, and the new strict parameter (defaults to false if not sent)
    const { startDate, endDate, strict } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: "Missing dates" });
    
    const isStrict = strict === "true"; 

    // 1. Find all closed church sessions between dates
    const closedSessions = await Session.find({
      status: "Closed",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).select("_id").lean();

    const totalSessions = closedSessions.length;
    if (totalSessions === 0) return res.status(200).json({ message: "No sessions", winners: [] });

    const sessionIds = closedSessions.map(s => s._id);
    
    // 2. Grab all present logs
    const allPresentRecords = await Attendance.find({ 
      sessionId: { $in: sessionIds }, 
      status: "P" 
    }).select("name").lean();

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
      return res.status(200).json({ message: "No matching attendees found", top5: [] });
    }

    // 5. Gather profiles for evaluated people
    const profiles = await People.find({ _id: { $in: candidateIds } }).select("name gender phone").lean();

    // 6. Map scores, sort from highest to lowest, and extract top 5
    let participants = profiles.map(p => ({
      personId: p._id,
      name: p.name,
      gender: p.gender,
      phone: p.phone,
      totalPresentCount: attendanceTracker[p._id.toString()]
    }));

    participants.sort((a, b) => b.totalPresentCount - a.totalPresentCount);
    const top5 = participants.slice(0, 5).map((player, idx) => ({ rank: idx + 1, ...player }));

    // 7. Write to cache table
    await Leaderboard.deleteMany({});
    if (top5.length > 0) await Leaderboard.insertMany(top5);

    return res.status(200).json({ 
      message: usedFallback 
        ? "No perfect attendees found. Fell back to top available runners-up!" 
        : "Perfect Attendance Leaderboard updated strictly!", 
      fallbackApplied: usedFallback,
      top5 
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
    const Leaderboard = req.db.model("EarlyBirdLeaderboard", earlyBirdLeaderboardSchema);

    const { startDate, endDate, targetTime } = req.query;
    if (!startDate || !endDate || !targetTime) return res.status(400).json({ message: "Missing params" });

    const cutoffMinutes = parseTimeToMinutes(targetTime);
    const sessionsInRange = await Session.find({
      status: "Closed",
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).select("_id").lean();

    if (sessionsInRange.length === 0) return res.status(200).json({ message: "No sessions", winners: [] });
    const sessionIds = sessionsInRange.map(s => s._id);

    const attendanceRecords = await Attendance.find({ sessionId: { $in: sessionIds }, status: "P" }).select("name createdAt").lean();

    const personStats = {};
    for (let i = 0; i < attendanceRecords.length; i++) {
      const rec = attendanceRecords[i];
      const personId = rec.name.toString();

      const recordTimeStr = new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const [recHours, recMinutes] = recordTimeStr.split(':').map(Number);
      const recordMinutes = (recHours * 60) + recMinutes;

      if (recordMinutes <= cutoffMinutes) {
        if (!personStats[personId]) {
          personStats[personId] = { earlyDaysCount: 0, totalEarlyMinutesMargin: 0 };
        }
        personStats[personId].earlyDaysCount += 1;
        // Keep track of how many total minutes early they were across all days
        personStats[personId].totalEarlyMinutesMargin += (cutoffMinutes - recordMinutes);
      }
    }

    const activeIds = Object.keys(personStats);
    const profiles = await People.find({ _id: { $in: activeIds } }).select("name gender phone").lean();

    let leaderboardEntries = profiles.map(p => {
      const stats = personStats[p._id.toString()];
      return {
        personId: p._id,
        name: p.name,
        gender: p.gender,
        phone: p.phone,
        earlyDaysCount: stats.earlyDaysCount,
        averageEarlyMinutes: Math.round(stats.totalEarlyMinutesMargin / stats.earlyDaysCount)
      };
    });

    // Advanced Ranking: Sort by most early days first. If equal, sort by highest average minutes early.
    leaderboardEntries.sort((a, b) => {
      if (b.earlyDaysCount !== a.earlyDaysCount) {
        return b.earlyDaysCount - a.earlyDaysCount;
      }
      return b.averageEarlyMinutes - a.averageEarlyMinutes;
    });

    const top5 = leaderboardEntries.slice(0, 5).map((player, idx) => ({ rank: idx + 1, ...player }));

    await Leaderboard.deleteMany({});
    if (top5.length > 0) await Leaderboard.insertMany(top5);

    return res.status(200).json({ message: "Early Bird Leaderboard updated!", top5 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};



const getNewbieRetentionWinners = async (req, res) => {
  try {
    const People = req.db.model("People", peopleSchema);
    const Attendance = req.db.model("Attendance", attendanceSchema);
    const Leaderboard = req.db.model("NewbieRetentionLeaderboard", newbieRetentionLeaderboardSchema);

    const newbies = await People.find({ isNewMember: true }).select("_id name phone gender").lean();
    let candidates = [];

    for (const person of newbies) {
      const history = await Attendance.find({ name: person._id }).sort({ date: 1 }).select("status").lean();

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
          longestStreak: maxStreak
        });
      }
    }

    // Sort by longest calculated streak descending
    candidates.sort((a, b) => b.longestStreak - a.longestStreak);
    const top5 = candidates.slice(0, 5).map((player, idx) => ({ rank: idx + 1, ...player }));

    await Leaderboard.deleteMany({});
    if (top5.length > 0) await Leaderboard.insertMany(top5);

    return res.status(200).json({ message: "Newbie Retention Leaderboard updated!", top5 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


module.exports = {getPerfectAttendanceWinners,getEarlyBirdRewardWinners,getNewbieRetentionWinners}