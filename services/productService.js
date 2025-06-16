const prisma = require("../config/db");

const addProduct = async (name, description, price, stock) => {
  return await prisma.product.create({
    data: { name, description, price, stock },
  });
};

const getAllProducts = async () => {
  return await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getProductById = async (id) => {
  return await prisma.product.findUnique({ where: { id } });
};

const updateProduct = async (id, data) => {
  return await prisma.product.update({ where: { id }, data });
};


const setProductStockToZero = async (id) => {
  return await prisma.product.update({
    where: { id },
    data: { stock: 0 },
  });
};

const setAllProductStockToZero = async (stockValue) => {
  return await prisma.product.updateMany({
    data: { stock: stockValue },
  });
};



// const deleteProduct = async (id) => {
//   return await prisma.product.delete({ where: { id } });
// };

const deleteProduct = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // Delete related cart items
    await tx.cartItem.deleteMany({
      where: { productId: id }
    });
    
    // Delete related order items
    await tx.orderItem.deleteMany({
      where: { productId: id }
    });
    
    // Delete the product
    return await tx.product.delete({
      where: { id }
    });
  });
};


module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  setProductStockToZero,
  setAllProductStockToZero
};
