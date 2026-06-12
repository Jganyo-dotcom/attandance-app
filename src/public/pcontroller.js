const peopleSchema = require("../models/People");
const Org = require("../models/org");
const { connections } = require("../config/db");

const guestgetAllPersons = async (req, res) => {
  try {
    const { org, code } = req.params;

    // Step 1: Validate org connection
    const orgConnection = connections[org];
    if (!orgConnection) {
      return res.status(400).json({ message: "Invalid organization" });
    }

    const People = orgConnection.model("People", peopleSchema);

    // Step 2: Validate code against Org collection
    const orgDoc = await Org.findOne({
      name: org,
      accessCode: code,
      accessCodeExpiresAt: { $gt: new Date() }, // still valid
    });

    if (!orgDoc) {
      return res.status(403).json({ message: "Unauthorized: Your code is invalid" });
    }

    // Step 3: Build query restricted to org
    let query = { org };

    // Step 4: Add search filter if provided
    const search = req.query.search ? req.query.search.trim() : "";
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    // Step 5: Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await People.countDocuments(query);
    const females = await People.countDocuments({ ...query, gender: "F" });
    const males = await People.countDocuments({ ...query, gender: "M" });

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
      org,
    });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = guestgetAllPersons;
