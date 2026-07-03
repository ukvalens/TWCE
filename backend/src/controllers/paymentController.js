const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');
const { notify } = require('./communicationController');

const getPaymentMethods = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM payment_methods');
    res.json(result.rows);
  } catch (err) { next(err); }
};

const initiatePayment = async (req, res, next) => {
  try {
    const { order_id, method_id } = req.body;
    const order = await query('SELECT * FROM orders WHERE order_id=$1 AND user_id=$2', [order_id, req.user.user_id]);
    if (!order.rows.length) return res.status(404).json({ message: 'Order not found' });
    if (order.rows[0].payment_status === 'paid') return res.status(400).json({ message: 'Order already paid' });

    const transaction_ref = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Upsert payment record (may already exist from order creation)
    let payment;
    const existing = await query('SELECT * FROM payments WHERE order_id=$1 AND status=$2', [order_id, 'pending']);
    if (existing.rows.length) {
      payment = existing;
      await query('UPDATE payments SET method_id=$1 WHERE payment_id=$2', [method_id, existing.rows[0].payment_id]);
    } else {
      payment = await query(
        'INSERT INTO payments (order_id, amount, method_id) VALUES ($1,$2,$3) RETURNING *',
        [order_id, order.rows[0].total_amount, method_id]
      );
    }
    await query('INSERT INTO transactions (payment_id, transaction_ref, status) VALUES ($1,$2,$3)', [payment.rows[0].payment_id, transaction_ref, 'pending']);

    res.status(201).json({ payment: payment.rows[0], transaction_ref, message: 'Payment initiated.' });
  } catch (err) { next(err); }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { transaction_ref } = req.body;
    const txn = await query(
      'SELECT t.*, p.order_id, p.amount, p.payment_id FROM transactions t JOIN payments p ON t.payment_id=p.payment_id WHERE t.transaction_ref=$1',
      [transaction_ref]
    );
    if (!txn.rows.length) return res.status(404).json({ message: 'Transaction not found' });
    if (txn.rows[0].status === 'completed') return res.status(400).json({ message: 'Already verified' });

    await query('UPDATE transactions SET status=$1, gateway_response=$2 WHERE transaction_ref=$3',
      ['completed', JSON.stringify({ verified: true, ts: new Date() }), transaction_ref]);
    await query('UPDATE payments SET status=$1, paid_at=NOW() WHERE payment_id=$2', ['completed', txn.rows[0].payment_id]);
    await query("UPDATE orders SET payment_status='paid', status='confirmed', updated_at=NOW() WHERE order_id=$1", [txn.rows[0].order_id]);

    // Notify vendor(s) of new paid order
    const vendorItems = await query(
      `SELECT DISTINCT v.user_id AS vendor_user_id, u.full_name AS customer_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN vendors v ON p.vendor_id = v.vendor_id
       JOIN orders o ON oi.order_id = o.order_id
       JOIN users u ON o.user_id = u.user_id
       WHERE oi.order_id=$1`,
      [txn.rows[0].order_id]
    );
    for (const row of vendorItems.rows) {
      notify(row.vendor_user_id, 'New Paid Order', `${row.customer_name} completed payment for order ${txn.rows[0].order_id.slice(0,8)}`, 'order');
    }

    // Notify customer
    const orderRow = await query('SELECT user_id FROM orders WHERE order_id=$1', [txn.rows[0].order_id]);
    if (orderRow.rows.length) {
      notify(orderRow.rows[0].user_id, 'Payment Confirmed', `Your payment of ${txn.rows[0].amount} was successful. Order confirmed!`, 'payment');
    }

    res.json({ message: 'Payment verified successfully', payment_id: txn.rows[0].payment_id });
  } catch (err) { next(err); }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const result = await query(
      `SELECT p.*, pm.method_name, o.total_amount, o.status AS order_status, i.invoice_number,
              t.transaction_ref
       FROM payments p
       JOIN payment_methods pm ON p.method_id=pm.method_id
       JOIN orders o ON p.order_id=o.order_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       LEFT JOIN transactions t ON t.payment_id=p.payment_id AND t.status='completed'
       WHERE o.user_id=$1 ORDER BY p.paid_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
      [req.user.user_id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// Payment slip for a single payment (customer or vendor)
const getPaymentSlip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT p.*, pm.method_name, o.total_amount, o.status AS order_status, o.created_at AS order_date,
              i.invoice_number, t.transaction_ref,
              u.full_name AS customer_name, u.email AS customer_email,
              a.street, a.city, a.country,
              json_agg(json_build_object('name', pr.name, 'qty', oi.quantity, 'price', oi.price)) AS items
       FROM payments p
       JOIN payment_methods pm ON p.method_id=pm.method_id
       JOIN orders o ON p.order_id=o.order_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       LEFT JOIN transactions t ON t.payment_id=p.payment_id AND t.status='completed'
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN user_addresses a ON o.address_id=a.address_id
       LEFT JOIN order_items oi ON oi.order_id=o.order_id
       LEFT JOIN products pr ON pr.product_id=oi.product_id
       WHERE p.payment_id=$1
       GROUP BY p.payment_id, pm.method_name, o.total_amount, o.status, o.created_at,
                i.invoice_number, t.transaction_ref, u.full_name, u.email,
                a.street, a.city, a.country`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Payment not found' });

    const slip = result.rows[0];
    // Access check: customer owns order, vendor has item in order, or admin
    if (req.user.role_id >= 3) {
      const orderCheck = await query('SELECT user_id FROM orders WHERE order_id=$1', [slip.order_id]);
      const isOwner = orderCheck.rows[0]?.user_id === req.user.user_id;
      if (!isOwner && req.user.role_id !== 2) return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(slip);
  } catch (err) { next(err); }
};

