const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isAdminOrVendor } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.get('/methods', ctrl.getPaymentMethods);
router.post('/initiate', authenticate, ctrl.initiatePayment);
router.post('/verify', authenticate, ctrl.verifyPayment);
router.get('/history', authenticate, ctrl.getPaymentHistory);
router.get('/slip/:id', authenticate, ctrl.getPaymentSlip);
router.get('/vendor', authenticate, ctrl.getVendorPayments);
router.get('/revenue', authenticate, isAdmin, ctrl.getRevenueStats);
router.get('/', authenticate, isAdmin, ctrl.getAllPayments);
router.put('/:id/refund', authenticate, isAdmin, ctrl.refundPayment);

module.exports = router;
