const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isAdminOrVendor } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

const upload = require('../middleware/upload');

router.get('/methods', ctrl.getPaymentMethods);
router.post('/initiate', authenticate, ctrl.initiatePayment);
router.post('/verify', authenticate, ctrl.verifyPayment);
router.post('/upload-proof', authenticate, upload.single('proof'), ctrl.uploadPaymentProof);
router.post('/pesapal/initiate', authenticate, ctrl.pesapalInitiate);
router.post('/pesapal/status', authenticate, ctrl.pesapalStatus);
router.get('/pesapal/callback', ctrl.pesapalCallback);
router.post('/pesapal/ipn', ctrl.pesapalIPN);
router.get('/history', authenticate, ctrl.getPaymentHistory);
router.get('/slip/:id', authenticate, ctrl.getPaymentSlip);
router.get('/vendor', authenticate, ctrl.getVendorPayments);
router.get('/revenue', authenticate, isAdmin, ctrl.getRevenueStats);
router.get('/', authenticate, isAdmin, ctrl.getAllPayments);
router.put('/:id/refund', authenticate, isAdmin, ctrl.refundPayment);
router.put('/:id/complete', authenticate, isAdminOrVendor, ctrl.markPaymentCompleted);
router.put('/:id/reject', authenticate, isAdminOrVendor, ctrl.rejectPayment);
router.delete('/:id', authenticate, isAdmin, ctrl.deletePayment);

module.exports = router;
