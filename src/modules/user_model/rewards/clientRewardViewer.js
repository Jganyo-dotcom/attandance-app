const {
  perfectAttendanceLeaderboardSchema,
  earlyBirdLeaderboardSchema,
  newbieRetentionLeaderboardSchema
} = require("../../../models/rewards");

// 1. Fetch Perfect Attendance Top 5
const viewPerfectAttendanceLeaderboard = async (req, res) => {
  try {
    const Leaderboard = req.db.model("PerfectAttendanceLeaderboard", perfectAttendanceLeaderboardSchema);
    
    // Fetch records sorted from Rank 1 down to Rank 5
    const list = await Leaderboard.find({}).sort({ rank: 1 }).lean();
    
    return res.status(200).json(list);
  } catch (err) {
    console.error("View Perfect Attendance Error:", err);
    return res.status(500).json({ message: "Error fetching leaderboard data" });
  }
};

// 2. Fetch Early Birds Top 5
const viewEarlyBirdLeaderboard = async (req, res) => {
  try {
    const Leaderboard = req.db.model("EarlyBirdLeaderboard", earlyBirdLeaderboardSchema);
    
    const list = await Leaderboard.find({}).sort({ rank: 1 }).lean();
    
    return res.status(200).json(list);
  } catch (err) {
    console.error("View Early Bird Error:", err);
    return res.status(500).json({ message: "Error fetching leaderboard data" });
  }
};

// 3. Fetch Newbie Streaks Top 5
const viewNewbieRetentionLeaderboard = async (req, res) => {
  try {
    const Leaderboard = req.db.model("NewbieRetentionLeaderboard", newbieRetentionLeaderboardSchema);
    
    const list = await Leaderboard.find({}).sort({ rank: 1 }).lean();
    
    return res.status(200).json(list);
  } catch (err) {
    console.error("View Newbie Streak Error:", err);
    return res.status(500).json({ message: "Error fetching leaderboard data" });
  }
};

// Export the view functions
module.exports = {
  viewPerfectAttendanceLeaderboard,
  viewEarlyBirdLeaderboard,
  viewNewbieRetentionLeaderboard
};