// Vendor's own payments (orders containing their products)
const getVendorPayments = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(404).json({ message: 'Vendor not found' });
    const vendorId = vendor.rows[0].vendor_id;

    const result = await query(
      `SELECT DISTINCT p.payment_id, p.order_id, p.amount, p.status, p.paid_at, p.method_id,
              pm.method_name, o.total_amount, o.created_at AS order_date,
              u.full_name AS customer_name, u.email AS customer_email,
              i.invoice_number, t.transaction_ref
       FROM payments p
       JOIN orders o ON p.order_id=o.order_id
       JOIN order_items oi ON oi.order_id=o.order_id
       JOIN products pr ON oi.product_id=pr.product_id AND pr.vendor_id=$1
       JOIN users u ON o.user_id=u.user_id
       JOIN payment_methods pm ON p.method_id=pm.method_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       LEFT JOIN transactions t ON t.payment_id=p.payment_id AND t.status='completed'
       ORDER BY p.paid_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
      [vendorId, limit, offset]
    );
    const count = await query(
      `SELECT COUNT(DISTINCT p.payment_id) FROM payments p
       JOIN orders o ON p.order_id=o.order_id
       JOIN order_items oi ON oi.order_id=o.order_id
       JOIN products pr ON oi.product_id=pr.product_id AND pr.vendor_id=$1`,
      [vendorId]
    );
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

const getAllPayments = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;
    const params = [];
    const conditions = [];
    if (status) { params.push(status); conditions.push(`p.status = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT p.*, pm.method_name, u.full_name, u.email, i.invoice_number, t.transaction_ref
       FROM payments p
       JOIN payment_methods pm ON p.method_id=pm.method_id
       JOIN orders o ON p.order_id=o.order_id
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       LEFT JOIN transactions t ON t.payment_id=p.payment_id AND t.status='completed'
       ${where}
       ORDER BY p.paid_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countRes = await query(
      `SELECT COUNT(*) FROM payments p JOIN orders o ON p.order_id=o.order_id JOIN users u ON o.user_id=u.user_id ${where}`,
      params.slice(0, -2)
    );
    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

const getRevenueStats = async (req, res, next) => {
  try {
    const [totalRev, monthRev, todayRev, byMethod, daily, vendorRev] = await Promise.all([
      query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='completed'"),
      query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='completed' AND DATE_TRUNC('month',paid_at)=DATE_TRUNC('month',NOW())"),
      query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='completed' AND paid_at::date=CURRENT_DATE"),
      query(`SELECT pm.method_name, COUNT(*) AS count, COALESCE(SUM(p.amount),0) AS revenue
             FROM payments p JOIN payment_methods pm ON p.method_id=pm.method_id
             WHERE p.status='completed' GROUP BY pm.method_name ORDER BY revenue DESC`),
      query(`SELECT DATE(paid_at) AS day, COALESCE(SUM(amount),0) AS revenue
             FROM payments WHERE status='completed' AND paid_at >= NOW() - INTERVAL '30 days'
             GROUP BY day ORDER BY day`),
      query(`SELECT v.shop_name, COALESCE(SUM(oi.price * oi.quantity),0) AS revenue, COUNT(DISTINCT o.order_id) AS orders
             FROM vendors v
             JOIN products pr ON pr.vendor_id=v.vendor_id
             JOIN order_items oi ON oi.product_id=pr.product_id
             JOIN orders o ON oi.order_id=o.order_id
             WHERE o.payment_status='paid'
             GROUP BY v.shop_name ORDER BY revenue DESC LIMIT 10`),
    ]);
    res.json({
      total_revenue: parseFloat(totalRev.rows[0].total),
      month_revenue: parseFloat(monthRev.rows[0].total),
      today_revenue: parseFloat(todayRev.rows[0].total),
      by_method: byMethod.rows,
      daily_30days: daily.rows,
      vendor_revenue: vendorRev.rows,
    });
  } catch (err) { next(err); }
};

const refundPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await query('SELECT * FROM payments WHERE payment_id=$1', [id]);
    if (!payment.rows.length) return res.status(404).json({ message: 'Payment not found' });
    if (payment.rows[0].status !== 'completed') return res.status(400).json({ message: 'Only completed payments can be refunded' });

    await query('UPDATE payments SET status=$1 WHERE payment_id=$2', ['refunded', id]);
    await query("UPDATE orders SET payment_status='refunded', updated_at=NOW() WHERE order_id=$1", [payment.rows[0].order_id]);

    // Notify customer
    const order = await query('SELECT user_id FROM orders WHERE order_id=$1', [payment.rows[0].order_id]);
    if (order.rows.length) notify(order.rows[0].user_id, 'Payment Refunded', `Your payment of ${payment.rows[0].amount} has been refunded.`, 'payment');

    res.json({ message: 'Payment refunded' });
  } catch (err) { next(err); }
};

