const attendance = require("../../models/attendance");
const SessionSchema = require("../../models/session");
const UserSchema = require("../../models/user.model");

const markMe = async (req, res) => {
  try {
    const personId = req.params.personPresent;
    const user = req.user.id;
    const session = req.params.sessionId;
    const person = await UserSchema.findById(personId);
    if (!person) {
      return res.status(404).json({ message: "person not found" });
    }
    if (session.status !== "open") {
      return res.status(400).json({ message: "session is not opened" });
    }
    const markPerson = new attendance({
      sessionId: sussionId,
      status: "P",
      name: person,
      markedBy: user,
    });
    await markPerson.save();
    return res.status(200).json({ message: "Successful" });
  } catch (err) {
    return res.status(200).json({ message: "something went wrong" });
  }
};

const createSession = async (req, res) => {
  try {
    const user = req.user.id;
    // Create a Date object
    const now = new Date();
    // Format date (YYYY-MM-DD)
    const today = now.toISOString().split("T")[0];
    // Format time (HH:MM:SS)
    const time = now.toTimeString().split(" ")[0];

    const session = await SessionSchema.findOne({ status: "Open" });
    if (session) {
      return res
        .status(404)
        .json({ message: "close previous session to start new one" });
    }

    const markPerson = new SessionSchema({
      date: today,
      start: time,
      status: "Open",
      author: user,
    });
    await markPerson.save();
    return res.status(200).json({ message: "Successful" });
  } catch (err) {
    return res.status(500).json({ message: "something went wrong" });
  }
};
