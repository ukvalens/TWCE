const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const { query } = require('../config/db');

// PUBLIC — no auth required, all users need to fetch permissions
router.get('/permissions', async (req, res, next) => {
  try {
    const VENDOR_DEFAULTS = {
      dashboard: ['view'], products: ['view','create','edit'], orders: ['view'],
      payments: ['view'], deliveries: ['view'], warranties: ['view','create'],
      returns: ['view'], messages: ['view','send'], notifications: ['view'], analytics: ['view'],
    };

    const result = await query("SELECT value FROM system_settings WHERE key='role_permissions'");
    if (result.rows.length && result.rows[0].value) {
      const saved = JSON.parse(result.rows[0].value);
      // Ensure vendor (role 2) always has returns permission even if saved before it was added
      if (saved[2] && !saved[2].returns) {
        saved[2].returns = VENDOR_DEFAULTS.returns;
      }
      return res.json(saved);
    }
    res.json(null); // frontend falls back to defaults
  } catch (err) { next(err); }
});

router.get('/dashboard', authenticate, isAdmin, ctrl.getDashboard);
router.get('/settings', authenticate, isAdmin, ctrl.getSettings);
router.post('/settings', authenticate, isAdmin, ctrl.updateSetting);
router.get('/audit-logs', authenticate, isAdmin, ctrl.getAuditLogs);
router.post('/users/:id/reset-password', authenticate, isAdmin, ctrl.adminResetUserPassword);

// Roles
router.get('/roles', authenticate, isAdmin, ctrl.getRoles);
router.put('/roles/:id', authenticate, isAdmin, ctrl.updateRole);

// User search for settings page
router.get('/users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { search = '', limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.status, u.role_id, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id
       WHERE u.full_name ILIKE $1 OR u.email ILIKE $1
       ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    );
    const count = await query(
      `SELECT COUNT(*) FROM users WHERE full_name ILIKE $1 OR email ILIKE $1`, [like]
    );
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

module.exports = router;
