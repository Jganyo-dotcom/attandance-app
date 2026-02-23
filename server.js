const express = require("express");
const { connectDatabases } = require("./src/config/db");
const userRoute = require("./src/modules/user_model/user_route");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;
const cors = require("cors");
const morgan = require("morgan");
//require("././src/models/utils/cron")

// const { registerAdminfunction } = require("./src/config/admin.setup");

app.use(cors());

// Use morgan with the "combined" or "dev" format
app.use(morgan("dev")); // logs method, URL, status, response time
app.use(express.json());
connectDatabases();
// registerAdminfunction()

app.get("/a", (req, res) => {
  res.send("Hello World!");
});
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", userRoute);

app.listen(port, "0.0.0.0", () => {
  console.log(` server listening on port ${port}`);
});
