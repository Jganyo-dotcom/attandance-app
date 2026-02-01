const express = require("express");
const { LoginUser, registerNewUser, deleteall } = require("./User_controller");
const {
  verif_staff_account,
  unblock_staff_account,
  pendingAccounts,
  getDisabledAccounts,
  createSession,
  closeSession,
  markAsAbsent,
  createPerson,
  searchPersonByName,
} = require("./admin_user/controller");
const { CheckroleonAll, checkroleonAll } = require("../../middlewares/role");
const authmiddleware = require("../../middlewares/auth");

const router = express.Router();

router.post("/guest/login", LoginUser);
router.post("/guest/register", registerNewUser);

//admin routes

router.delete("/admin/deleteAll", authmiddleware, CheckroleonAll, deleteall);
router.get(
  "/admin/verify/:id",
  authmiddleware,
  CheckroleonAll,
  verif_staff_account,
);
router.get(
  "/admin/unblock/:id",
  authmiddleware,
  CheckroleonAll,
  unblock_staff_account,
);
router.get(
  "/admin/blocked/accounts",
  authmiddleware,
  CheckroleonAll,
  getDisabledAccounts,
);
router.get(
  "/admin/pending/accounts",
  authmiddleware,
  CheckroleonAll,
  pendingAccounts,
);
router.get("/create-session/", authmiddleware, CheckroleonAll, createSession);
router.get(
  "/close-session/:sessionId",
  authmiddleware,
  CheckroleonAll,
  closeSession,
);
router.delete("/mark-present/", authmiddleware, checkroleonAll, markAsAbsent);
router.get("/mark-absent/", authmiddleware, checkroleonAll, markAsAbsent);
router.get("/create-person/", authmiddleware, checkroleonAll, createPerson);
router.post(
  "/search-person/",
  authmiddleware,
  checkroleonAll,
  searchPersonByName,
);

module.exports = router;
