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

module.exports = {
  verif_staff_account,
  unblock_staff_account,
  getDisabledAccounts,
  pendingAccounts,
};
