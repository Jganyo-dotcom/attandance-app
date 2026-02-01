const CheckroleonAll = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Unauthorised acccess" });
  }
  next();
};

const checkroleonAll = (req, res, next) => {
  if (req.user.role !== "Admin" || req.user.role !== "staff") {
    return res.status(403).json({ message: "Unauthorised acccess" });
  }
  next();
};

module.exports = { CheckroleonAll, checkroleonAll };
