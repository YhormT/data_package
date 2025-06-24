const prisma = require("../config/db"); // Import the Prisma client instance
const bcrypt = require("bcrypt");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const { createTransaction } = require("./transactionService");
const { Console } = require("console");

const getAllUsers = async () => {
  return await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};



const getUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

const createUser = async (data) => {
  return await prisma.user.create({ data });
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////// I might use this code later //////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  const createUser = async (data) => {
//     // Hash the password before saving
//     const hashedPassword = await bcrypt.hash(data.password, 10);
//     return await prisma.user.create({
//       data: {
//         ...data,
//         password: hashedPassword, // Store hashed password
//       },
//     });
//   };
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////// I might use this code later //////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};

const updateUser = async (id, data) => {
  return await prisma.user.update({
    // where: { id },
    where: { id: parseInt(id) },
    data,
  });
};


const addLoanToUser = async (userId, amount) => {
  try {
    // Update user's loan balance
    const user = await prisma.user.update({
      where: { id: userId },
      data: { loanBalance: { increment: amount } },
    });
    
    // Record the transaction
    await createTransaction(
      userId,
      amount, // Positive amount for adding to balance 
      "LOAN_ADD",
      `Loan amount ${amount} added to user balance`,
      `user:${userId}`
    );
    
    return user;
  } catch (error) {
    throw new Error("Failed to add loan: " + error.message);
  }
};

const refundUser = async (userId, amount, refundReference) => {
  try {
    // Only update balance via createTransaction (atomic and logs the transaction)
    await createTransaction(
      userId,
      amount, // Positive amount for refund
      "REFUND",
      `Refund amount ${amount} added to user balance`,
      refundReference
    );
    // Fetch and return the updated user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user;
  } catch (error) {
    throw new Error("Failed to refund: " + error.message);
  }
};

const updateLoanStatus = async (userId, hasLoan) => {
  try {
    if (!userId || isNaN(userId)) {
      throw new Error("Invalid userId: userId must be a number.");
    }

    const user = await prisma.user.update({
      where: { id: parseInt(userId, 10) }, // Convert userId to an integer
      data: { hasLoan },
    });

    return user;
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to update loan status: " + error.message);
  }
};



const updateUserLoanStatus = async (userId, hasLoan, deductionAmount) => {
  console.log("Updating user loan status:", { userId, hasLoan, deductionAmount });
  try {
    if (!userId || isNaN(userId)) {
      throw new Error("Invalid userId provided");
    }
    const userIdInt = parseInt(userId, 10);
    // Fetch the user's current loan balance and adminLoanBalance
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: {
        loanBalance: true,
        adminLoanBalance: true
      },
    });
    if (!user) {
      throw new Error("User not found");
    }
    let updatedLoanBalance = user.loanBalance ?? 0;
    let updatedAdminLoanBalance = user.adminLoanBalance ?? 0;
    // If granting loan, set both balances to the current loanBalance or 0
    // If removing loan, set both balances to 0
    if (hasLoan) {
      updatedAdminLoanBalance = updatedLoanBalance;
    } else {
      updatedAdminLoanBalance = 0;
      // Do NOT set updatedLoanBalance to 0; leave it unchanged
    }
    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userIdInt },
        data: {
          hasLoan,
          loanBalance: updatedLoanBalance,
          adminLoanBalance: updatedAdminLoanBalance,
        },
      });
      // Then create the transaction record
      await tx.transaction.create({
        data: {
          userId: userIdInt,
          amount: 0,
          balance: updatedLoanBalance,
          type: "LOAN_STATUS",
          description: hasLoan
            ? `Loan status changed to active with balance ${updatedLoanBalance}`
            : `Loan status changed to inactive and balances reset to 0`,
          reference: `user:${userIdInt}`
        }
      });
      console.log("Database update result:", updatedUser);
      return updatedUser;
    });
  } catch (error) {
    console.error("Error updating loan status:", error.message);
    throw new Error(`Failed to update loan status: ${error.message}`);
  }
};

const updateAdminLoanBalance = async (userId, deductionAmount) => {
  console.log("Updating adminLoanBalance:", { userId, deductionAmount });
  try {
    if (!userId || isNaN(userId)) {
      throw new Error("Invalid userId provided");
    }
    // Fetch the current balance
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: { adminLoanBalance: true },
    });
    if (!user) {
      throw new Error("User not found");
    }
    let updatedAdminLoanBalance = user.adminLoanBalance ?? 0;
    // Deduct the provided amount
    updatedAdminLoanBalance -= deductionAmount;
    // Ensure the balance does not go below zero
    if (updatedAdminLoanBalance < 0) {
      throw new Error("Insufficient balance for this deduction.");
    }
    console.log("New adminLoanBalance after deduction:", updatedAdminLoanBalance);
    // Record the loan deduction transaction
    await createTransaction(
      parseInt(userId, 10),
      -deductionAmount, // Negative amount for deduction
      "LOAN_DEDUCTION",
      `Loan deduction of ${deductionAmount} from admin loan balance`,
      `user:${userId}`
    );
    // Update adminLoanBalance and set hasLoan true if loan > 0
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: {
        adminLoanBalance: updatedAdminLoanBalance,
        hasLoan: updatedAdminLoanBalance > 0, // Automatically set hasLoan true if balance > 0
      },
    });
    console.log("Database update result:", updatedUser);
    return updatedUser;
  } catch (error) {
    console.error("Error updating adminLoanBalance:", error.message);
    throw new Error(error.message);
  }
};


/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////Not using repayLoan////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

