const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const getSettings = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM system_settings ORDER BY key');
    res.json(result.rows);
  } catch (err) { next(err); }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const result = await query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW() RETURNING *`,
      [key, value]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT al.*, u.full_name, u.email FROM audit_logs al LEFT JOIN users u ON al.user_id=u.user_id ORDER BY al.timestamp DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM audit_logs');
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getDashboard = async (req, res, next) => {
  try {
    const [users, vendors, orders, pendingOrders, revenue, pendingProducts, tickets, totalProducts] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query("SELECT COUNT(*) FROM vendors WHERE verification_status='verified'"),
      query('SELECT COUNT(*) FROM orders'),
      query("SELECT COUNT(*) FROM orders WHERE status='pending'"),
      query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='paid'"),
      query("SELECT COUNT(*) FROM products WHERE status='pending'"),
      query("SELECT COUNT(*) FROM support_tickets WHERE status='open'"),
      query('SELECT COUNT(*) FROM products'),
    ]);

    res.json({
      total_users: parseInt(users.rows[0].count),
      verified_vendors: parseInt(vendors.rows[0].count),
      total_orders: parseInt(orders.rows[0].count),
      pending_orders: parseInt(pendingOrders.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].coalesce),
      pending_products: parseInt(pendingProducts.rows[0].count),
      open_tickets: parseInt(tickets.rows[0].count),
      total_products: parseInt(totalProducts.rows[0].count),
    });
  } catch (err) { next(err); }
};

const adminResetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await query('SELECT user_id, full_name FROM users WHERE user_id = $1', [id]);
    if (!user.rows.length) return res.status(404).json({ message: 'User not found' });

    const password_hash = await bcrypt.hash(new_password, 12);
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE user_id = $2',
      [password_hash, id]
    );
    res.json({ message: `Password reset successfully for ${user.rows[0].full_name}` });
  } catch (err) { next(err); }
};

const getRoles = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM roles ORDER BY role_id');
    res.json(result.rows);
  } catch (err) { next(err); }
};

const updateRole = async (req, res, next) => {
  try {
    const { role_name, description } = req.body;
    if (parseInt(req.params.id) === 1)
      return res.status(400).json({ message: 'Admin role cannot be modified' });
    const result = await query(
      'UPDATE roles SET role_name=$1, description=$2 WHERE role_id=$3 RETURNING *',
      [role_name, description, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Role not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSetting, getAuditLogs, getDashboard, adminResetUserPassword, getRoles, updateRole };
