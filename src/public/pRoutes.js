const express = require("express");
const {guestgetAllPersons,guestMarkAsSubmitted} = require("./pcontroller");

const router = express.Router();

router.get("/org/get-All/:org/:code",guestgetAllPersons );
router.get("/org/attendance/request/:org/:code/:personId", guestMarkAsSubmitted);






module.exports = router;
