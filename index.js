require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const createUserRouter = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const topUpRoutes = require('./routes/topUpRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const smsRoutes = require('./routes/smsRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const pasteRoutes = require('./routes/pasteRoutes');
const resetRoutes = require('./routes/resetRoutes');
const shopRoutes = require('./routes/shopRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Be more specific in production
    methods: ["GET", "POST"]
  }
});

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('register', (data) => {
    // The frontend might send the ID directly or in an object { userId: '123' }.
    // This handles both cases to ensure we always get the ID.
    const userId = (typeof data === 'object' && data.userId) ? data.userId : data;

    if (userId) {
      console.log(`[Socket Debug] Received 'register' event for user ID: ${userId} with socket ID: ${socket.id}`);
      userSockets.set(userId, socket.id);
      console.log(`[Socket Debug] Current userSockets map:`, userSockets);
    } else {
      console.error(`[Socket Error] Received invalid data for 'register' event:`, data);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Export io and userSockets for use in other modules
module.exports = { app, io, userSockets };

app.use(express.json());
app.use(cors());
app.use(helmet());

const userRoutes = createUserRouter(io, userSockets);
app.use('/api/users', userRoutes);



app.use('/api/order', pasteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/products', productRoutes);
app.use('/order', orderRoutes);
app.use('/api', topUpRoutes);
app.use('/api', uploadRoutes);
app.use('/api', transactionRoutes);

app.use('/api/sales', salesRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/announcement', announcementRoutes);
app.use('/api', pasteRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/complaints', complaintRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Background job: Reconcile orphaned payments every 5 minutes
const paymentService = require('./services/paymentService');
const shopService = require('./services/shopService');

const reconcileOrphanedPayments = async () => {
  try {
    const orphanedPayments = await paymentService.getOrphanedSuccessfulPayments();
    
    if (orphanedPayments.length > 0) {
      console.log(`[Auto-Reconciliation] Found ${orphanedPayments.length} orphaned payments`);
      
      for (const payment of orphanedPayments) {
        try {
          const result = await paymentService.verifyAndCreateOrder(payment.externalRef, shopService);
          if (result.success && result.orderId) {
            console.log(`[Auto-Reconciliation] Created order ${result.orderId} for payment ${payment.externalRef}`);
          }
        } catch (err) {
          console.error(`[Auto-Reconciliation] Failed for ${payment.externalRef}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('[Auto-Reconciliation] Error:', error.message);
  }
};

// Run reconciliation every 5 minutes
setInterval(reconcileOrphanedPayments, 5 * 60 * 1000);

// Also run once after server starts (after 30 seconds)
setTimeout(reconcileOrphanedPayments, 30 * 1000);
