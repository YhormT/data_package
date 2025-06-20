const express = require('express');
const orderController = require('../controllers/orderController'); // Import controller
const path = require('path');

// Download Excel template for order upload
const templatePath = path.join(__dirname, '../uploads/order_upload_template.xlsx');

// Route to download the Excel template
const router = express.Router();
router.get('/download-template', (req, res) => {
  res.download(templatePath, 'order_upload_template.xlsx');
});

// Excel upload for agent orders
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
router.post('/upload-excel', upload.single('file'), orderController.uploadExcelOrders);

// User: Submit cart as an order
router.post('/submit', orderController.submitCart);

// Admin: Process an order (update status)
router.put('/admin/process/:orderId', orderController.processOrderController);

router.post('/admin/process/order', orderController.processOrderItem);

router.get('/admin/allorder', orderController.getOrderStatus);

router.get("/admin/:userId", orderController.getOrderHistory);

// User: View completed orders
router.get('/user/completed/:userId', orderController.getUserCompletedOrdersController);

router.put('/orders/:orderId/status', orderController.updateOrderItemsStatus);

module.exports = router;