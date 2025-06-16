const {
  submitCart,
  getOrderStatus,
  processOrderItem,
  getAllOrders,
  processOrder,
  getUserCompletedOrders,
  getOrderHistory,
  updateOrderItemsStatus,
  // orderController
} = require("../services/orderService");

const orderService = require('../services/orderService');

exports.submitCart = async (req, res) => {
  try {
    const { userId, mobileNumber } = req.body;

    const order = await submitCart(userId, mobileNumber);

    res.status(201).json({
      success: true,
      message: "Order submitted successfully",
      order,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const orders = await getOrderStatus();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processOrderItem = async (req, res) => {
  const { orderItemId, status } = req.body;
  try {
    const updatedItem = await processOrderItem(orderItemId, status);
    res.json({ message: "Order item status updated", updatedItem });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.processOrderController = async (req, res) => {
  const { status } = req.body;
  try {
    const updatedOrder = await processOrder(
      parseInt(req.params.orderId),
      status
    );
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserCompletedOrdersController = async (req, res) => {
  try {
    const orders = await getUserCompletedOrders(parseInt(req.params.userId));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId); // Get userId from request params

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const orders = await getOrderHistory(userId);

    if (!orders.length) {
      return res.status(404).json({ message: "No order history found" });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





exports.updateOrderItemsStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    // Validate inputs
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }
    
    if (!status) {
      return res.status(400).json({ success: false, message: "New status is required" });
    }
    
    // Validate status is one of the allowed values
    const allowedStatuses = ["Pending", "Processing", "Completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Status must be one of: ${allowedStatuses.join(", ")}` 
      });
    }
    
    const result = await updateOrderItemsStatus(orderId, status);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Controller error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to update order items status" 
    });
  }
}

exports.getOrders = async (req, res) => {
  try {
    const { 
      page, 
      limit,
      startDate,
      endDate,
      status,
      product,
      mobileNumber
    } = req.query;
    
    const filters = {
      startDate,
      endDate,
      status,
      product,
      mobileNumber
    };
    
    const result = await orderService.getOrdersPaginated({
      page,
      limit,
      filters
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
},

exports.getOrderStats = async (req, res) => {
  try {
    const stats = await orderService.getOrderStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({ error: error.message });
  }
},

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const updatedOrder = await orderService.updateOrderStatus(orderId, status);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: error.message });
  }
}






///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const orderService = require('../services/orderService');

// const orderController = {
//   // Get orders with filtering, pagination, and pre-processed data
//   async getOrders(req, res) {
//     try {
//       const { 
//         page, 
//         limit,
//         startDate,
//         endDate,
//         status,
//         product,
//         mobileNumber
//       } = req.query;
      
//       const filters = {
//         startDate,
//         endDate,
//         status,
//         product,
//         mobileNumber
//       };
      
//       const result = await orderService.getOrdersPaginated({
//         page,
//         limit,
//         filters
//       });
      
//       res.json(result);
//     } catch (error) {
//       console.error("Error fetching orders:", error);
//       res.status(500).json({ error: error.message });
//     }
//   },
  
//   // Get summary stats for dashboard
//   async getOrderStats(req, res) {
//     try {
//       const stats = await orderService.getOrderStats();
//       res.json(stats);
//     } catch (error) {
//       console.error("Error fetching order stats:", error);
//       res.status(500).json({ error: error.message });
//     }
//   },
  
//   // Update order status
//   async updateOrderStatus(req, res) {
//     try {
//       const { orderId } = req.params;
//       const { status } = req.body;
      
//       const updatedOrder = await orderService.updateOrderStatus(orderId, status);
//       res.json(updatedOrder);
//     } catch (error) {
//       console.error("Error updating order status:", error);
//       res.status(500).json({ error: error.message });
//     }
//   }
// };


// module.exports = orderController;
