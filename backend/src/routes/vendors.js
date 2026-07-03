const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isVendor } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/vendorController');

router.post('/apply', authenticate, ctrl.applyForVendor);
router.get('/me', authenticate, isVendor, ctrl.getMyVendorProfile);
router.put('/me', authenticate, isVendor, ctrl.updateVendorProfile);
router.post('/me/documents', authenticate, isVendor, upload.single('file'), ctrl.uploadDocument);
router.get('/dashboard', authenticate, isVendor, ctrl.getVendorDashboard);

// Admin
router.get('/', authenticate, isAdmin, ctrl.getAllVendors);
router.post('/admin', authenticate, isAdmin, ctrl.adminCreateVendor);
router.put('/:id/status', authenticate, isAdmin, ctrl.updateVendorStatus);

module.exports = router;
