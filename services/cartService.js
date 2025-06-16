const prisma = require('../config/db');
const { createTransaction } = require('./transactionService');


const addItemToCart = async (userId, productId, quantity, mobileNumber = null) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");
  
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }
  
  // Calculate total price for this cart item
  const totalPrice = product.price * quantity;
  
  // Create cart item
  const cartItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      quantity,
      price: totalPrice,
      mobileNumber,
    },
  });
  
  // Record transaction - negative amount means deduction from balance
  // await createTransaction(
  //   userId,
  //   -totalPrice, // Negative amount for deduction (reservation)
  //   "CART_ADD",
  //   `Added ${quantity} x ${product.name} to cart`,
  //   `cartItem:${cartItem.id}`
  // );
  
  return cartItem;
};

// const addItemToCart = async (userId, productId, quantity, mobileNumber = null) => { 
//   const product = await prisma.product.findUnique({ where: { id: productId } });
//   if (!product) throw new Error("Product not found");


//   let cart = await prisma.cart.findUnique({ where: { userId } });
//   if (!cart) {
//     cart = await prisma.cart.create({ 
//       data: { userId },
//     });
//   }

//   return await prisma.cartItem.create({
//     data: {
//       cartId: cart.id,
//       productId,
//       quantity,
//       price: product.price * quantity,
//       mobileNumber,
//     },
//   });
// };


const getUserCart = async (userId) => {
  return await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
};


// const removeItemFromCart = async (cartItemId) => {
//   return await prisma.cartItem.delete({ where: { id: cartItemId } });
// };

const removeItemFromCart = async (cartItemId) => {
  // Get cart item details before deletion
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: {
      cart: true,
      product: true
    }
  });
  
  if (!cartItem) throw new Error("Cart item not found");
  
  // Delete the cart item
  const deletedItem = await prisma.cartItem.delete({ where: { id: cartItemId } });
  
  // Record transaction - positive amount means adding back to balance
  // await createTransaction(
  //   cartItem.cart.userId,
  //   cartItem.price, // Positive amount to add back to balance
  //   "CART_REMOVE",
  //   `Removed ${cartItem.quantity} x ${cartItem.product.name} from cart`,
  //   `cartItem:${cartItemId}`
  // );
  
  return deletedItem;
};


const getAllCarts = async () => {
  return await prisma.cart.findMany({
    include: {
      user: true,
      items: true,
    },
  });
};

module.exports = { addItemToCart, getUserCart, removeItemFromCart, getAllCarts };
