const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/aiController');

router.get('/recommendations', (req, res, next) => { require('../middleware/auth').authenticate(req, res, () => next()); }, ctrl.getRecommendations);
router.get('/recently-viewed', authenticate, ctrl.getRecentlyViewed);
router.get('/search', (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth) return require('../middleware/auth').authenticate(req, res, next);
  next();
}, ctrl.smartSearch);
router.post('/fraud-check', authenticate, isAdmin, ctrl.detectFraud);
router.get('/analytics', authenticate, isAdmin, ctrl.getAnalytics);
router.get('/vendor-analytics', authenticate, ctrl.getVendorAnalytics);

module.exports = router;
