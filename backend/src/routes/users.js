const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, ctrl.updateProfile);
router.get('/addresses', authenticate, ctrl.getAddresses);
router.post('/addresses', authenticate, ctrl.addAddress);
router.put('/addresses/:id', authenticate, ctrl.updateAddress);
router.delete('/addresses/:id', authenticate, ctrl.deleteAddress);

// Admin
router.get('/', authenticate, isAdmin, ctrl.getAllUsers);
router.post('/', authenticate, isAdmin, ctrl.createUser);
router.put('/:id/status', authenticate, isAdmin, ctrl.updateUserStatus);
router.put('/:id/role', authenticate, isAdmin, ctrl.updateUserRole);
router.delete('/:id', authenticate, isAdmin, ctrl.deleteUser);

module.exports = router;
