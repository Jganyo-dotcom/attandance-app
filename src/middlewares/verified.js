const Checkverified = (req, res, next) => {
  if (req.user.disabled === true) {
    return res
      .status(403)
      .json({ message: "Your acount has been blocked, contact admin !!!" });
  }
  next();
};

module.exports = { Checkverified };
