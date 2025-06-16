require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const topUpRoutes = require('./routes/topUpRoutes')
const uploadRoutes = require('./routes/uploadRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const smsRoutes = require('./routes/smsRoutes');

// const topUpRoutes = require('./routes/topupRoutes'); // 👈 Adjust path if needed
   // 👈 Your existing user routes


const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/products', productRoutes);
app.use('/order', orderRoutes);
app.use('/api', topUpRoutes);
app.use('/api', uploadRoutes);
app.use('/api', transactionRoutes);

app.use('/api/sales', salesRoutes);
app.use('/api/sms', smsRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
