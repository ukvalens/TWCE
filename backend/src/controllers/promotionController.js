const { query } = require('../config/db');

const createCoupon = async (req, res, next) => {
  try {
    const { code, discount_type, value, min_order_amount, max_uses, expiry_date } = req.body;
    const result = await query(
      'INSERT INTO coupons (code, discount_type, value, min_order_amount, max_uses, expiry_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [code, discount_type, value, min_order_amount, max_uses, expiry_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const validateCoupon = async (req, res, next) => {
  try {
    const { code, order_amount } = req.body;
    const result = await query(
      `SELECT * FROM coupons WHERE code=$1 AND is_active=TRUE AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
       AND (max_uses IS NULL OR used_count < max_uses)`,
      [code]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Invalid or expired coupon' });

    const coupon = result.rows[0];
    if (order_amount < parseFloat(coupon.min_order_amount))
      return res.status(400).json({ message: `Minimum order amount is ${coupon.min_order_amount}` });

    const discount = coupon.discount_type === 'percentage' ? (order_amount * coupon.value) / 100 : coupon.value;
    res.json({ valid: true, coupon, discount: discount.toFixed(2) });
  } catch (err) { next(err); }
};

const getAllCoupons = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { next(err); }
};

const updateCoupon = async (req, res, next) => {
  try {
    const { is_active, expiry_date } = req.body;
    const result = await query('UPDATE coupons SET is_active=COALESCE($1,is_active), expiry_date=COALESCE($2,expiry_date) WHERE coupon_id=$3 RETURNING *', [is_active, expiry_date, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getLoyaltyPoints = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM loyalty_points WHERE user_id=$1', [req.user.user_id]);
    const history = await query('SELECT * FROM loyalty_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [req.user.user_id]);
    res.json({ points: result.rows[0]?.points || 0, history: history.rows });
  } catch (err) { next(err); }
};

const createFlashSale = async (req, res, next) => {
  try {
    const { product_id, sale_price, start_time, end_time } = req.body;
    const result = await query('INSERT INTO flash_sales (product_id, sale_price, start_time, end_time) VALUES ($1,$2,$3,$4) RETURNING *', [product_id, sale_price, start_time, end_time]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const getActiveFlashSales = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT fs.*, p.name, p.price, (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
       FROM flash_sales fs JOIN products p ON fs.product_id=p.product_id
       WHERE fs.is_active=TRUE AND fs.start_time <= NOW() AND fs.end_time >= NOW()`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

module.exports = { createCoupon, validateCoupon, getAllCoupons, updateCoupon, getLoyaltyPoints, createFlashSale, getActiveFlashSales };
