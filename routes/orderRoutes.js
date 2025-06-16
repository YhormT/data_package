const express = require('express');
const orderController = require('../controllers/orderController'); // Import controller

const router = express.Router();

// User: Submit cart as an order
router.post('/submit', orderController.submitCart);

// Admin: View all orders
router.get('/admin/orders', orderController.getAllOrders);



// Admin: Process an order (update status)
router.put('/admin/process/:orderId', orderController.processOrderController);


router.post('/admin/process/order', orderController.processOrderItem);


router.get('/admin/allorder', orderController.getOrderStatus);

router.get("/admin/:userId", orderController.getOrderHistory);

// User: View completed orders
router.get('/user/completed/:userId', orderController.getUserCompletedOrdersController);


router.put('/orders/:orderId/status', orderController.updateOrderItemsStatus);

// const orderController = require('../controllers/orderController');

// router.get('/admin/orders', orderController.getOrders);
// router.get('/admin/order-stats', orderController.getOrderStats);
// router.put('/admin/order/:orderId/status', orderController.updateOrderStatus);

router.get('/admin/orders', orderController.getOrders);
router.get('/admin/orderStats', orderController.getOrderStats);
router.put('/admin/order/:orderId/status', orderController.updateOrderStatus);

module.exports = router;

module.exports = router;


module.exports = router;
