const { SerialPort } = require("serialport");

console.log("Waiting for a REAL hardware response on COM3...");
console.log("Unplug the scanner -> it should do nothing.");
console.log("Plug it in and touch it -> it should print data.\n");

const port = new SerialPort({ path: "COM3", baudRate: 115200 }, (err) => {
  if (err) {
    console.log("🔴 PORT ERROR: Cannot even access COM3 slot.");
    process.exit(1);
  }
});

// We only log success if the hardware physically pushes bytes over the wire!
port.on("data", (rawBuffer) => {
  console.log("\n================ 🟢 REAL SUCCESS! ================");
  console.log("The physical device just sent data to the backend!");
  console.log("Raw Biometric Bytes:", rawBuffer.toString("hex"));
  console.log("==================================================\n");
  port.close();
  process.exit(0);
});

// Keep the script alive for 15 seconds to let you touch it
setTimeout(() => {
  console.log("🔴 TIMEOUT: No data was received from the physical hardware.");
  port.close();
  process.exit(1);
}, 15000);
