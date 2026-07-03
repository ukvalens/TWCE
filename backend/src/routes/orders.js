const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isAdminOrVendor } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.post('/',              authenticate, ctrl.createOrder);
router.get('/my',             authenticate, ctrl.getMyOrders);
router.get('/:id/items',      authenticate, isAdminOrVendor, ctrl.getVendorOrderItems);
router.get('/:id',            authenticate, ctrl.getOrderById);
router.put('/:id/cancel',     authenticate, ctrl.cancelOrder);   // customer or vendor

// Admin/Vendor
router.get('/',               authenticate, isAdminOrVendor, ctrl.getAllOrders);
router.put('/:id/status',     authenticate, isAdminOrVendor, ctrl.updateOrderStatus);

module.exports = router;
