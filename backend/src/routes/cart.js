const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/cartController');

// Cart
router.get('/', authenticate, ctrl.getCart);
router.post('/items', authenticate, ctrl.addToCart);
router.put('/items/:itemId', authenticate, ctrl.updateCartItem);
router.delete('/items/:itemId', authenticate, ctrl.removeCartItem);
router.delete('/', authenticate, ctrl.clearCart);

// Wishlist
router.get('/wishlist', authenticate, ctrl.getWishlist);
router.post('/wishlist', authenticate, ctrl.addToWishlist);
router.delete('/wishlist/:productId', authenticate, ctrl.removeFromWishlist);

module.exports = router;
