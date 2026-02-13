const cron = require("node-cron");
const {
  pastAttendance,
} = require("../../modules/user_model/admin_user/controller");
const { connectDatabases } = require("../../config/db");

async function start() {
  await connectDatabases(); // wait until all DBs are connected

  cron.schedule("*/16 * * * *", async () => {
    console.log("Running pastAttendance job...");
    try {
      await pastAttendance();
      console.log("pastAttendance executed successfully");
    } catch (err) {
      console.error("Error running pastAttendance:", err);
    }
  });
}

start();
