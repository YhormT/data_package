const prisma = require("../config/db");

const resetDatabase = async (req, res) => {
  try {
    // This is a dangerous operation - only allow for admin users
    const adminId = req.body.adminId;
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
    }

    // Verify the user is an admin
    const admin = await prisma.user.findUnique({
      where: { id: parseInt(adminId) }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Only administrators can perform this operation"
      });
    }

    // Start a transaction to ensure all operations complete or none do
    await prisma.$transaction(async (tx) => {
      // Delete in order to respect foreign key constraints
      
      // 1. Delete order items first (references orders)
      await tx.orderItem.deleteMany({});
      
      // 2. Delete orders (references users)
      await tx.order.deleteMany({});
      
      // 3. Delete cart items (references cart and products)
      await tx.cartItem.deleteMany({});
      
      // 4. Delete carts (references users)
      await tx.cart.deleteMany({});
      
      // 5. Delete transactions (references users)
      await tx.transaction.deleteMany({});
      
      // 6. Delete top-ups (references users)
      await tx.topUp.deleteMany({});
      
      // 7. Delete uploads (references users)
      await tx.upload.deleteMany({});
      
      // 8. Delete announcements
      await tx.announcement.deleteMany({});
      
      // 9. Delete SMS messages
      await tx.SmsMessage.deleteMany({});
      
      // 10. Keep user table completely untouched - no updates to user data
    });

    res.status(200).json({
      success: true,
      message: "Database reset completed successfully. Users and products have been preserved, but all other data has been cleared."
    });

  } catch (error) {
    console.error("Database reset error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset database: " + error.message
    });
  }
};

module.exports = {
  resetDatabase
};
