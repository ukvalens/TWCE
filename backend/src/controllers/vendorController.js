const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { notify } = require('./communicationController');

const applyForVendor = async (req, res, next) => {
  try {
    const { shop_name, business_email, business_phone } = req.body;
    const existing = await query('SELECT vendor_id FROM vendors WHERE user_id = $1', [req.user.user_id]);
    if (existing.rows.length) return res.status(409).json({ message: 'Vendor application already exists' });

    const result = await query(
      `INSERT INTO vendors (user_id, shop_name, business_email, business_phone) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.user_id, shop_name, business_email, business_phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const getMyVendorProfile = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM vendors WHERE user_id = $1', [req.user.user_id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Vendor profile not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateVendorProfile = async (req, res, next) => {
  try {
    const { shop_name, business_email, business_phone } = req.body;
    const result = await query(
      `UPDATE vendors SET shop_name=COALESCE($1,shop_name), business_email=COALESCE($2,business_email),
       business_phone=COALESCE($3,business_phone) WHERE user_id=$4 RETURNING *`,
      [shop_name, business_email, business_phone, req.user.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const uploadDocument = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(404).json({ message: 'Vendor not found' });

    const file_url = `${process.env.CLIENT_URL}/uploads/${req.file.filename}`;
    const result = await query(
      `INSERT INTO vendor_documents (vendor_id, document_type, file_url) VALUES ($1,$2,$3) RETURNING *`,
      [vendor.rows[0].vendor_id, req.body.document_type, file_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const getVendorDashboard = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(404).json({ message: 'Vendor not found' });
    const vid = vendor.rows[0].vendor_id;

    const [products, orders, revenue] = await Promise.all([
      query('SELECT COUNT(*) FROM products WHERE vendor_id=$1', [vid]),
      query(`SELECT COUNT(*) FROM orders o JOIN order_items oi ON o.order_id=oi.order_id
             JOIN products p ON oi.product_id=p.product_id WHERE p.vendor_id=$1`, [vid]),
      query(`SELECT COALESCE(SUM(oi.price * oi.quantity),0) as total FROM order_items oi
             JOIN products p ON oi.product_id=p.product_id
             JOIN orders o ON oi.order_id=o.order_id
             WHERE p.vendor_id=$1 AND o.payment_status='paid'`, [vid]),
    ]);

    res.json({
      total_products: parseInt(products.rows[0].count),
      total_orders: parseInt(orders.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) { next(err); }
};

const adminCreateVendor = async (req, res, next) => {
  try {
    const { full_name, email, phone, password, shop_name, business_email, business_phone } = req.body;
    if (!full_name || !email || !password || !shop_name)
      return res.status(400).json({ message: 'full_name, email, password and shop_name are required' });
    const existing = await query('SELECT user_id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const verification_token = crypto.randomBytes(32).toString('hex');
    const userResult = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id, email_verification_token, email_verified)
       VALUES ($1,$2,$3,$4,2,$5,TRUE) RETURNING user_id, full_name, email, role_id, status`,
      [full_name, email, phone || null, password_hash, verification_token]
    );
    const user = userResult.rows[0];
    const vendorResult = await query(
      `INSERT INTO vendors (user_id, shop_name, business_email, business_phone, verification_status)
       VALUES ($1,$2,$3,$4,'verified') RETURNING *`,
      [user.user_id, shop_name, business_email || email, business_phone || phone || null]
    );
    res.status(201).json({ user, vendor: vendorResult.rows[0] });
  } catch (err) { next(err); }
};

// Admin
const getAllVendors = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;
    let where = status ? `WHERE verification_status = '${status}'` : '';
    const result = await query(`SELECT v.*, u.full_name, u.email FROM vendors v JOIN users u ON v.user_id=u.user_id ${where} ORDER BY v.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const count = await query(`SELECT COUNT(*) FROM vendors ${where}`);
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

const updateVendorStatus = async (req, res, next) => {
  try {
    const { verification_status } = req.body;
    const result = await query('UPDATE vendors SET verification_status=$1 WHERE vendor_id=$2 RETURNING user_id, shop_name', [verification_status, req.params.id]);
    if (result.rows.length) {
      const msg = verification_status === 'verified'
        ? `Your shop "${result.rows[0].shop_name}" has been verified. You can now add products.`
        : `Your shop "${result.rows[0].shop_name}" verification status: ${verification_status}.`;
      notify(result.rows[0].user_id, `Vendor ${verification_status === 'verified' ? 'Verified' : 'Status Updated'}`, msg, 'vendor');
    }
    res.json({ message: 'Vendor status updated' });
  } catch (err) { next(err); }
};

module.exports = { applyForVendor, getMyVendorProfile, updateVendorProfile, uploadDocument, getVendorDashboard, adminCreateVendor, getAllVendors, updateVendorStatus };
