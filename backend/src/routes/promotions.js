const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/promotionController');

// Coupons
router.post('/coupons', authenticate, isAdmin, ctrl.createCoupon);
router.post('/coupons/validate', authenticate, ctrl.validateCoupon);
router.get('/coupons', authenticate, isAdmin, ctrl.getAllCoupons);
router.put('/coupons/:id', authenticate, isAdmin, ctrl.updateCoupon);


// Flash Sales
router.post('/flash-sales', authenticate, isAdmin, ctrl.createFlashSale);
router.get('/flash-sales', ctrl.getActiveFlashSales);

module.exports = router;