const markPaymentCompleted = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await query('SELECT * FROM payments WHERE payment_id=$1', [id]);
    if (!payment.rows.length) return res.status(404).json({ message: 'Payment not found' });
    if (payment.rows[0].status === 'completed') return res.status(400).json({ message: 'Already completed' });
    await query("UPDATE payments SET status='completed', paid_at=NOW() WHERE payment_id=$1", [id]);
    await query("UPDATE orders SET payment_status='paid', status='confirmed', updated_at=NOW() WHERE order_id=$1", [payment.rows[0].order_id]);
    const order = await query('SELECT user_id FROM orders WHERE order_id=$1', [payment.rows[0].order_id]);
    if (order.rows.length) notify(order.rows[0].user_id, 'Payment Confirmed', `Your payment has been confirmed by admin.`, 'payment');
    res.json({ message: 'Payment marked as completed' });
  } catch (err) { next(err); }
};

const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await query('SELECT * FROM payments WHERE payment_id=$1', [id]);
    if (!payment.rows.length) return res.status(404).json({ message: 'Payment not found' });
    if (payment.rows[0].status === 'completed') return res.status(400).json({ message: 'Cannot delete a completed payment' });
    await query('DELETE FROM transactions WHERE payment_id=$1', [id]);
    await query('DELETE FROM payments WHERE payment_id=$1', [id]);
    res.json({ message: 'Payment deleted' });
  } catch (err) { next(err); }
};

module.exports = { getPaymentMethods, initiatePayment, verifyPayment, getPaymentHistory, getPaymentSlip, getVendorPayments, getAllPayments, getRevenueStats, refundPayment, markPaymentCompleted, deletePayment };
