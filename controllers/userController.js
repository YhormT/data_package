const userService = require("../services/userService");
const path = require("path");
const fs = require("fs");
const prisma = require("../config/db");

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const newUser = await userService.createUser({
      name,
      email,
      password,
      role,
      isLoggedIn: false, // Default to true for new users
      phone,
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    // const updatedUser = await userService.updateUser(id, updatedData);
    const updatedUser = await userService.updateUser(parseInt(id), updatedData);
    return res.status(200).json({
      success: true,
      message: "User updated successfully!",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the user!",
    });
  }
};



// Admin adds loan to user  -- Godfrey
const addLoan = async (req, res) => {
  const { userId, amount, hasLoan } = req.body; // Accept hasLoan manually
  try {
    const user = await userService.addLoanToUser(userId, amount, hasLoan);
    res.json({ message: "Loan added successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// const addLoan = async (req, res) => {
//   const { userId, amount } = req.body;
//   try {
//       const user = await userService.addLoanToUser(userId, amount);
//       res.json({ message: "Loan added successfully", user });
//   } catch (error) {
//       res.status(500).json({ error: error.message });
//   }
// };

// const updateLoanStatus = async (req, res) => {
//   const { userId, hasLoan } = req.body;
//   try {
//     const user = await userService.updateLoanStatus(userId, hasLoan);
//     res.json({ message: "Loan status updated successfully", user });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

const updateLoanStatus = async (req, res) => {
  const { userId, hasLoan } = req.body;

  console.log("Received userId:", userId, "Type:", typeof userId); // Debugging log

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID: userId must be a number." });
  }

  try {
    const user = await userService.updateLoanStatus(parseInt(userId, 10), hasLoan);
    res.json({ message: "Loan status updated successfully", user });
  } catch (error) {
    console.error("Error updating loan status:", error);
    res.status(500).json({ error: error.message });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////Not using repayLoan////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
// 💳 User repays loan -- Godfrey
const repayLoan = async (req, res) => {
  const { userId, amount } = req.body;
  try {
      const user = await userService.repayLoan(userId, amount);
      res.json({ message: "Loan repaid successfully", user });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////Not using repayLoan////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////


const refundUser = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const updatedUser = await userService.refundUser(userId, amount);

    res.json({
      message: "User refunded successfully",
      data: {
        userId: updatedUser.id,
        newBalance: updatedUser.loanBalance,
        totalRefunded: updatedUser.refundedTotal,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 🔍 Get Loan Balance -- Godfrey
const getLoanBalance = async (req, res) => {
  const { userId } = req.params;
  try {
      const user = await userService.getUserLoanBalance(userId);
      res.json(user);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};




const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    if (error.code === "P2003") {
      return res
        .status(400)
        .json({
          error: "Cannot delete user with active orders or cart items.",
        });
    }
    res.status(500).json({ error: error.message });
  }
};

const selectPackage = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    const dataPackage = await prisma.dataPackage.findUnique({
      where: { id: packageId },
    });

    if (!dataPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { selectedPackageId: packageId },
    });

    res.status(200).json({ message: "Package selected", dataPackage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// const uploadExcel = async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     const result = await userService.processExcelFile(req.file.path, req.file.filename);
//     res.json(result);
//   } catch (error) {
//     console.error("Upload Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log("File uploaded:", req.file.path);

    const result = await userService.processExcelFile(
      req.file.path,
      req.file.filename,
      userId // Pass userId from req.body
    );

    res.json(result);
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
};


// 📥 Download the Latest Processed Excel File
const downloadLatestExcel = async (req, res) => {
  try {
    const { latestFile, purchases } = await userService.getLatestFileData();
    const filePath = await userService.generateExcelFile(purchases);

    res.download(filePath, "purchases.xlsx", (err) => {
      if (err) {
        console.error("Download Error:", err);
        res.status(500).json({ error: "Error downloading file" });
      }

      // 🛠 Cleanup: Delete file after sending
      setTimeout(() => {
        fs.unlinkSync(filePath);
      }, 5000);
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: error.message });
  }
};


// const downloadExcel = async (req, res) => {
//   try {
//     const { filename } = req.params;
//     const filePath = path.join(__dirname, "../uploads", filename);

//     console.log("Attempting to download:", filePath);

//     if (!fs.existsSync(filePath)) {
//       console.error("File not found:", filePath);
//       return res.status(404).json({ error: "File not found" });
//     }

//     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

//     res.download(filePath, filename, (err) => {
//       if (err) {
//         console.error("Download Error:", err);
//         res.status(500).json({ error: "Failed to download file" });
//       } else {
//         console.log("File successfully downloaded:", filename);
//       }
//     });
//   } catch (error) {
//     console.error("Download Error:", error);
//     res.status(500).json({ error: "Failed to download file" });
//   }
// };


const downloadExcel = async (req, res) => {
  try {
    const { filename } = req.params;
    const { userId } = req.body; // Get userId from request body

    console.log({filename, userId})

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch file details from the database using findFirst
    const file = await prisma.upload.findFirst({
      where: { filename, userId },
    });

    console.log({file})

    if (!file) {
      return res.status(404).json({ error: "File not found or unauthorized" });
    }

    const filePath = path.join(__dirname, "../uploads", filename);

    console.log("Attempting to download:", filePath);

    if (!fs.existsSync(filePath)) {
      console.error("File not found on server:", filePath);
      return res.status(404).json({ error: "File not found on server" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Download Error:", err);
        res.status(500).json({ error: "Failed to download file" });
      } else {
        console.log("File successfully downloaded:", filename);
      }
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
};



const updateUserPassword = async (req, res) => {
  const { userId } = req.params; // Assuming userId is passed in the URL params
  const { newPassword } = req.body;

  try {
    const updatedUser = await userService.updatePassword(parseInt(userId), newPassword);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}



const updateAdminLoanBalance = async (req, res) => {
  try {
    const { userId, hasLoan, adminLoanBalance } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const updatedUser = await userService.updateUserLoanStatus(userId, hasLoan, adminLoanBalance);

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const updateAdminLoanBalanceController = async (req, res) => {
  try {
    const { userId, newBalance } = req.body;

    if (!userId || newBalance === undefined) {
      return res.status(400).json({ error: "userId and newBalance are required" });
    }

    const updatedUser = await userService.updateAdminLoanBalance(userId, newBalance);

    res.status(200).json({
      message: "adminLoanBalance updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = {
  getAllUsers,
  createUser,
  selectPackage,
  updateUser,
  deleteUser,
  addLoan,
  repayLoan,
  getLoanBalance,
  uploadExcel,
  // downloadExcel,
  downloadLatestExcel,

  downloadExcel,
  updateUserPassword,
  updateLoanStatus,
  updateAdminLoanBalance,
  updateAdminLoanBalanceController,
  refundUser
};
