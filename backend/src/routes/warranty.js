const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isVendor, isAdminOrVendor, isAdminOrSupport } = require('../middleware/auth');
const ctrl = require('../controllers/warrantyController');

// ─── Warranties — Vendor ──────────────────────────────────────
// Vendor registers/updates warranty for one of their products
router.post('/vendor', authenticate, isVendor, ctrl.createVendorWarranty);
// Vendor lists warranties on their products
router.get('/vendor', authenticate, isVendor, ctrl.getVendorWarranties);
// Vendor gets their product list (to select from)
router.get('/vendor/products', authenticate, isVendor, ctrl.getVendorProducts);
// Vendor deletes a warranty from one of their products
router.delete('/vendor/:id', authenticate, isVendor, ctrl.deleteVendorWarranty);

// ─── Warranties — Admin ───────────────────────────────────────
router.post('/', authenticate, isAdmin, ctrl.createWarranty);

// ─── Warranties — Customer ────────────────────────────────────
// Customer sees warranties auto-matched from their paid orders
router.get('/my', authenticate, ctrl.getMyWarranties);
// Legacy manual registration (kept for compatibility)
router.post('/register', authenticate, ctrl.registerWarranty);

// ─── Repair — customer ────────────────────────────────────────
router.post('/repair', authenticate, ctrl.submitRepairRequest);
router.get('/repair/my', authenticate, ctrl.getMyRepairRequests);
router.delete('/repair/:id', authenticate, ctrl.deleteRepairRequest);

// ─── Repair — admin / support ─────────────────────────────────
router.get('/repair/stats', authenticate, isAdminOrSupport, ctrl.getRepairStats);
router.get('/repair', authenticate, isAdminOrSupport, ctrl.getAllRepairRequests);
router.get('/repair/:id', authenticate, ctrl.getRepairById);
router.put('/repair/:id/status', authenticate, isAdminOrSupport, ctrl.updateRepairStatus);

// ─── Returns ──────────────────────────────────────────────────
router.post('/returns', authenticate, ctrl.submitReturnRequest);
router.get('/returns/my', authenticate, ctrl.getMyReturnRequests);
router.get('/returns/vendor', authenticate, isVendor, ctrl.getVendorReturnRequests);
router.get('/returns', authenticate, isAdminOrSupport, ctrl.getAllReturnRequests);
router.put('/returns/:id/status', authenticate, isAdminOrSupport, ctrl.updateReturnStatus);

module.exports = router;
