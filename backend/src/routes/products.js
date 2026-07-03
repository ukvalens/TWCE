const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, isAdminOrVendor } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/productController');
const stockCtrl = require('../controllers/stockController');

// Public
router.get('/', (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth) return require('../middleware/auth').authenticate(req, res, next);
  next();
}, ctrl.getProducts);
router.get('/featured', ctrl.getFeaturedProducts);
router.get('/new-arrivals', ctrl.getNewArrivals);
router.get('/best-selling', ctrl.getBestSelling);
router.get('/compare', ctrl.compareProducts);

// Categories (must be before /:id)
router.get('/meta/categories', ctrl.getCategories);
router.post('/meta/categories', authenticate, isAdmin, ctrl.createCategory);
router.put('/meta/categories/:id', authenticate, isAdmin, ctrl.updateCategory);
router.delete('/meta/categories/:id', authenticate, isAdmin, ctrl.deleteCategory);

// Brands (must be before /:id)
router.get('/meta/brands', ctrl.getBrands);
router.post('/meta/brands', authenticate, isAdmin, ctrl.createBrand);
router.put('/meta/brands/:id', authenticate, isAdmin, ctrl.updateBrand);
router.delete('/meta/brands/:id', authenticate, isAdmin, ctrl.deleteBrand);

// Stock — must be before /:id
router.get('/low-stock', authenticate, isAdmin, stockCtrl.getLowStock);

router.get('/:id', (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth) return require('../middleware/auth').authenticate(req, res, next);
  next();
}, ctrl.getProductById);
router.get('/:id/related', ctrl.getRelatedProducts);

// Vendor
router.post('/', authenticate, isAdminOrVendor, ctrl.createProduct);
router.put('/:id', authenticate, isAdminOrVendor, ctrl.updateProduct);
router.put('/:id/toggle-status', authenticate, isAdminOrVendor, ctrl.toggleProductStatus);
router.delete('/:id', authenticate, isAdminOrVendor, ctrl.deleteProduct);
router.post('/:id/images', authenticate, isAdminOrVendor, upload.array('images', 10), ctrl.uploadProductImages);
router.post('/:id/specs', authenticate, isAdminOrVendor, ctrl.addProductSpec);
router.post('/:id/variants', authenticate, isAdminOrVendor, ctrl.addProductVariant);

// Admin
router.put('/:id/approve', authenticate, isAdmin, ctrl.approveProduct);

// Stock management
router.get('/:id/stock', authenticate, isAdminOrVendor, stockCtrl.getStockHistory);
router.post('/:id/stock', authenticate, isAdminOrVendor, stockCtrl.adjustStock);

module.exports = router;
