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

    // Start a transaction with extended timeout to ensure all operations complete or none do
    await prisma.$transaction(async (tx) => {
      console.log('Starting database reset transaction...');
      
      // Delete in order to respect foreign key constraints
      
      // 1. Delete order items first (references orders)
      console.log('Deleting order items...');
      const deletedOrderItems = await tx.orderItem.deleteMany({});
      console.log(`Deleted ${deletedOrderItems.count} order items`);
      
      // 2. Delete orders (references users)
      console.log('Deleting orders...');
      const deletedOrders = await tx.order.deleteMany({});
      console.log(`Deleted ${deletedOrders.count} orders`);
      
      // 3. Delete cart items (references cart and products)
      console.log('Deleting cart items...');
      const deletedCartItems = await tx.cartItem.deleteMany({});
      console.log(`Deleted ${deletedCartItems.count} cart items`);
      
      // 4. Delete carts (references users)
      console.log('Deleting carts...');
      const deletedCarts = await tx.cart.deleteMany({});
      console.log(`Deleted ${deletedCarts.count} carts`);
      
      // 5. Delete transactions (references users)
      console.log('Deleting transactions...');
      const deletedTransactions = await tx.transaction.deleteMany({});
      console.log(`Deleted ${deletedTransactions.count} transactions`);
      
      // 6. Delete top-ups (references users)
      console.log('Deleting top-ups...');
      const deletedTopUps = await tx.topUp.deleteMany({});
      console.log(`Deleted ${deletedTopUps.count} top-ups`);
      
      // 7. Delete uploads (references users)
      console.log('Deleting uploads...');
      const deletedUploads = await tx.upload.deleteMany({});
      console.log(`Deleted ${deletedUploads.count} uploads`);
      
      // 8. Delete announcements
      console.log('Deleting announcements...');
      const deletedAnnouncements = await tx.announcement.deleteMany({});
      console.log(`Deleted ${deletedAnnouncements.count} announcements`);
      
      // 9. Delete SMS messages
      console.log('Deleting SMS messages...');
      const deletedSmsMessages = await tx.SmsMessage.deleteMany({});
      console.log(`Deleted ${deletedSmsMessages.count} SMS messages`);
      
      console.log('Database reset transaction completed successfully');
      
      // 10. Keep user table completely untouched - no updates to user data
    }, {
      timeout: 30000, // Increase timeout to 30 seconds
      maxWait: 35000, // Maximum time to wait for a transaction slot
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
