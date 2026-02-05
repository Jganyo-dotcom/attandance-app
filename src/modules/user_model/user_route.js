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
  getAllPersons,
  markAsPresent,
  getAllAbsent,
  exportAttendance,
  deletePerson,
  AdminChangePassword,
  deleteAdmin,
  unverify,
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

router.get("/Absents", authmiddleware, CheckroleonAll, getAllAbsent);
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
router.get(
  "/mark-present/:nameId/:sessionId/",
  authmiddleware,
  checkroleonAll,
  markAsPresent,
);
router.delete(
  "/mark-absent/:nameId/:sessionId/",
  authmiddleware,
  checkroleonAll,
  markAsAbsent,
);
router.get("/get-all/", authmiddleware, checkroleonAll, getAllPersons);
router.post("/create-person/", authmiddleware, checkroleonAll, createPerson);
router.post(
  "/search-person/",
  authmiddleware,
  checkroleonAll,
  searchPersonByName,
);
router.get(
  "/admin/export-attendance/:sessionId",
  authmiddleware,
  CheckroleonAll,
  exportAttendance,
);
router.delete(
  "/admin/delete/:id",
  authmiddleware,
  CheckroleonAll,
  deletePerson,
);
router.post(
  "/admin/change-password/:id",
  authmiddleware,
  CheckroleonAll,
  AdminChangePassword,
);
router.delete("/admin/unverify/:id", authmiddleware, CheckroleonAll, unverify);
router.delete("/admin/:id/delete", authmiddleware, CheckroleonAll, deleteAdmin);

module.exports = router;
