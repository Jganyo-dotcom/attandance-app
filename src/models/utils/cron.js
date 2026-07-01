const cron = require("node-cron");
const {
  pastAttendance,
  sendBirthdayEmails,
} = require("../../modules/user_model/admin_user/controller");
const { connectDatabases } = require("../../config/db");

// async function start() {
//   await connectDatabases(); // wait until all DBs are connected

//   cron.schedule("*/1 * * * *", async () => {
//     console.log("Running pastAttendance job...");
//     try {
//       await pastAttendance();
//       console.log("pastAttendance executed successfully");
//     } catch (err) {
//       console.error("Error running pastAttendance:", err);
//     }
//   });
// }

// Runs exactly at 00:00 (Midnight) every single day
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled midnight birthday email job...");
  await sendBirthdayEmails();
});

// start();
