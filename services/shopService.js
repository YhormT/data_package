const prisma = require("../config/db");

// Get or create the "shop" user for guest orders
const getOrCreateShopUser = async () => {
  const shopEmail = "shop@kelishub.com";
  
  let shopUser = await prisma.user.findUnique({
    where: { email: shopEmail }
  });
  
  if (!shopUser) {
    // Create the shop user if it doesn't exist
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("shop_user_password_secure_123", 10);
    
    shopUser = await prisma.user.create({
      data: {
        name: "Shop",
        email: shopEmail,
        password: hashedPassword,
        role: "SHOP",
        loanBalance: 999999999, // High balance for shop orders
        hasLoan: false
      }
    });
  }
  
  return shopUser;
};

// Create a shop order (for guest users)
const createShopOrder = async (productId, mobileNumber, customerName) => {
  // Get the shop user
  const shopUser = await getOrCreateShopUser();
  
  // Get the product
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  if (!product) {
    throw new Error("Product not found");
  }
  
  if (!product.showInShop) {
    throw new Error("Product is not available in shop");
  }
  
  if (product.stock <= 0) {
    throw new Error("Product is out of stock");
  }
  
  // Create the order
  const order = await prisma.order.create({
    data: {
      userId: shopUser.id,
      mobileNumber: mobileNumber,
      status: "Pending",
      items: {
        create: [{
          productId: productId,
          quantity: 1,
          mobileNumber: mobileNumber,
          status: "Pending"
        }]
      }
    },
    include: {
      items: {
        include: { product: true }
      },
      user: true
    }
  });
  
  return order;
};

// Track orders by mobile number
const trackOrdersByMobile = async (mobileNumber) => {
  // Normalize mobile number - remove leading 0 if present for comparison
  const normalizedNumber = mobileNumber.startsWith('0') ? mobileNumber.substring(1) : mobileNumber;
  
  // Calculate 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Search Order table only (same as Total Request modal on admin dashboard)
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { mobileNumber: { contains: mobileNumber } },
        { mobileNumber: { contains: normalizedNumber } },
        {
          items: {
            some: {
              OR: [
                { mobileNumber: { contains: mobileNumber } },
                { mobileNumber: { contains: normalizedNumber } }
              ]
            }
          }
        }
      ],
      createdAt: {
        gte: sevenDaysAgo
      }
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });
  
  return orders;
};

module.exports = {
  getOrCreateShopUser,
  createShopOrder,
  trackOrdersByMobile
};
