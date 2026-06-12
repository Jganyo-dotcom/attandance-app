const express = require("express");
const guestgetAllPersons = require("./pcontroller");

const router = express.Router();

router.get("/org/get-All/:org/:code",guestgetAllPersons );






module.exports = router;
