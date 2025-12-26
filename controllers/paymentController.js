const paymentService = require('../services/paymentService');
const shopService = require('../services/shopService');
const crypto = require('crypto');

// Initialize Paystack payment
const initializePayment = async (req, res) => {
  try {
    const { email, mobileNumber, amount, productId, productName } = req.body;

    if (!mobileNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number and amount are required'
      });
    }

    // Build callback URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = `${frontendUrl}/shop?payment=callback`;

    const result = await paymentService.initializePayment(
      email,
      mobileNumber,
      amount,
      productId,
      productName,
      callbackUrl
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Payment initialized',
        transactionId: result.transactionId,
        externalRef: result.externalRef,
        paymentUrl: result.paymentUrl,
        accessCode: result.accessCode,
        reference: result.reference
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to initialize payment',
        transactionId: result.transactionId,
        externalRef: result.externalRef
      });
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Handle Paystack webhook callback
const handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid Paystack webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log('Paystack Webhook received:', req.body.event);
    
    const result = await paymentService.handleWebhook(req.body);

    if (result.success) {
      // Payment successful - create the order
      try {
        const order = await shopService.createShopOrder(
          result.productId,
          result.mobileNumber,
          'Shop Customer'
        );

        // Link transaction to order
        await paymentService.linkTransactionToOrder(result.externalRef, order.id);

        console.log('Order created from webhook:', order.id);
      } catch (orderError) {
        console.error('Order creation error from webhook:', orderError);
      }
    }

    // Always respond 200 to webhook
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};

// Verify payment status (called from frontend after redirect)
const verifyPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const result = await paymentService.verifyPayment(reference);

    if (result.success) {
      // Payment confirmed - create order if not already created
      const transaction = await paymentService.checkPaymentStatus(reference);
      
      if (!transaction.orderId) {
        try {
          const order = await shopService.createShopOrder(
            transaction.productId,
            transaction.mobileNumber,
            'Shop Customer'
          );

          await paymentService.linkTransactionToOrder(reference, order.id);

          res.json({
            success: true,
            message: 'Payment verified and order placed!',
            status: 'SUCCESS',
            order: {
              id: order.id
            }
          });
        } catch (orderError) {
          console.error('Order creation error:', orderError);
          res.json({
            success: true,
            message: 'Payment verified but order creation failed',
            status: 'SUCCESS',
            orderError: orderError.message
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Payment already verified',
          status: 'SUCCESS',
          order: { id: transaction.orderId }
        });
      }
    } else if (result.pending) {
      res.json({
        success: false,
        message: 'Payment is still pending',
        status: 'PENDING'
      });
    } else {
      res.json({
        success: false,
        message: 'Payment failed or was abandoned',
        status: 'FAILED'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Check payment status
const checkStatus = async (req, res) => {
  try {
    const { externalRef } = req.params;

    if (!externalRef) {
      return res.status(400).json({
        success: false,
        message: 'External reference is required'
      });
    }

    const status = await paymentService.checkPaymentStatus(externalRef);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Get all payment transactions (admin)
const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await paymentService.getAllPaymentTransactions(page, limit);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  initializePayment,
  handleWebhook,
  verifyPaymentStatus,
  checkStatus,
  getAllTransactions
};