const repayLoan = async (userId, amount) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loanBalance: true }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Calculate new balance after repayment
    const newBalance = user.loanBalance + amount;
    const finalBalance = newBalance >= 0 ? 0 : newBalance;
    const hasLoanAfterRepayment = finalBalance < 0;
    
    // Update user's loan balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        loanBalance: finalBalance,
        hasLoan: hasLoanAfterRepayment,
      },
    });
    
    // Record the loan repayment transaction
    await createTransaction(
      userId,
      amount, // Positive amount for repayment (adding to balance)
      "REFUND",
      `Refund amount of ${amount}, new balance: ${finalBalance}`,
      `user:${userId}`
    );

    return updatedUser;
  } catch (error) {
    throw new Error("Failed to repay loan: " + error.message);
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

// Deprecated: Refund logic is now handled in orderService.js for atomicity and idempotency.
// This function is kept for compatibility or future use, but does nothing.
/*
const refundUser = async (userId, amount, refundReference) => {
  return { userId, amount, message: 'Refund logic moved to orderService.js' };
};
*/

const getUserLoanBalance = async (userId) => {
  try {
      const parsedUserId = parseInt(userId, 10);

      // console.log(parsedUserId)

      if (isNaN(parsedUserId)) {
          throw new Error("Invalid user ID");
      }

      const user = await prisma.user.findUnique({
          where: { id: parsedUserId },
          select: { id: true, name: true, loanBalance: true, hasLoan: true, adminLoanBalance: true },
      });

      // console.log(user)

      if (!user) {
          throw new Error("User not found");
      }

      return user;
  } catch (error) {
      throw new Error("Failed to fetch loan balance: " + error.message);
  }
};

const deleteUser = async (id) => {
  return await prisma.$transaction(async (prisma) => {
    const userId = parseInt(id); // Ensure ID is an integer

    // Delete related order items --- just to remember - By Godfrey
    await prisma.orderItem.deleteMany({
      where: { order: { userId } },
    });

    // Delete related orders --- just to remember - By Godfrey
    await prisma.order.deleteMany({
      where: { userId },
    });

    // Delete related cart items --- just to remember - By Godfrey
    await prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    });

    // Delete the cart --- just to remember - By Godfrey
    await prisma.cart.deleteMany({
      where: { userId },
    });

    // Finally, delete the user --- just to remember - By Godfrey
    return await prisma.user.delete({
      where: { id: userId },
    });
  });
};





const processExcelFile = async (filePath, filename, userId, network) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      throw new Error("Excel file is empty or formatted incorrectly.");
    }

    console.log("Extracted Data from Excel:", sheetData); // Debugging log

    // Standardize column names and convert username to price
    const formattedData = sheetData.map(row => ({
      phone: row.phone?.toString() || row.Phone?.toString(), // Normalize case
      price: String(row.price || row.Price), // Convert to price (assuming price is a number)
      itemDescription: row.itemDescription.toString() || row["Item Description"].toString(), // Handle spaces
    }));

    // Filter out invalid rows
    const validData = formattedData.filter(row =>
      row.phone && row.price && row.itemDescription
    );

    if (!validData.length) {
      console.log("No valid purchases found in the uploaded file.");
      return { message: "No valid purchases found." };
    }

    // Create a new Upload record linked to the user
    const uploadedFile = await prisma.upload.create({
      data: { 
        filename, 
        filePath, 
        userId: parseInt(userId, 10) // Link the file to the user
      },
    });

    // Insert valid purchases
    const purchaseData = validData.map(row => ({
      phone: row.phone,
      price: row.price,
      itemDescription: row.itemDescription,
      network: network, // Save the selected network
      uploadedFileId: uploadedFile.id,
    }));

    await prisma.purchase.createMany({ data: purchaseData });

    console.log("Inserted Purchases:", purchaseData);

    return { message: "File processed successfully", uploadedFile };
  } catch (error) {
    console.error("Error processing Excel file:", error);
    throw error;
  } finally {
    // fs.unlinkSync(filePath); // Uncomment if you want to delete the file after processing
  }
};




const getLatestFileData = async () => {
  const latestFile = await prisma.upload.findFirst({
    orderBy: { uploadedAt: "desc" },
  });

  if (!latestFile) throw new Error("No uploaded files found");

  const purchases = await prisma.purchase.findMany({
    where: { uploadedFileId: latestFile.id },
  });

  if (purchases.length === 0) throw new Error("No purchases found for this file");

  return { latestFile, purchases };
};


const getFilePathById = async (fileId) => {
  try {
    const file = await prisma.upload.findUnique({
      where: { id: Number(fileId) },
    });

    if (!file) {
      throw new Error("File not found");
    }

    return {
      filePath: path.resolve(file.filePath),
      filename: file.filename,
    };
  } catch (error) {
    console.error("Error fetching file:", error);
    throw error;
  }
};




// 🛠 Generate & Download Excel File
const generateExcelFile = async (purchases) => {
  const data = purchases.map((p) => ({
    Username: p.username,
    Phone: p.phone,
    "Item Description": p.itemDescription,
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Purchases");

  const filePath = path.join(__dirname, "../uploads", `latest_purchases.xlsx`);
  xlsx.writeFile(workbook, filePath);

  return filePath;
};


const updatePassword = async (userId, newPassword) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: newPassword },
    });
    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update password for user ${userId}: ${error.message}`);
  }
}




module.exports = {

  getAllUsers,
  getUserByEmail,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  addLoanToUser,
  repayLoan,
  getUserLoanBalance,
  processExcelFile,
  generateExcelFile,
  getLatestFileData,

  getFilePathById,
  updatePassword,
  updateLoanStatus,
  updateUserLoanStatus,

  updateAdminLoanBalance,

  refundUser
};
