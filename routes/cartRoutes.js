// routes/cartRoutes.js
const express = require('express');
const {
  addToCart,
  getCart,
  removeFromCart,
  getAllCarts
} = require('../controllers/cartController');

const router = express.Router();

router.post('/add', addToCart);
router.get('/:userId', getCart);
router.delete('/remove/:cartItemId', removeFromCart);
router.get('/admin/all', getAllCarts);

module.exports = router;
