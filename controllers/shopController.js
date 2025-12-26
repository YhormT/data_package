const shopService = require("../services/shopService");
const productService = require("../services/productService");

// Get products available in shop
const getShopProducts = async (req, res) => {
  try {
    const products = await productService.getShopProducts();
    res.json(products);
  } catch (error) {
    console.error("Error fetching shop products:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create a shop order (for guest users)
const createShopOrder = async (req, res) => {
  try {
    const { productId, mobileNumber, customerName } = req.body;
    
    if (!productId || !mobileNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID and mobile number are required" 
      });
    }
    
    const order = await shopService.createShopOrder(
      parseInt(productId),
      mobileNumber,
      customerName || "Shop Customer"
    );
    
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: {
        id: order.id,
        mobileNumber: order.mobileNumber,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          productName: item.product.name,
          productDescription: item.product.description,
          price: item.product.price,
          status: item.status
        }))
      }
    });
  } catch (error) {
    console.error("Error creating shop order:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Track orders by mobile number
const trackOrders = async (req, res) => {
  try {
    const { mobileNumber } = req.query;
    
    if (!mobileNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Mobile number is required" 
      });
    }
    
    const orders = await shopService.trackOrdersByMobile(mobileNumber);
    
    // Transform orders for frontend
    const transformedOrders = orders.map(order => ({
      orderId: order.id,
      mobileNumber: order.mobileNumber,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product.name,
        productDescription: item.product.description,
        price: item.product.price,
        status: item.status,
        mobileNumber: item.mobileNumber
      }))
    }));
    
    res.json({
      success: true,
      orders: transformedOrders
    });
  } catch (error) {
    console.error("Error tracking orders:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = {
  getShopProducts,
  createShopOrder,
  trackOrders
};
