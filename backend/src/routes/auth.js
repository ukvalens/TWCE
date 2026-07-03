const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

console.log('[auth.js] validate middleware:', typeof validate, validate.name);

const registerRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().custom(val => !val || /^[+\d][\d\s\-().]{5,19}$/.test(val)).withMessage('Please enter a valid phone number'),
];

const loginRules = [
  body('email').isEmail().toLowerCase(),
  body('password').notEmpty(),
];

router.post('/register', registerRules, validate, ctrl.register);
router.get('/verify-email', ctrl.verifyEmail);
router.post('/login', loginRules, validate, ctrl.login);
router.post('/refresh-token', ctrl.refreshToken);
router.post('/forgot-password', body('email').isEmail(), validate, ctrl.forgotPassword);
router.post('/reset-password', [body('token').notEmpty(), body('password').isLength({ min: 8 })], validate, ctrl.resetPassword);
router.put('/change-password', authenticate, [body('current_password').notEmpty(), body('new_password').isLength({ min: 8 })], validate, ctrl.changePassword);

module.exports = router;
