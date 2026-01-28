const express = require("express");
const { LoginUser, registerNewUser, deleteall } = require("./User_controller");
const {
  verif_staff_account,
  unblock_staff_account,
  pendingAccounts,
  getDisabledAccounts,
} = require("./admin_user/controller");

const router = express.Router();

router.post("/guest/login", LoginUser);
router.post("/guest/register", registerNewUser);

//admin routes

router.delete("/admin/deleteAll", deleteall);
router.get("/admin/verify/:id", verif_staff_account);
router.get("/admin/unblock/:id", unblock_staff_account);
router.get("/admin/blocked/accounts", getDisabledAccounts);
router.get("/admin/pending/accounts", pendingAccounts);

module.exports = router;
