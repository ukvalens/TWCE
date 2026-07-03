const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isDelivery } = require('../middleware/auth');
const ctrl = require('../controllers/deliveryController');

router.get('/my', authenticate, isDelivery, ctrl.getMyDeliveries);
router.put('/:id/status', authenticate, ctrl.updateDeliveryStatus); // delivery person or admin
router.get('/:id/tracking', authenticate, ctrl.getDeliveryTracking);

// Admin
router.get('/', authenticate, isAdmin, ctrl.getAllDeliveries);
router.post('/', authenticate, isAdmin, ctrl.assignDelivery);

module.exports = router;
