const mongoose = require("mongoose");

const connections = {};

const connectDatabases = async () => {
  try {
    // Connect to main DB
    connections.Main = mongoose.createConnection(process.env.MONGO_URI);
    await connections.Main.asPromise();

    // Connect to visa DB
    connections.Visa = mongoose.createConnection(process.env.MONGO_URI_VISA);
    await connections.Visa.asPromise();

    // Connect to teens DB
    connections.Teens = mongoose.createConnection(process.env.MONGO_URI_TEENS);
    await connections.Teens.asPromise();

    // connect to uoe DB
    connections.VisaUOE = mongoose.createConnection(
      process.env.MONGO_URI_VISA_UOE,
    );
    await connections.VisaUOE.asPromise();

    console.log("All 4 databases connected");
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

module.exports = { connectDatabases, connections };
