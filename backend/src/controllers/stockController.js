const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

// Ensure stock_history table exists (idempotent)
const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS stock_history (
      history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
      changed_by UUID REFERENCES users(user_id),
      change_type VARCHAR(30) NOT NULL CHECK (change_type IN ('restock','adjustment','sale','return','correction')),
      quantity_change INT NOT NULL,
      quantity_before INT NOT NULL,
      quantity_after INT NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
ensureTable().catch(() => {});

// GET /products/:id/stock  — history for one product
const getStockHistory = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { id } = req.params;

    // Vendors can only see their own products
    if (req.user.role_id === 2) {
      const v = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!v.rows.length) return res.status(403).json({ message: 'Vendor profile required' });
      const owns = await query('SELECT product_id FROM products WHERE product_id=$1 AND vendor_id=$2', [id, v.rows[0].vendor_id]);
      if (!owns.rows.length) return res.status(404).json({ message: 'Product not found' });
    }

    const result = await query(
      `SELECT sh.*, u.full_name AS changed_by_name, p.name AS product_name, p.stock_quantity AS current_stock
       FROM stock_history sh
       JOIN users u ON sh.changed_by = u.user_id
       JOIN products p ON sh.product_id = p.product_id
       WHERE sh.product_id = $1
       ORDER BY sh.created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM stock_history WHERE product_id=$1', [id]);
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

// POST /products/:id/stock  — adjust stock
const adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { change_type, quantity_change, note } = req.body;

    if (!change_type || quantity_change === undefined || quantity_change === null)
      return res.status(400).json({ message: 'change_type and quantity_change are required' });

    const qty = parseInt(quantity_change);
    if (isNaN(qty) || qty === 0)
      return res.status(400).json({ message: 'quantity_change must be a non-zero integer' });

    // Ownership check for vendors
    let vendorId = null;
    if (req.user.role_id === 2) {
      const v = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!v.rows.length) return res.status(403).json({ message: 'Vendor profile required' });
      vendorId = v.rows[0].vendor_id;
      const owns = await query('SELECT product_id FROM products WHERE product_id=$1 AND vendor_id=$2', [id, vendorId]);
      if (!owns.rows.length) return res.status(404).json({ message: 'Product not found' });
    }

    const cur = await query('SELECT stock_quantity, name FROM products WHERE product_id=$1', [id]);
    if (!cur.rows.length) return res.status(404).json({ message: 'Product not found' });

    const before = parseInt(cur.rows[0].stock_quantity);
    const after = Math.max(0, before + qty);

    // Update stock
    await query(
      `UPDATE products SET stock_quantity=$1, status=CASE
         WHEN $1 <= 0 AND status='active' THEN 'inactive'
         WHEN $1 > 0 AND status='inactive' THEN 'active'
         ELSE status END, updated_at=NOW()
       WHERE product_id=$2`,
      [after, id]
    );

    // Record history
    const hist = await query(
      `INSERT INTO stock_history (product_id, changed_by, change_type, quantity_change, quantity_before, quantity_after, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, req.user.user_id, change_type, qty, before, after, note || null]
    );

    res.status(201).json({ ...hist.rows[0], product_name: cur.rows[0].name });
  } catch (err) { next(err); }
};

// GET /products/low-stock  — admin: products below threshold
const getLowStock = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const result = await query(
      `SELECT p.product_id, p.name, p.stock_quantity, p.status,
              v.shop_name AS vendor_name, c.name AS category_name
       FROM products p
       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.stock_quantity <= $1
       ORDER BY p.stock_quantity ASC, p.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [threshold, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM products WHERE stock_quantity <= $1', [threshold]);
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit, threshold });
  } catch (err) { next(err); }
};

module.exports = { getStockHistory, adjustStock, getLowStock };
