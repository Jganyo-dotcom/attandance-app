const mongoose = require("mongoose");

// SCHEMA 1: Perfect Attendance Leaderboard
const perfectAttendanceLeaderboardSchema = new mongoose.Schema({
  rank: { type: Number, required: true }, // 1 to 5
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "People", required: true },
  name: { type: String, required: true },
  gender: { type: String },
  phone: { type: String },
  totalPresentCount: { type: Number, required: true },
  calculatedAt: { type: Date, default: Date.now }
});

// SCHEMA 2: Early Bird Leaderboard
const earlyBirdLeaderboardSchema = new mongoose.Schema({
  rank: { type: Number, required: true }, // 1 to 5
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "People", required: true },
  name: { type: String, required: true },
  gender: { type: String },
  phone: { type: String },
  earlyDaysCount: { type: Number, required: true },
  averageEarlyMinutes: { type: Number, required: true }, // Avg minutes arrived BEFORE cutoff
  calculatedAt: { type: Date, default: Date.now }
});

// SCHEMA 3: Newbie Retention Leaderboard
const newbieRetentionLeaderboardSchema = new mongoose.Schema({
  rank: { type: Number, required: true }, // 1 to 5
  personId: { type: mongoose.Schema.Types.ObjectId, ref: "People", required: true },
  name: { type: String, required: true },
  gender: { type: String },
  phone: { type: String },
  longestStreak: { type: Number, required: true },
  calculatedAt: { type: Date, default: Date.now }
});



// Exporting schemas so they can be registered dynamically in the controllers
module.exports = {
  perfectAttendanceLeaderboardSchema,
  earlyBirdLeaderboardSchema,
  newbieRetentionLeaderboardSchema
};
