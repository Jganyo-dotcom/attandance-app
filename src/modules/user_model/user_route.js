const express = require("express");
const {
  LoginUser,
  registerNewUser,
  deleteall,
  createAdmin,
  getAdmins,
  passLink,
  resetPassword,
  temp,
  VerifyToken,
  verifyVerificationToken,
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
  updateDOBandProfilePicture,
  sendBirthdayEmails,
  endOfDayReport,
  genderReport,
  personalReport,
  personalReportHistory,
  getpersonById,
  exportAttendanceHtml,
  findFrequentAbsentees,
  absenteesOrPresentPeople,
  markthoseWhoStayed,
  undoStayed,
  thoseWhoStayed,
  checkSessions,
  resetAdminPasswordStatus,
  generateOrgCode,
  findOrgCode,
  generateQrCode,
  AdminGetSubmittedPersons,
  adminDismiss,
  // cleanupTodayDuplicates,
} = require("./admin_user/controller");
const {
  CheckroleonAll,
  checkroleonAll,
  OnlyManager,
} = require("../../middlewares/role");
const authmiddleware = require("../../middlewares/auth");
const checkAccountStatus = require("../../middlewares/deletedAcounts");

const router = express.Router();

router.post("/guest/login", LoginUser);
router.post("/forget-password", passLink);
router.post("/verify-token", VerifyToken);
router.post("/verify-otp", verifyVerificationToken);
router.post("/reset-password", resetPassword);
router.get("/fix-my-db-booleans", temp);

// router.use(checkAccountStatus);

router.post("/guest/register", registerNewUser);

router.delete("/admin/deleteAll", authmiddleware, CheckroleonAll, deleteall);

// route to verify staff account
router.get(
  "/admin/verify/:id",
  authmiddleware,
  CheckroleonAll,
  verif_staff_account,
);

router.get(
  "/admin/generate-code",
  authmiddleware,
  CheckroleonAll,
  generateOrgCode,
);

router.post(
  "/admin/generate-qr",
  authmiddleware,
  CheckroleonAll,
  generateQrCode,
);

router.get(
  "/admin/get-pending-approval",
  authmiddleware,
  CheckroleonAll,
  AdminGetSubmittedPersons,
);

router.get("/admin/dismiss/:id", authmiddleware, CheckroleonAll, adminDismiss);

router.get(
  "/admin/get-existing-code",
  authmiddleware,
  CheckroleonAll,
  findOrgCode,
);

// route to unblock staff account
router.get(
  "/admin/unblock/:id",
  authmiddleware,
  CheckroleonAll,
  unblock_staff_account,
);

// route to unblock staff account
router.get(
  "/admin/check-session-status",
  authmiddleware,
  CheckroleonAll,
  checkSessions,
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
router.post("/create-session/", authmiddleware, CheckroleonAll, createSession);

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

// router.get("/run", authmiddleware, cleanupTodayDuplicates);

router.get(
  "/mark-stayed/:id",
  authmiddleware,
  checkroleonAll,
  markthoseWhoStayed,
);
router.get("/stayed-report/", authmiddleware, checkroleonAll, thoseWhoStayed);
// to reverse the mark as present
router.delete(
  "/mark-absent/:nameId/:sessionId/",
  authmiddleware,
  checkroleonAll,
  markAsAbsent,
);

router.delete("/mark-stayed/:id", authmiddleware, checkroleonAll, undoStayed);

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

router.patch(
  "/admin/update/:id/profile/dob",
  authmiddleware,
  CheckroleonAll,
  updateDOBandProfilePicture,
);

router.get(
  "/admin/export-attendance/:sessionId",
  authmiddleware,
  CheckroleonAll,
  sendBirthdayEmails,
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

// change password stats for both admin and staff
router.patch(
  "/admin/change-status/:id",
  authmiddleware,
  CheckroleonAll,
  resetAdminPasswordStatus, // chnages
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

router.get(
  "/export-Attendance-Html",
  authmiddleware,
  CheckroleonAll,
  exportAttendanceHtml,
);

router.get(
  "/frequent-absentees",
  authmiddleware,
  CheckroleonAll,
  findFrequentAbsentees,
);

router.get(
  "/freq-absentees-present/:statusOne/:statusTwo",
  authmiddleware,
  CheckroleonAll,
  absenteesOrPresentPeople,
);
router.get("/gender-report", authmiddleware, CheckroleonAll, genderReport);
router.get("/get-person/:id", authmiddleware, checkroleonAll, getpersonById);

// manager
router.get("/get-all-admins", authmiddleware, OnlyManager, getAdmins);
router.post("/admin/create", authmiddleware, OnlyManager, createAdmin);

module.exports = router;
