const prisma = require("../config/db");

/**
 * Creates a transaction record
 * @param {Number} userId - User ID
 * @param {Number} amount - Transaction amount (positive for credits, negative for debits)
 * @param {String} type - Transaction type (TOPUP, ORDER, CART_ADD, LOAN_REPAYMENT, LOAN_DEDUCTION)
 * @param {String} description - Transaction description
 * @param {String} reference - Reference ID (optional)
 * @returns {Promise<Object>} Created transaction
 */

const createTransaction = async (userId, amount, type, description, reference = null) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loanBalance: true }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const previousBalance = user.loanBalance; // 👈 STORE PREVIOUS BALANCE
    const newBalance = previousBalance + amount;

    console.log(`Previous Balance: ${previousBalance}, Amount: ${amount}, New Balance: ${newBalance}`);

    // Update user's balance
    await prisma.user.update({
      where: { id: userId },
      data: { loanBalance: newBalance }
    });

    // Create transaction record with previousBalance
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        balance: newBalance,
        previousBalance, // 👈 ADD THIS FIELD
        type,
        description,
        reference
      }
    });

    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error(`Failed to record transaction: ${error.message}`);
  }
};

/**
 * Get user transaction history
 * @param {Number} userId - User ID
 * @param {Date} startDate - Start date filter (optional)
 * @param {Date} endDate - End date filter (optional)
 * @param {String} type - Transaction type filter (optional)
 * @returns {Promise<Array>} Transaction history
 */

const getUserTransactions = async (userId, startDate = null, endDate = null, type = null) => {
  try {
    const whereClause = { userId };
    
    // Add date filters if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    // Add type filter if provided
    if (type) {
      whereClause.type = type;
    }
    
    return await prisma.transaction.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        balance: true,
        previousBalance: true, // 👈 ADD THIS FIELD
        type: true,
        description: true,
        reference: true,
        createdAt: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    throw new Error(`Failed to retrieve transaction history: ${error.message}`);
  }
};


/**
 * Get all transactions
 * @param {Date} startDate - Start date filter (optional)
 * @param {Date} endDate - End date filter (optional)
 * @param {String} type - Transaction type filter (optional)
 * @returns {Promise<Array>} All transactions
 */

const getAllTransactions = async (startDate = null, endDate = null, type = null) => {
  try {
    const whereClause = {};
    
    // Add date filters if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    // Add type filter if provided
    if (type) {
      whereClause.type = type;
    }
    
    return await prisma.transaction.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        balance: true,
        previousBalance: true, // 👈 ADD THIS FIELD
        type: true,
        description: true,
        reference: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    throw new Error(`Failed to retrieve transactions: ${error.message}`);
  }
};

module.exports = {
  getUserTransactions,
  getAllTransactions,
  getAllTransactions
};
