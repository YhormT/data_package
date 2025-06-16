// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

const prisma = require("../config/db");

const { createTransaction } = require("./transactionService");

// const submitCart = async (userId, mobileNumber = null) => {
//   const cart = await prisma.cart.findUnique({
//     where: { userId },
//     include: {
//       items: { include: { product: true } },
//     },
//   });

//   if (!cart || cart.items.length === 0) {
//     throw new Error("Cart is empty");
//   }

//   if (mobileNumber && !cart.mobileNumber) {
//     await prisma.cart.update({
//       where: { id: cart.id },
//       data: { mobileNumber },
//     });
//   }

//   const order = await prisma.order.create({
//     data: {
//       userId,
//       items: {
//         create: cart.items.map((item) => ({
//           productId: item.productId,
//           quantity: item.quantity,
//           mobileNumber: item.mobileNumber,
//           status: "Pending",
//         })),
//       },
//     },
//     include: { items: { include: { product: true } } },
//   });

//   await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

//   return order;
// };

// const submitCart = async (userId, mobileNumber = null) => {
//   const cart = await prisma.cart.findUnique({
//     where: { userId },
//     include: {
//       items: { include: { product: true } },
//     },
//   });

//   if (!cart || cart.items.length === 0) {
//     throw new Error("Cart is empty");
//   }

  
//   const totalPrice = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);


//   if (mobileNumber && !cart.mobileNumber) {
//     await prisma.cart.update({
//       where: { id: cart.id },
//       data: { mobileNumber },
//     });
//   }

//   // Create order
//   const order = await prisma.order.create({
//     data: {
//       userId,
//       mobileNumber: cart.mobileNumber || mobileNumber,
//       items: {
//         create: cart.items.map((item) => ({
//           productId: item.productId,
//           quantity: item.quantity,
//           mobileNumber: item.mobileNumber,
//           status: "Pending",
//         })),
//       },
//     },
//     include: { items: { include: { product: true } } },
//   });

//   // Deduct amount from user's loanBalance
//   const user = await prisma.user.findUnique({ where: { id: userId } });

//   if (!user) {
//     throw new Error("User not found");
//   }

//   const updatedLoanBalance = user.loanBalance - totalPrice;

//   await prisma.user.update({
//     where: { id: userId },
//     data: { loanBalance: updatedLoanBalance },
//   });

//   // Clear cart
//   await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

//   return order;
// };

const submitCart = async (userId, mobileNumber = null) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  // Calculate total order price
  const totalPrice = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Get user current balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.loanBalance < totalPrice) {
    throw new Error("Insufficient balance to place order");
  }

  // Set mobile number if provided
  if (mobileNumber && !cart.mobileNumber) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { mobileNumber },
    });
  }

  // Create order
  const order = await prisma.order.create({
    data: {
      userId,
      mobileNumber: cart.mobileNumber || mobileNumber,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          mobileNumber: item.mobileNumber,
          status: "Pending",
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  // Deduct amount from user's loanBalance
  // const updatedLoanBalance = user.loanBalance - totalPrice;
  // await prisma.user.update({
  //   where: { id: userId },
  //   data: { loanBalance: updatedLoanBalance },
  // });

  // Record transaction for the order
  await createTransaction(
    userId,
    -totalPrice, // Negative amount for deduction
    "ORDER",
    `Order #${order.id} placed with ${order.items.length} items`,
    `order:${order.id}`
  );

  // Clear cart (we already have the items in the order)
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return order;
};

async function getAllOrders() {
  return await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        // Include user details --- just to remember - Godfrey
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            // Include product details --- just to remember - Godfrey
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
            },
          },
        },
      },
    },
  });
}

// Admin: Process and complete an order
const processOrder = async (orderId, status) => {
  const validStatuses = ["Pending", "Processing", "Completed"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid order status");
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      user: true,
      items: { include: { product: true } }
    }
  });

  // Record transaction for status change
  await createTransaction(
    order.userId,
    0, // Zero amount for status change
    "ORDER_STATUS",
    `Order #${orderId} status changed to ${status}`,
    `order:${orderId}`
  );

  return order;
};



