const axios = require('axios');
const prisma = require('../config/db');

// Paystack API URLs
const PAYSTACK_INITIALIZE_URL = 'https://api.paystack.co/transaction/initialize';
const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify';

// Generate unique external reference
const generateExternalRef = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `KELISHUB-${timestamp}-${random}`;
};

// Initialize Paystack transaction and get payment URL
const initializePayment = async (email, mobileNumber, amount, productId, productName, callbackUrl) => {
  const externalRef = generateExternalRef();
  
  // Format phone number
  let formattedPhone = mobileNumber.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '233' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('233')) {
    formattedPhone = '233' + formattedPhone;
  }

  // Create payment transaction record
  const paymentTransaction = await prisma.paymentTransaction.create({
    data: {
      externalRef,
      mobileNumber: formattedPhone,
      amount: parseFloat(amount),
      currency: 'GHS',
      channel: 'PAYSTACK',
      status: 'PENDING',
      productId: productId ? parseInt(productId) : null,
      productName
    }
  });

  try {
    console.log('Initializing Paystack Payment...');
    
    // Paystack amount is in pesewas (kobo equivalent), so multiply by 100
    const amountInPesewas = Math.round(parseFloat(amount) * 100);

    const response = await axios({
      method: 'POST',
      url: PAYSTACK_INITIALIZE_URL,
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        email: email || `${formattedPhone}@kelishub.com`,
        amount: amountInPesewas,
        currency: 'GHS',
        reference: externalRef,
        callback_url: callbackUrl || process.env.PAYSTACK_CALLBACK_URL,
        metadata: {
          productId: productId,
          productName: productName,
          mobileNumber: formattedPhone,
          custom_fields: [
            {
              display_name: "Mobile Number",
              variable_name: "mobile_number",
              value: formattedPhone
            },
            {
              display_name: "Product",
              variable_name: "product_name",
              value: productName
            }
          ]
        },
        channels: ['mobile_money', 'card']
      },
      timeout: 30000
    });

    console.log('Paystack Initialize Response:', response.data);

    if (response.data.status === true) {
      const paymentUrl = response.data.data.authorization_url;
      const accessCode = response.data.data.access_code;
      const paystackRef = response.data.data.reference;

      // Update transaction with Paystack response
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          moolreCode: accessCode,
          moolreMessage: 'Payment initialized',
          moolreSessionId: paystackRef,
          status: 'INITIALIZED'
        }
      });

      return {
        success: true,
        transactionId: paymentTransaction.id,
        externalRef,
        paymentUrl: paymentUrl,
        accessCode: accessCode,
        reference: paystackRef,
        message: 'Payment initialized successfully'
      };
    } else {
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: 'FAILED',
          moolreMessage: response.data.message || 'Failed to initialize payment'
        }
      });

      return {
        success: false,
        transactionId: paymentTransaction.id,
        externalRef,
        error: response.data.message || 'Failed to initialize payment'
      };
    }

  } catch (error) {
    console.error('Paystack Initialize Error:', error.response?.data || error.message);
    
    await prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: {
        status: 'FAILED',
        moolreMessage: error.response?.data?.message || error.message
      }
    });

    return {
      success: false,
      transactionId: paymentTransaction.id,
      externalRef,
      error: error.response?.data?.message || error.message
    };
  }
};

// Verify payment with Paystack API
const verifyPayment = async (reference) => {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { externalRef: reference }
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  try {
    console.log('Verifying Paystack Payment:', reference);
    
    const response = await axios({
      method: 'GET',
      url: `${PAYSTACK_VERIFY_URL}/${reference}`,
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('Paystack Verify Response:', response.data);

    const paymentData = response.data.data;
    const paymentStatus = paymentData?.status;
    
    // Paystack status: success, failed, abandoned
    const isSuccess = paymentStatus === 'success';
    const isPending = paymentStatus === 'pending' || paymentStatus === 'ongoing';
    const isFailed = paymentStatus === 'failed' || paymentStatus === 'abandoned';

    let status = transaction.status;
    if (isSuccess) {
      status = 'SUCCESS';
    } else if (isFailed) {
      status = 'FAILED';
    }

    // Update transaction
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: status,
        moolreCode: paymentData?.gateway_response || paymentStatus,
        moolreMessage: paymentData?.message || `Payment ${paymentStatus}`
      }
    });

    return {
      success: isSuccess,
      pending: isPending,
      transactionId: transaction.id,
      externalRef: reference,
      status: status,
      amount: paymentData?.amount / 100,
      paystackResponse: response.data
    };

  } catch (error) {
    console.error('Paystack Verify Error:', error.response?.data || error.message);
    return {
      success: false,
      pending: true,
      transactionId: transaction.id,
      externalRef: reference,
      error: error.response?.data?.message || error.message
    };
  }
};

// Handle Paystack webhook callback
const handleWebhook = async (webhookData) => {
  console.log('Paystack Webhook Received:', webhookData);
  
  // Paystack webhook event structure
  const event = webhookData.event;
  const data = webhookData.data;
  
  if (!data || !data.reference) {
    console.error('Webhook missing reference');
    return { success: false, error: 'Missing reference' };
  }

  const externalRef = data.reference;

  // Find the transaction
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { externalRef }
  });

  if (!transaction) {
    console.error('Transaction not found for webhook:', externalRef);
    return { success: false, error: 'Transaction not found' };
  }

  // Determine status from webhook event
  // charge.success = payment successful
  const isSuccess = event === 'charge.success' && data.status === 'success';
  const isFailed = event === 'charge.failed' || data.status === 'failed';

  let newStatus = transaction.status;
  if (isSuccess) {
    newStatus = 'SUCCESS';
  } else if (isFailed) {
    newStatus = 'FAILED';
  }

  // Update transaction
  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: newStatus,
      moolreSessionId: data.id?.toString() || transaction.moolreSessionId,
      moolreMessage: data.gateway_response || transaction.moolreMessage
    }
  });

  return {
    success: isSuccess,
    transactionId: transaction.id,
    externalRef,
    productId: transaction.productId,
    productName: transaction.productName,
    mobileNumber: transaction.mobileNumber,
    amount: transaction.amount,
    status: newStatus
  };
};

// Check payment status
const checkPaymentStatus = async (externalRef) => {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { externalRef }
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return {
    transactionId: transaction.id,
    externalRef: transaction.externalRef,
    status: transaction.status,
    amount: transaction.amount,
    mobileNumber: transaction.mobileNumber,
    productId: transaction.productId,
    productName: transaction.productName,
    orderId: transaction.orderId,
    createdAt: transaction.createdAt
  };
};

// Get all payment transactions (for admin)
const getAllPaymentTransactions = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  
  const [transactions, total] = await Promise.all([
    prisma.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.paymentTransaction.count()
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Update transaction with order ID after successful order creation
const linkTransactionToOrder = async (externalRef, orderId) => {
  return await prisma.paymentTransaction.update({
    where: { externalRef },
    data: { orderId }
  });
};

module.exports = {
  initializePayment,
  verifyPayment,
  handleWebhook,
  checkPaymentStatus,
  getAllPaymentTransactions,
  linkTransactionToOrder
};
