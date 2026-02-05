const express = require("express");
const { connectDatabases } = require("./src/config/db");
const userRoute = require("./src/modules/user_model/user_route");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;
const cors = require("cors");

// const { registerAdminfunction } = require("./src/config/admin.setup");

app.use(
  cors({
    origin: [
      "https://phenomenal-palmier-2f7f1c.netlify.app",
      "http://127.0.0.1:5500",
    ],
  }),
);

app.use(express.json());
connectDatabases();
// registerAdminfunction()

app.get("/a", (req, res) => {
  res.send("Hello World!");
});
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", userRoute);

app.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
