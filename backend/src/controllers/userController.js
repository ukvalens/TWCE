const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const crypto = require('crypto');

const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.status, u.email_verified, u.created_at, u.role_id, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone } = req.body;
    const result = await query(
      `UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = NOW()
       WHERE user_id = $3 RETURNING user_id, full_name, email, phone`,
      [full_name, phone, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getAddresses = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, address_id',
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const addAddress = async (req, res, next) => {
  try {
    const { country, city, street, postal_code, is_default, sector, district } = req.body;
    if (!country || !city || !street)
      return res.status(400).json({ message: 'Country, city and street are required' });
    if (is_default) {
      await query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.user_id]);
    }
    const result = await query(
      `INSERT INTO user_addresses (user_id, country, city, street, postal_code, is_default)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.user_id, country.trim(), city.trim(), street.trim(), postal_code || null, is_default || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateAddress = async (req, res, next) => {
  try {
    const { country, city, street, postal_code, is_default } = req.body;
    // Verify ownership first
    const existing = await query(
      'SELECT * FROM user_addresses WHERE address_id=$1 AND user_id=$2',
      [req.params.id, req.user.user_id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Address not found' });
    const cur = existing.rows[0];
    const setDef = is_default === true || is_default === 'true';
    if (setDef) {
      await query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.user_id]);
    }
    const result = await query(
      `UPDATE user_addresses
       SET country=$1, city=$2, street=$3, postal_code=$4, is_default=$5
       WHERE address_id=$6 AND user_id=$7 RETURNING *`,
      [
        country  !== undefined ? country.trim()  : cur.country,
        city     !== undefined ? city.trim()     : cur.city,
        street   !== undefined ? street.trim()   : cur.street,
        postal_code !== undefined ? postal_code  : cur.postal_code,
        setDef !== undefined ? setDef : cur.is_default,
        req.params.id,
        req.user.user_id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const deleteAddress = async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT * FROM user_addresses WHERE address_id=$1 AND user_id=$2',
      [req.params.id, req.user.user_id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Address not found' });

    // Check for active orders using this address
    const activeOrders = await query(
      `SELECT COUNT(*) FROM orders
       WHERE address_id=$1 AND status NOT IN ('delivered','cancelled','returned')`,
      [req.params.id]
    );
    if (parseInt(activeOrders.rows[0].count) > 0)
      return res.status(400).json({
        message: 'This address is used by active orders. Wait until those orders are delivered or cancelled before deleting it.',
      });

    // Nullify address_id on completed/cancelled orders so FK doesn't block delete
    await query(
      `UPDATE orders SET address_id=NULL
       WHERE address_id=$1 AND status IN ('delivered','cancelled','returned')`,
      [req.params.id]
    );

    await query('DELETE FROM user_addresses WHERE address_id=$1 AND user_id=$2', [req.params.id, req.user.user_id]);

    // If deleted address was default, promote the next one
    if (existing.rows[0].is_default) {
      await query(
        `UPDATE user_addresses SET is_default=TRUE
         WHERE address_id = (SELECT address_id FROM user_addresses WHERE user_id=$1 LIMIT 1)`,
        [req.user.user_id]
      ).catch(() => {});
    }
    res.json({ message: 'Address deleted' });
  } catch (err) { next(err); }
};

// Admin only
const createUser = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, role_id = 3 } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: 'full_name, email and password are required' });
    const existing = await query('SELECT user_id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const verification_token = crypto.randomBytes(32).toString('hex');
    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, email_verification_token, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING user_id, full_name, email, phone, role_id, status, created_at`,
      [full_name, email, phone || null, password_hash, parseInt(role_id), verification_token]
    );
    const user = result.rows[0];
    if (parseInt(role_id) === 3) {
      await query('INSERT INTO wishlist (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.user_id]);
      await query('INSERT INTO loyalty_points (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.user_id]);
    }
    res.status(201).json(user);
  } catch (err) { next(err); }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];

    if (role) { params.push(role); where += ` AND u.role_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND u.status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }

    params.push(limit, offset);
    const result = await query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.status, u.email_verified, u.created_at, r.role_name
       FROM users u JOIN roles r ON u.role_id = r.role_id ${where}
       ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const count = await query(`SELECT COUNT(*) FROM users u ${where}`, params.slice(0, -2));
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const updateUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user.user_id)
      return res.status(400).json({ message: 'You cannot change your own status' });
    const { status } = req.body;
    await query('UPDATE users SET status = $1 WHERE user_id = $2', [status, req.params.id]);
    res.json({ message: 'User status updated' });
  } catch (err) { next(err); }
};

const updateUserRole = async (req, res, next) => {
  try {
    if (req.params.id === req.user.user_id)
      return res.status(400).json({ message: 'You cannot change your own role' });
    const { role_id } = req.body;
    await query('UPDATE users SET role_id = $1, updated_at = NOW() WHERE user_id = $2', [role_id, req.params.id]);
    res.json({ message: 'User role updated' });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.user_id)
      return res.status(400).json({ message: 'You cannot delete your own account' });
    await query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, getAddresses, addAddress, updateAddress, deleteAddress, createUser, getAllUsers, updateUserStatus, updateUserRole, deleteUser };
