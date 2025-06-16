// const { PrismaClient } = require('@prisma/client');
const { createTransaction } = require('./transactionService');
const smsService = require('./smsService');
// const prisma = new PrismaClient();

const prisma = require("../config/db");


// Add this new function to your existing topUpService.js
// const verifyAndAutoTopUp = async (userId, referenceId) => {
//   try {
//     // Find SMS message with this reference
//     const smsMessage = await smsService.findSmsByReference(referenceId);
    
//     if (!smsMessage) {
//       throw new Error('Invalid or already used reference number');
//     }
    
//     if (!smsMessage.amount) {
//       throw new Error('Amount not found in SMS. Please contact support.');
//     }
    
//     // Check if reference already exists in TopUp table
//     const existingTopUp = await prisma.topUp.findUnique({
//       where: { referenceId },
//     });
    
//     if (existingTopUp) {
//       throw new Error(`Reference ID ${referenceId} already exists.`);
//     }
    
//     // Check if user exists
//     const user = await prisma.user.findUnique({
//       where: { id: parseInt(userId) },
//       select: { id: true, name: true, loanBalance: true }
//     });
    
//     if (!user) {
//       throw new Error('User not found');
//     }
    
//     // Process the auto top-up in a transaction
//     const result = await prisma.$transaction(async (tx) => {
//       // Create TopUp record with Approved status (auto-approved)
//       const topUp = await tx.topUp.create({
//         data: {
//           userId: parseInt(userId),
//           referenceId: referenceId,
//           amount: smsMessage.amount,
//           status: 'Approved', // Auto-approved via SMS
//           submittedBy: 'AUTO_SMS_VERIFICATION'
//         }
//       });
      
//       // Update user balance
//       const updatedUser = await tx.user.update({
//         where: { id: parseInt(userId) },
//         data: {
//           loanBalance: {
//             increment: smsMessage.amount
//           }
//         }
//       });
      
//       // Create transaction record for the approved top-up
//       await tx.transaction.create({
//         data: {
//           userId: parseInt(userId),
//           amount: smsMessage.amount,
//           balance: updatedUser.loanBalance,
//           type: 'TOPUP_APPROVED',
//           description: `Auto top-up via SMS verification - Ref: ${referenceId} for GHS ${smsMessage.amount}`,
//           reference: `topup:${topUp.id}`
//         }
//       });
      
//       return { topUp, updatedUser };
//     });
    
//     // Mark SMS as processed
//     await smsService.markSmsAsProcessed(smsMessage.id);
    
//     return {
//       success: true,
//       amount: smsMessage.amount,
//       newBalance: result.updatedUser.loanBalance,
//       reference: referenceId,
//       topUpId: result.topUp.id,
//       message: 'Top-up successful!'
//     };
    
//   } catch (error) {
//     console.error("Error in auto top-up:", error);
//     throw new Error(error.message);
//   }
// };

const verifyAndAutoTopUp = async (userId, referenceId) => {
  try {
    // Find SMS message with this reference
    const smsMessage = await smsService.findSmsByReference(referenceId);
    
    if (!smsMessage) {
      throw new Error('Invalid or already used reference number');
    }
    
    if (!smsMessage.amount) {
      throw new Error('Amount not found in SMS. Please contact support.');
    }
    
    // Check if reference already exists in TopUp table
    const existingTopUp = await prisma.topUp.findUnique({
      where: { referenceId },
    });
    
    if (existingTopUp) {
      throw new Error(`Reference ID ${referenceId} already exists.`);
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, name: true, loanBalance: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Process the auto top-up in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create TopUp record with Approved status (auto-approved)
      const topUp = await tx.topUp.create({
        data: {
          userId: parseInt(userId),
          referenceId: referenceId,
          amount: smsMessage.amount,
          status: 'Approved', // Auto-approved via SMS
          submittedBy: 'AUTO_SMS_VERIFICATION'
        }
      });
      
      // ✅ REMOVED MANUAL BALANCE UPDATE - Let createTransaction handle it
      // Instead, just get the final balance after createTransaction
      
      return { topUp };
    });
    
    // ✅ Use createTransaction to handle balance update AND transaction record
    const transaction = await createTransaction(
      parseInt(userId),
      smsMessage.amount, // Positive amount for balance increase
      'TOPUP_APPROVED',
      `Auto top-up via SMS verification - Ref: ${referenceId} for GHS ${smsMessage.amount}`,
      `topup:${result.topUp.id}`
    );
    
    // Mark SMS as processed
    await smsService.markSmsAsProcessed(smsMessage.id);
    
    return {
      success: true,
      amount: smsMessage.amount,
      newBalance: transaction.balance, // Get balance from transaction result
      reference: referenceId,
      topUpId: result.topUp.id,
      message: 'Top-up successful!'
    };
    
  } catch (error) {
    console.error("Error in auto top-up:", error);
    throw new Error(error.message);
  }
};


