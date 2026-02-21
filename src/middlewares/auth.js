const jwt = require("jsonwebtoken");
const { connections } = require("../config/db"); // import your connections object

const authmiddleware = (req, res, next) => {

  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "no token provided , Login!!!" });
    }

    const verify_token = jwt.verify(token, process.env.JWT_SECRETE);
    if (!verify_token) {
      return res.status(401).json({ message: "invalid token sign In" });
    }

    req.user = verify_token;

    // Attach the correct DB connection based on org in token
    const org = verify_token.org;
    if (org && connections[org]) {
      console.log(org);
      req.db = connections[org];
    } else {
      return res.status(400).json({ message: "Invalid org " });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Token expired or invalid" });
  }
};

module.exports = authmiddleware;