const processOrderItem = async (orderItemId, status) => {
  const validStatuses = ["Pending", "Processing", "Completed", "Cancelled"];

  if (!validStatuses.includes(status)) {
    throw new Error("Invalid order status");
  }

  if (!orderItemId) {
    throw new Error("Order item ID is required");
  }

  const orderItem = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { status },
    include: {
      order: true,
      product: true
    }
  });

  // Record transaction for item status change
  await createTransaction(
    orderItem.order.userId,
    0, // Zero amount for status change
    "ORDER_ITEM_STATUS",
    `Order item #${orderItemId} (${orderItem.product.name}) status changed to ${status}`,
    `orderItem:${orderItemId}`
  );

  return orderItem;
};

// User: Get all completed orders
async function getUserCompletedOrders(userId) {
  return await prisma.order.findMany({
    where: { userId, status: "Completed" },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
            },
          },
        },
      },
    },
  });
}

const getOrderStatus = async () => {
  return await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

const getOrderHistory = async (userId) => {
  return await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};


const updateOrderItemsStatus = async (orderId, newStatus) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      select: { userId: true }
    });
    
    if (!order) {
      throw new Error("Order not found");
    }
    
    const updatedItems = await prisma.orderItem.updateMany({
      where: {
        orderId: parseInt(orderId)
      },
      data: {
        status: newStatus
      }
    });
    
    // Record transaction for bulk status change
    await createTransaction(
      order.userId,
      0, // Zero amount for status change
      "ORDER_ITEMS_STATUS",
      `All items in order #${orderId} status changed to ${newStatus}`,
      `order:${orderId}`
    );
    
    return {
      success: true,
      updatedCount: updatedItems.count,
      message: `Successfully updated ${updatedItems.count} order items to ${newStatus}`
    };
  } catch (error) {
    console.error("Error updating order items status:", error);
    throw new Error("Failed to update order items status");
  }
};





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Exporting functions for use in controllers
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const orderService = {
  async getOrdersPaginated({ page = 1, limit = 20, filters = {} }) {
    const { startDate, endDate, status, product, mobileNumber } = filters;
    
    // Build where clause
    const where = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (status) {
      where.items = {
        some: {
          status,
        },
      };
    }
    
    if (product) {
      where.items = {
        ...(where.items || {}),
        some: {
          ...(where.items?.some || {}),
          product: {
            name: product,
          },
        },
      };
    }
    
    if (mobileNumber) {
      where.mobileNumber = {
        contains: mobileNumber,
      };
    }
    
    // Calculate pagination parameters
    const skip = (page - 1) * parseInt(limit);
    
    // Get count for pagination info
    const totalOrders = await prisma.order.count({ where });
    
    // Get paginated orders
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
              },
            },
          },
        },
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            phone: true 
          },
        },
      },
    });
    
    // Transform data for frontend efficiency
    // This eliminates the need for frontend data processing
    const transformedItems = orders.flatMap(order => 
      order.items.map(item => ({
        id: item.id,
        orderId: order.id,
        mobileNumber: order.mobileNumber,
        user: order.user,
        createdAt: order.createdAt,
        product: item.product,
        status: item.status,
        order: {
          id: order.id,
          createdAt: order.createdAt,
          items: [{ status: item.status }] // Only include what's needed
        }
      }))
    );
    
    return {
      items: transformedItems,
      pagination: {
        total: totalOrders,
        pages: Math.ceil(totalOrders / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    };
  },
  
  async getOrderStats() {
    // Get just the counts for dashboard stats
    const totalOrders = await prisma.order.count();
    
    const pendingCount = await prisma.order.count({
      where: {
        items: {
          some: {
            status: 'Pending'
          }
        }
      }
    });
    
    const completedCount = await prisma.order.count({
      where: {
        items: {
          some: {
            status: 'Completed'
          }
        }
      }
    });
    
    const processingCount = await prisma.order.count({
      where: {
        items: {
          some: {
            status: 'Processing'
          }
        }
      }
    });
    
    return {
      total: totalOrders,
      pending: pendingCount,
      completed: completedCount,
      processing: processingCount
    };
  },
  
  async updateOrderStatus(orderId, status) {
    return await prisma.order.update({
      where: { id: orderId },
      data: {
        items: {
          updateMany: {
            where: {},
            data: { status }
          }
        }
      }
    });
  }
};

module.exports = {
  submitCart,
  getAllOrders,
  processOrder,
  getUserCompletedOrders,
  processOrderItem,
  getOrderStatus,
  getOrderHistory,
  updateOrderItemsStatus,

  orderService
};
