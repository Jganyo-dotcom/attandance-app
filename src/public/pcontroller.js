const peopleSchema = require("../models/People");
const OrgSchema = require("../models/org");
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
    const Org = orgConnection.model("Org", peopleSchema);

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


const guestMarkAsSubmitted = async (req, res) => {
  try {
    // Extract parameters from the URL route path
    const { org, code, personId } = req.params;

    // Step 1: Validate organization connection environment
    const orgConnection = connections[org];
    if (!orgConnection) {
      return res.status(400).json({ message: "Invalid organization" });
    }

    // Initialize models using the active organization's specific database context
    const People = orgConnection.model("People", peopleSchema);
    const Org = orgConnection.model("Org", OrgSchema); // Fixed: Make sure to use OrgSchema here

    // Step 2: Validate code security threshold and expiry window
    const orgDoc = await Org.findOne({
      name: org,
      accessCode: code,
      accessCodeExpiresAt: { $gt: new Date() },
    });

    if (!orgDoc) {
      return res.status(403).json({ message: "Unauthorized: Your code is invalid" });
    }

    // Step 3: Find the person inside this organization and update their status
    // Enforcing { org } inside the query safeguards against cross-tenant database updates
    const updatedPerson = await People.findOneAndUpdate(
      { _id: id, org: org },
      { $set: { submitted: true } },
      { returnDocument: "after" } // Returns the newly modified document instead of the old one
    );

    if (!updatedPerson) {
      return res.status(404).json({ message: "Person not found in this organization" });
    }

    // Step 4: Return execution response context
    res.json({
      message: "Submitted for processing",
      person: updatedPerson,
    });

  } catch (err) {
    console.error("Error updating submission state:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Export your functions accordingly
module.exports = {
  guestgetAllPersons,
  guestMarkAsSubmitted
};