const createTopUp = async (userId, referenceId, amount, submittedBy) => {
  try {
    // First check if reference ID exists
    const existingTopUp = await prisma.topUp.findUnique({
      where: { referenceId },
    });
    
    if (existingTopUp) {
      throw new Error(`Reference ID ${referenceId} already exists.`);
    }
    
    // Wrap both operations in a transaction to ensure atomicity
    return await prisma.$transaction(async (prismaTransaction) => {
      // Create the top-up record
      const newTopUp = await prismaTransaction.topUp.create({
        data: {
          userId,
          referenceId,
          amount,
          submittedBy,
          status: "Pending" // Default status
        }
      });
      
      // Get current user balance
      const user = await prismaTransaction.user.findUnique({
        where: { id: userId },
        select: { loanBalance: true, name: true }
      });
      
      if (!user) {
        throw new Error("User not found");
      }
      
      const currentBalance = user.loanBalance;
      const newBalance = currentBalance; // No balance change yet since it's pending
      
      // Create transaction record using the same prisma transaction
      const transaction = await prismaTransaction.transaction.create({
        data: {
          userId,
          // amount: 0, // No balance change yet since it's pending
          amount: amount, // No balance change yet since it's pending
          balance: newBalance,
          type: "TOPUP_REQUEST",
          // description: `Top-up request created: ${referenceId} for ${amount}`,
          description: `${user.name} with transaction id ${referenceId} has requested a Top-up`,
          reference: `topup:${newTopUp.id}`
        }
      });
      
      return {
        topup: newTopUp,
        transaction: transaction
      };
    });
    
  } catch (error) {
    console.error("Error creating top-up:", error);
    throw new Error(`Could not process top-up request: ${error.message}`);
  }
};
// Approve or reject a top-up
// const updateTopUpStatus = async (topUpId, status) => {
//   try {
//     // Ensure status is either "Approved" or "Rejected"
//     if (!["Approved", "Rejected"].includes(status)) {
//       throw new Error("Invalid status. Must be 'Approved' or 'Rejected'.");
//     }

//     // Get the top-up details
//     const topUp = await prisma.topUp.findUnique({
//       where: { id: topUpId }
//     });

//     if (!topUp) throw new Error("Top-up request not found.");

//     // If approved, update the user's loanBalance
//     if (status === "Approved") {
//       await prisma.user.update({
//         where: { id: topUp.userId },
//         data: {
//           loanBalance: {
//             increment: topUp.amount
//           }
//         }
//       });
//     }

//     // Update the top-up status
//     const updatedTopUp = await prisma.topUp.update({
//       where: { id: topUpId },
//       data: { status }
//     });

//     return updatedTopUp;
//   } catch (error) {
//     console.error("Error updating top-up status:", error);
//     throw new Error("Could not update top-up status.");
//   }
// };

const updateTopUpStatus = async (topUpId, status) => {
  try {
    // Ensure status is either "Approved" or "Rejected"
    if (!["Approved", "Rejected"].includes(status)) {
      throw new Error("Invalid status. Must be 'Approved' or 'Rejected'.");
    }

    // Get the top-up details
    const topUp = await prisma.topUp.findUnique({
      where: { id: topUpId }
    });

    if (!topUp) throw new Error("Top-up request not found.");

    // If approved, update the user's loanBalance
    if (status === "Approved") {
      // await prisma.user.update({
      //   where: { id: topUp.userId },
      //   data: {
      //     loanBalance: {
      //       increment: topUp.amount
      //     }
      //   }
      // });
      
      // Record the successful top-up transaction
      await createTransaction(
        topUp.userId,
        topUp.amount, // Positive amount for balance increase
        "TOPUP_APPROVED",
        `Top-up amount of GHS ${topUp.amount} has been approved successfully with transaction ID ${topUp.referenceId}`,
        `topup:${topUp.id}`
      );
    } else {
      // Record the rejected top-up
      await createTransaction(
        topUp.userId,
        0, // No balance change
        "TOPUP_REJECTED",
        `Top-up amount of GHS ${topUp.amount} has been rejected with transaction ID ${topUp.referenceId}`,
        `topup:${topUp.id}`
      );
    }

    // Update the top-up status
    const updatedTopUp = await prisma.topUp.update({
      where: { id: topUpId },
      data: { status }
    });

    return updatedTopUp;
  } catch (error) {
    console.error("Error updating top-up status:", error);
    throw new Error("Could not update top-up status.");
  }
};

// Get all top-ups with filtering options (e.g., status, date range)
const getTopUps = async (startDate, endDate, status) => {
  try {
    const whereClause = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    };

    if (status) whereClause.status = status; // Filter by status if provided

    const topUps = await prisma.topUp.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    return topUps;
  } catch (error) {
    console.error("Error fetching top-ups:", error);
    throw new Error("Could not retrieve top-up records");
  }
};


const getAllTopUps = async (startDate, endDate) => {
  const whereCondition = {};

  if (startDate && endDate) {
    whereCondition.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  return await prisma.topUp.findMany({
    where: whereCondition, // If empty, fetches all top-ups
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

module.exports = {
  createTopUp,
  updateTopUpStatus,
  getTopUps,
  getAllTopUps,
  verifyAndAutoTopUp
};
