const express = require("express");
const { connection } = require("./src/config/db");
const userRoute = require("./src/modules/user_model/user_route");
const app = express();
const path = require("path");
const port = process.env.PORT || 3000;

app.use(express.json());
connection();
;
app.get("/a", (req, res) => {
  res.send("Hello World!");
});
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", userRoute);

app.listen(port, () => {
  console.log(` server listening on port ${port}`);
});
