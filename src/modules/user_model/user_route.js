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
  getpersonById,
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

// route to verify staff account
router.get(
  "/admin/verify/:id",
  authmiddleware,
  CheckroleonAll,
  verif_staff_account,
);

// route to unblock staff account
router.get(
  "/admin/unblock/:id",
  authmiddleware,
  CheckroleonAll,
  unblock_staff_account,
);

// route to fetch staff disabled accounts
router.get(
  "/admin/blocked/accounts",
  authmiddleware,
  CheckroleonAll,
  getDisabledAccounts,
);

// route to get all absent people
router.get("/Absents", authmiddleware, CheckroleonAll, getAllAbsent);

// route to get the staff pending accounts
router.get(
  "/admin/pending/accounts",
  authmiddleware,
  CheckroleonAll,
  pendingAccounts,
);

// route to create session for only admins
router.get("/create-session/", authmiddleware, CheckroleonAll, createSession);

// route to close session
router.get(
  "/close-session/:sessionId",
  authmiddleware,
  CheckroleonAll,
  closeSession,
);

// to mark people present
router.get(
  "/mark-present/:nameId/:sessionId/",
  authmiddleware,
  checkroleonAll,
  markAsPresent,
);

// to reverse the mark as present
router.delete(
  "/mark-absent/:nameId/:sessionId/",
  authmiddleware,
  checkroleonAll,
  markAsAbsent,
);

//  to get all the pople in the database
router.get("/get-all/", authmiddleware, checkroleonAll, getAllPersons);

// to add a person to the database
router.post("/create-person/", authmiddleware, checkroleonAll, createPerson);

// to search by name
router.post(
  "/search-person/",
  authmiddleware,
  checkroleonAll,
  searchPersonByName,
);

// to extract the excel sheet
router.get(
  "/admin/export-attendance/:sessionId",
  authmiddleware,
  CheckroleonAll,
  exportAttendance,
);

// delete a person in the database
router.delete(
  "/admin/delete/:id",
  authmiddleware,
  CheckroleonAll,
  deletePerson,
);

// to update people in the database
router.patch("/admin/update/:id", authmiddleware, CheckroleonAll, updatePerson);

// update admin and staff account
router.patch(
  "/update/me/:id",
  authmiddleware,
  checkroleonAll,
  updateAdminAndStaff,
);

// change password for both admin and staff
router.post(
  "/admin/change-password/:id",
  authmiddleware,
  CheckroleonAll,
  AdminChangePassword,
);

// get all the currents staff under the org
router.get(
  "/admin/staff/accounts",
  authmiddleware,
  CheckroleonAll,
  getAllStaff,
);

// to terminate the verify on the pending accounts
router.delete("/admin/unverify/:id", authmiddleware, CheckroleonAll, unverify);

// terminate account for the admin
router.delete("/admin/:id/delete", authmiddleware, CheckroleonAll, deleteAdmin);

// to get the graph
router.get(
  "/end-of-day-report",
  authmiddleware,
  CheckroleonAll,
  endOfDayReport,
);

// to get the rec
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
router.get(
  "/get-person/:id",
  authmiddleware,
  checkroleonAll,
  getpersonById,
);

// manager
router.get("/get-all-admins", authmiddleware, OnlyManager, getAdmins);
router.post("/admin/create", authmiddleware, OnlyManager, createAdmin);

module.exports = router;
