const express = require("express");
const multer = require("multer");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  addLoan,
  repayLoan,
  getLoanBalance,
  downloadExcel,
  uploadExcel,
  downloadLatestExcel,
  updateUserPassword,
  updateLoanStatus,
  updateAdminLoanBalance,
  updateAdminLoanBalanceController,
  refundUser
} = require("../controllers/userController");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname),
});
// const upload = multer({ storage });

router.get("/", getAllUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

router.post("/loan/add", addLoan);
router.post("/refund", refundUser);

// router.post("/loan/repay", repayLoan);
router.post("/loan/repay", refundUser);

router.get("/loan/:userId", getLoanBalance);

router.put("/loan/status", updateLoanStatus);


router.put("/updateLoan/loanAmount", updateAdminLoanBalance);


router.put("/update-admin/loan-balance", updateAdminLoanBalanceController);



// 📥 Upload Excel
// router.post("/upload", upload.single("file"), uploadExcel);

// 📥 Download Latest Excel File
// router.get("/download-latest", downloadLatestExcel);
// router.get("/download/:fileId", downloadExcel)

router.post("/upload-excel", upload.single("file"), uploadExcel);
router.post("/download/:filename", downloadExcel);

router.put('/:userId/updatePassword', updateUserPassword)

// router.get("/profile", getUserProfile);

module.exports = router;
