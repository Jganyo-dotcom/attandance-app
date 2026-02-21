const express = require("express");
const {
  LoginUser,
  registerNewUser,
  deleteall,
  createAdmin,
  getAdmins,
  passLink,
  resetPassword,
} = require("./User_controller");
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
  getAllStaff,
  updatePerson,
  updateAdminAndStaff,
  endOfDayReport,
  genderReport,
  personalReport,
  personalReportHistory,
} = require("./admin_user/controller");
const {
  CheckroleonAll,
  checkroleonAll,
  OnlyManager,
} = require("../../middlewares/role");
const authmiddleware = require("../../middlewares/auth");

const router = express.Router();

router.post("/guest/login", LoginUser);
router.post("/guest/register", registerNewUser);
router.post("/forget-password", passLink);
router.post("/reset-password", resetPassword);

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
router.patch("/admin/update/:id", authmiddleware, CheckroleonAll, updatePerson);
router.patch(
  "/update/me/:id",
  authmiddleware,
  checkroleonAll,
  updateAdminAndStaff,
);
router.post(
  "/admin/change-password/:id",
  authmiddleware,
  CheckroleonAll,
  AdminChangePassword,
);
router.get(
  "/admin/staff/accounts",
  authmiddleware,
  CheckroleonAll,
  getAllStaff,
);
router.delete("/admin/unverify/:id", authmiddleware, CheckroleonAll, unverify);
router.delete("/admin/:id/delete", authmiddleware, CheckroleonAll, deleteAdmin);
router.get(
  "/end-of-day-report",
  authmiddleware,
  CheckroleonAll,
  endOfDayReport,
);
router.get(
  "/personal-report/:personId",
  authmiddleware,
  CheckroleonAll,
  personalReport,
);

router.get(
  "/personal-report-history/:personId",
  authmiddleware,
  CheckroleonAll,
  personalReportHistory,
);

router.get("/gender-report", authmiddleware, CheckroleonAll, genderReport);

// manager
router.get("/get-all-admins", authmiddleware, OnlyManager, getAdmins);
router.post("/admin/create", authmiddleware, OnlyManager, createAdmin);

module.exports = router;
