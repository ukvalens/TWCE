const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');
const { notify } = require('./communicationController');

// ─── Warranties (Vendor) ───────────────────────────────────

// Vendor: create or update warranty for one of their products
const createVendorWarranty = async (req, res, next) => {
  try {
    const { product_id, duration_months, terms } = req.body;
    if (!product_id || !duration_months)
      return res.status(400).json({ message: 'product_id and duration_months are required' });

    // Verify the product belongs to this vendor
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
    const vid = vendor.rows[0].vendor_id;

    const product = await query(
      'SELECT product_id FROM products WHERE product_id=$1 AND vendor_id=$2',
      [product_id, vid]
    );
    if (!product.rows.length)
      return res.status(403).json({ message: 'Product not found or does not belong to your store' });

    // Upsert: if warranty already exists for this product, update it
    const existing = await query('SELECT warranty_id FROM warranties WHERE product_id=$1', [product_id]);
    let result;
    if (existing.rows.length) {
      result = await query(
        'UPDATE warranties SET duration_months=$1, terms=$2 WHERE product_id=$3 RETURNING *',
        [duration_months, terms || null, product_id]
      );
    } else {
      result = await query(
        'INSERT INTO warranties (product_id, duration_months, terms) VALUES ($1,$2,$3) RETURNING *',
        [product_id, duration_months, terms || null]
      );
    }
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// Vendor: list warranties for all their products
const getVendorWarranties = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
    const vid = vendor.rows[0].vendor_id;

    const result = await query(
      `SELECT w.*, p.name AS product_name, p.product_id,
              COUNT(wr.registration_id) AS registered_count
       FROM warranties w
       JOIN products p ON w.product_id = p.product_id
       LEFT JOIN warranty_registrations wr ON wr.warranty_id = w.warranty_id
       WHERE p.vendor_id = $1
       GROUP BY w.warranty_id, p.name, p.product_id
       ORDER BY p.name`,
      [vid]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Vendor: list their products (to pick from when adding warranty)
const getVendorProducts = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
    const vid = vendor.rows[0].vendor_id;

    const result = await query(
      `SELECT p.product_id, p.name,
              CASE WHEN w.warranty_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_warranty
       FROM products p
       LEFT JOIN warranties w ON w.product_id = p.product_id
       WHERE p.vendor_id = $1 AND p.status != 'rejected'
       ORDER BY p.name`,
      [vid]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Vendor: delete warranty for one of their products
const deleteVendorWarranty = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
    const vid = vendor.rows[0].vendor_id;

    const warranty = await query(
      `SELECT w.warranty_id FROM warranties w
       JOIN products p ON w.product_id = p.product_id
       WHERE w.warranty_id=$1 AND p.vendor_id=$2`,
      [req.params.id, vid]
    );
    if (!warranty.rows.length)
      return res.status(404).json({ message: 'Warranty not found or access denied' });

    await query('DELETE FROM warranties WHERE warranty_id=$1', [req.params.id]);
    res.json({ message: 'Warranty removed' });
  } catch (err) { next(err); }
};

// ─── Warranties (Admin) ────────────────────────────────────
const createWarranty = async (req, res, next) => {
  try {
    const { product_id, duration_months, terms } = req.body;
    const result = await query(
      'INSERT INTO warranties (product_id, duration_months, terms) VALUES ($1,$2,$3) RETURNING *',
      [product_id, duration_months, terms]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ─── Warranties (Customer) ─────────────────────────────────

// Customer: view all warranties for products they have purchased
// Warranties are automatically matched — no manual registration needed
const getMyWarranties = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         oi.order_item_id,
         o.order_id,
         o.created_at   AS purchase_date,
         p.product_id,
         p.name         AS product_name,
         w.warranty_id,
         w.duration_months,
         w.terms,
         (o.created_at::date + (w.duration_months || ' months')::interval)::date AS expiry_date
       FROM order_items oi
       JOIN orders o       ON o.order_id = oi.order_id
       JOIN products p     ON p.product_id = oi.product_id
       JOIN warranties w   ON w.product_id = oi.product_id
       WHERE o.user_id = $1
         AND o.status NOT IN ('cancelled')
         AND o.payment_status = 'paid'
       ORDER BY o.created_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const registerWarranty = async (req, res, next) => {
  try {
    const { warranty_id, order_item_id, purchase_date } = req.body;
    const warranty = await query('SELECT * FROM warranties WHERE warranty_id=$1', [warranty_id]);
    if (!warranty.rows.length) return res.status(404).json({ message: 'Warranty not found' });
    const expiry = new Date(purchase_date);
    expiry.setMonth(expiry.getMonth() + warranty.rows[0].duration_months);
    const result = await query(
      'INSERT INTO warranty_registrations (warranty_id, user_id, order_item_id, purchase_date, expiry_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [warranty_id, req.user.user_id, order_item_id, purchase_date, expiry.toISOString().split('T')[0]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ─── Repair Requests ────────────────────────────────────────
const submitRepairRequest = async (req, res, next) => {
  try {
    const { product_id, issue_description, device_name, serial_number, priority } = req.body;
    if (!issue_description || issue_description.trim().length < 10)
      return res.status(400).json({ message: 'Please describe the issue in at least 10 characters' });

    // Allow free-text product name if product_id not provided
    let resolvedProductId = product_id || null;
    if (device_name && !product_id) {
      // Try to find by name
      const found = await query('SELECT product_id FROM products WHERE LOWER(name) ILIKE $1 LIMIT 1', [`%${device_name}%`]);
      if (found.rows.length) resolvedProductId = found.rows[0].product_id;
    }
    if (!resolvedProductId) return res.status(400).json({ message: 'Please select a product from your orders or enter a valid product name' });

    const result = await query(
      `INSERT INTO repair_requests (user_id, product_id, issue_description, status)
       VALUES ($1,$2,$3,'pending') RETURNING *`,
      [req.user.user_id, resolvedProductId, issue_description.trim()]
    );

    // Notify admin/support
    const admins = await query("SELECT user_id FROM users WHERE role_id IN (1,4) AND status='active'");
    for (const a of admins.rows) {
      notify(a.user_id, 'New Repair Request', `A new repair request has been submitted by ${req.user.full_name}.`, 'repair');
    }

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const getMyRepairRequests = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.*, p.name AS product_name,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS product_image,
              tech.full_name AS technician_name
       FROM repair_requests rr
       JOIN products p ON rr.product_id=p.product_id
       LEFT JOIN users tech ON tech.user_id=rr.assigned_to
       WHERE rr.user_id=$1 ORDER BY rr.created_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getRepairById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.*, p.name AS product_name, u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS product_image,
              tech.full_name AS technician_name, tech.email AS technician_email
       FROM repair_requests rr
       JOIN products p ON rr.product_id=p.product_id
       JOIN users u ON rr.user_id=u.user_id
       LEFT JOIN users tech ON tech.user_id=rr.assigned_to
       WHERE rr.request_id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Repair request not found' });
    // customer can only see their own
    if (req.user.role_id === 3 && result.rows[0].user_id !== req.user.user_id)
      return res.status(403).json({ message: 'Forbidden' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateRepairStatus = async (req, res, next) => {
  try {
    const { status, admin_notes, estimated_cost, assigned_to } = req.body;
    const allowed = ['pending', 'in_review', 'in_repair', 'completed', 'rejected'];
    if (status && !allowed.includes(status))
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });

    const existing = await query('SELECT * FROM repair_requests WHERE request_id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Repair request not found' });

    const fields = [];
    const vals   = [];
    if (status)         { vals.push(status);         fields.push(`status=$${vals.length}`); }
    if (admin_notes !== undefined) { vals.push(admin_notes);    fields.push(`admin_notes=$${vals.length}`); }
    if (estimated_cost !== undefined) { vals.push(estimated_cost); fields.push(`estimated_cost=$${vals.length}`); }
    if (assigned_to !== undefined) { vals.push(assigned_to || null); fields.push(`assigned_to=$${vals.length}`); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });

    vals.push(req.params.id);
    const result = await query(
      `UPDATE repair_requests SET ${fields.join(',')}, updated_at=NOW() WHERE request_id=$${vals.length} RETURNING *`,
      vals
    );

    // Notify customer of status change
    const rep = existing.rows[0];
    if (status && status !== rep.status) {
      const msg = {
        in_review:  'Your repair request is now under review by our team.',
        in_repair:  'Your device is currently being repaired by our technician.',
        completed:  'Great news! Your device repair has been completed. Please collect it.',
        rejected:   'Unfortunately your repair request could not be fulfilled. Please contact support.',
      }[status] || `Your repair request status changed to: ${status}`;
      notify(rep.user_id, 'Repair Update', msg, 'repair');
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getAllRepairRequests = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`rr.status=$${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const result = await query(
      `SELECT rr.*, u.full_name, u.email, u.phone, p.name AS product_name,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS product_image,
              tech.full_name AS technician_name
       FROM repair_requests rr
       JOIN users u ON rr.user_id=u.user_id
       JOIN products p ON rr.product_id=p.product_id
       LEFT JOIN users tech ON tech.user_id=rr.assigned_to
       ${where}
       ORDER BY rr.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const countRes = await query(
      `SELECT COUNT(*) FROM repair_requests rr
       JOIN users u ON rr.user_id=u.user_id
       JOIN products p ON rr.product_id=p.product_id ${where}`,
      params.slice(0,-2)
    );
    const stats = await query(
      `SELECT status, COUNT(*) AS count FROM repair_requests GROUP BY status`
    );
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page, limit, stats: stats.rows });
  } catch (err) { next(err); }
};

const deleteRepairRequest = async (req, res, next) => {
  try {
    const rep = await query('SELECT * FROM repair_requests WHERE request_id=$1', [req.params.id]);
    if (!rep.rows.length) return res.status(404).json({ message: 'Not found' });
    // Customer can only delete their own pending requests
    if (req.user.role_id === 3) {
      if (rep.rows[0].user_id !== req.user.user_id) return res.status(403).json({ message: 'Forbidden' });
      if (rep.rows[0].status !== 'pending') return res.status(400).json({ message: 'Cannot cancel a request that is already in progress' });
    }
    await query('DELETE FROM repair_requests WHERE request_id=$1', [req.params.id]);
    res.json({ message: 'Repair request cancelled' });
  } catch (err) { next(err); }
};

const getRepairStats = async (req, res, next) => {
  try {
    const [total, pending, inRepair, completed, rejected] = await Promise.all([
      query('SELECT COUNT(*) FROM repair_requests'),
      query("SELECT COUNT(*) FROM repair_requests WHERE status='pending'"),
      query("SELECT COUNT(*) FROM repair_requests WHERE status='in_repair'"),
      query("SELECT COUNT(*) FROM repair_requests WHERE status='completed'"),
      query("SELECT COUNT(*) FROM repair_requests WHERE status='rejected'"),
    ]);
    res.json({
      total:     parseInt(total.rows[0].count),
      pending:   parseInt(pending.rows[0].count),
      in_repair: parseInt(inRepair.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      rejected:  parseInt(rejected.rows[0].count),
    });
  } catch (err) { next(err); }
};

// ─── Returns & Refunds ─────────────────────────────────────
const submitReturnRequest = async (req, res, next) => {
  try {
    const { order_id, reason } = req.body;
    const order = await query('SELECT * FROM orders WHERE order_id=$1 AND user_id=$2', [order_id, req.user.user_id]);
    if (!order.rows.length) return res.status(404).json({ message: 'Order not found' });
    if (order.rows[0].status !== 'delivered') return res.status(400).json({ message: 'Only delivered orders can be returned' });

    const existing = await query('SELECT return_id FROM return_requests WHERE order_id=$1', [order_id]);
    if (existing.rows.length) return res.status(409).json({ message: 'A return request already exists for this order' });

    const result = await query(
      'INSERT INTO return_requests (order_id, user_id, reason) VALUES ($1,$2,$3) RETURNING *',
      [order_id, req.user.user_id, reason]
    );

    // Notify vendor(s) whose products are in this order
    const vendors = await query(
      `SELECT DISTINCT v.user_id AS vendor_user_id, v.shop_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN vendors v ON p.vendor_id = v.vendor_id
       WHERE oi.order_id = $1`,
      [order_id]
    );
    for (const v of vendors.rows) {
      notify(v.vendor_user_id, 'Return Request Received',
        `A customer has submitted a return request for order #${order_id.slice(0, 8).toUpperCase()}. Please review it.`,
        'return'
      );
    }

    // Notify admin
    const admins = await query("SELECT user_id FROM users WHERE role_id=1 AND status='active'");
    for (const a of admins.rows) {
      notify(a.user_id, 'New Return Request',
        `Customer ${req.user.full_name} submitted a return for order #${order_id.slice(0, 8).toUpperCase()}.`,
        'return'
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateReturnStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const existing = await query(
      `SELECT rr.*, o.total_amount FROM return_requests rr JOIN orders o ON rr.order_id=o.order_id WHERE rr.return_id=$1`,
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Return request not found' });
    const ret = existing.rows[0];

    const result = await query('UPDATE return_requests SET status=$1 WHERE return_id=$2 RETURNING *', [status, req.params.id]);

    if (status === 'approved') {
      const payment = await query(
        'SELECT p.payment_id, p.amount FROM payments p WHERE p.order_id=$1',
        [ret.order_id]
      );
      if (payment.rows.length) {
        await query('INSERT INTO refunds (payment_id, return_id, amount) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [payment.rows[0].payment_id, req.params.id, payment.rows[0].amount]);
      }
    }

    // Notify customer
    const msg = {
      approved:   'Your return request has been approved. A refund will be processed shortly.',
      rejected:   'Your return request has been reviewed and unfortunately could not be approved.',
      completed:  'Your return has been completed and your refund has been processed.',
    }[status] || `Your return request status has been updated to: ${status}`;
    notify(ret.user_id, 'Return Request Update', msg, 'return');

    // Notify vendor(s)
    const vendors = await query(
      `SELECT DISTINCT v.user_id AS vendor_user_id FROM order_items oi
       JOIN products p ON oi.product_id=p.product_id
       JOIN vendors v ON p.vendor_id=v.vendor_id
       WHERE oi.order_id=$1`, [ret.order_id]
    );
    for (const v of vendors.rows) {
      notify(v.vendor_user_id, 'Return Status Updated',
        `Return for order #${ret.order_id.slice(0, 8).toUpperCase()} has been marked as "${status}".`,
        'return'
      );
    }

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getMyReturnRequests = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.*, o.total_amount, i.invoice_number,
              json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) AS items
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.order_id
       LEFT JOIN invoices i ON i.order_id = o.order_id
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN products p ON p.product_id = oi.product_id
       WHERE rr.user_id = $1
       GROUP BY rr.return_id, o.total_amount, i.invoice_number
       ORDER BY rr.created_at DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Vendor: returns for orders containing their products
const getVendorReturnRequests = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
    const vid = vendor.rows[0].vendor_id;

    const result = await query(
      `SELECT rr.*, o.total_amount, i.invoice_number,
              u.full_name AS customer_name, u.email AS customer_email,
              json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) AS items
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.order_id
       JOIN users u ON rr.user_id = u.user_id
       LEFT JOIN invoices i ON i.order_id = o.order_id
       JOIN order_items oi ON oi.order_id = o.order_id
       JOIN products p ON p.product_id = oi.product_id AND p.vendor_id = $1
       GROUP BY rr.return_id, o.total_amount, i.invoice_number, u.full_name, u.email
       ORDER BY rr.created_at DESC`,
      [vid]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getAllReturnRequests = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rr.*, o.total_amount, i.invoice_number,
              u.full_name AS customer_name, u.email AS customer_email,
              json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) AS items
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.order_id
       JOIN users u ON rr.user_id = u.user_id
       LEFT JOIN invoices i ON i.order_id = o.order_id
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN products p ON p.product_id = oi.product_id
       GROUP BY rr.return_id, o.total_amount, i.invoice_number, u.full_name, u.email
       ORDER BY rr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

module.exports = {
  createWarranty, createVendorWarranty, getVendorWarranties, getVendorProducts, deleteVendorWarranty,
  registerWarranty, getMyWarranties,
  submitRepairRequest, getMyRepairRequests, getRepairById, updateRepairStatus,
  getAllRepairRequests, deleteRepairRequest, getRepairStats,
  submitReturnRequest, getMyReturnRequests, getVendorReturnRequests, updateReturnStatus, getAllReturnRequests,
};
