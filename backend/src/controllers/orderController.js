const { query } = require('../config/db');
const { paginate, generateInvoiceNumber } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/email');

const createOrder = async (req, res, next) => {
  const client = require('../config/db').pool;
  const conn = await client.connect();
  try {
    const { address_id, payment_method_id, coupon_code, notes } = req.body;
    const pmId = payment_method_id ? parseInt(payment_method_id) : null;

    // Get cart items
    const cart = await conn.query('SELECT cart_id FROM carts WHERE user_id=$1', [req.user.user_id]);
    if (!cart.rows.length) return res.status(400).json({ message: 'Cart is empty' });

    const items = await conn.query(
      `SELECT ci.*, p.price, p.discount_price, p.stock_quantity, p.name
       FROM cart_items ci JOIN products p ON ci.product_id=p.product_id
       WHERE ci.cart_id=$1`,
      [cart.rows[0].cart_id]
    );
    if (!items.rows.length) return res.status(400).json({ message: 'Cart is empty' });

    // Check stock
    for (const item of items.rows) {
      if (item.stock_quantity < item.quantity)
        return res.status(400).json({ message: `Insufficient stock for ${item.name}` });
    }

    await conn.query('BEGIN');

    // Calculate total
    let total = items.rows.reduce((sum, item) => {
      const price = parseFloat(item.discount_price || item.price);
      return sum + price * item.quantity;
    }, 0);

    let discount = 0;
    let couponId = null;
    if (coupon_code) {
      const coupon = await conn.query(
        `SELECT * FROM coupons WHERE code=$1 AND is_active=TRUE AND (expiry_date IS NULL OR expiry_date >= NOW())
         AND (max_uses IS NULL OR used_count < max_uses)`,
        [coupon_code]
      );
      if (coupon.rows.length && total >= parseFloat(coupon.rows[0].min_order_amount)) {
        const c = coupon.rows[0];
        discount = c.discount_type === 'percentage' ? (total * c.value) / 100 : c.value;
        total -= discount;
        couponId = c.coupon_id;
        await conn.query('UPDATE coupons SET used_count=used_count+1 WHERE coupon_id=$1', [c.coupon_id]);
      }
    }

    const order = await conn.query(
      `INSERT INTO orders (user_id, address_id, total_amount, discount_amount, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.user_id, address_id, total.toFixed(2), discount.toFixed(2), notes]
    );
    const orderId = order.rows[0].order_id;

    // Insert order items, update stock, auto-deactivate if sold out
    for (const item of items.rows) {
      const price = parseFloat(item.discount_price || item.price);
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price) VALUES ($1,$2,$3,$4,$5)',
        [orderId, item.product_id, item.variant_id, item.quantity, price]
      );
      const newStock = item.stock_quantity - item.quantity;
      await conn.query(
        `UPDATE products SET stock_quantity=$1, status=CASE WHEN $1 <= 0 THEN 'inactive' ELSE status END, updated_at=NOW() WHERE product_id=$2`,
        [newStock, item.product_id]
      );
      // Notify vendor their product sold out
      if (newStock <= 0) {
        const vRow = await conn.query('SELECT v.user_id FROM products p JOIN vendors v ON p.vendor_id=v.vendor_id WHERE p.product_id=$1', [item.product_id]);
        if (vRow.rows.length) {
          query('INSERT INTO notifications (user_id,title,message,type) VALUES ($1,$2,$3,$4)',
            [vRow.rows[0].user_id, 'Product Sold Out', `"${item.name}" is now out of stock and has been deactivated from the store.`, 'product']).catch(()=>{});
        }
      }
    }

    // Create payment record
    const payment = await conn.query(
      'INSERT INTO payments (order_id, amount, method_id) VALUES ($1,$2,$3) RETURNING *',
      [orderId, total.toFixed(2), pmId]
    );

    // Generate invoice
    await conn.query('INSERT INTO invoices (order_id, invoice_number) VALUES ($1,$2)', [orderId, generateInvoiceNumber()]);

    // Log coupon usage
    if (couponId) {
      await conn.query('INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES ($1,$2,$3)', [couponId, req.user.user_id, orderId]);
    }

    // Earn loyalty points (10 per dollar)
    const pts = Math.floor(total * 10);
    await conn.query('UPDATE loyalty_points SET points=points+$1, updated_at=NOW() WHERE user_id=$2', [pts, req.user.user_id]);
    await conn.query('INSERT INTO loyalty_transactions (user_id, points, type, reference) VALUES ($1,$2,$3,$4)', [req.user.user_id, pts, 'earned', orderId]);

    // Status history
    await conn.query('INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1,$2,$3)', [orderId, 'pending', req.user.user_id]);

    // Clear cart
    await conn.query('DELETE FROM cart_items WHERE cart_id=$1', [cart.rows[0].cart_id]);

    await conn.query('COMMIT');

    // Send email
    const user = await query('SELECT email FROM users WHERE user_id=$1', [req.user.user_id]);
    sendEmail({ to: user.rows[0].email, ...emailTemplates.orderConfirmation(orderId) }).catch(() => {});

    // Notify customer
    query('INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
      [req.user.user_id, 'Order Placed', `Your order has been placed. Complete payment to confirm.`, 'order']).catch(() => {});

    // Notify vendor(s) — new order received
    const vendorNotify = await query(
      `SELECT DISTINCT v.user_id AS vendor_user_id FROM order_items oi
       JOIN products p ON oi.product_id=p.product_id
       JOIN vendors v ON p.vendor_id=v.vendor_id
       WHERE oi.order_id=$1`, [orderId]
    );
    for (const vr of vendorNotify.rows) {
      query('INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
        [vr.vendor_user_id, 'New Order Received', `A new order #${orderId.slice(0,8)} has been placed and is awaiting payment.`, 'order']).catch(() => {});
    }

    res.status(201).json({ order: order.rows[0], payment: payment.rows[0] });
  } catch (err) {
    await conn.query('ROLLBACK');
    next(err);
  } finally {
    conn.release();
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const result = await query(
      `SELECT o.*, i.invoice_number FROM orders o LEFT JOIN invoices i ON o.order_id=i.order_id
       WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.user_id, limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM orders WHERE user_id=$1', [req.user.user_id]);
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await query(
      `SELECT o.*, i.invoice_number FROM orders o LEFT JOIN invoices i ON o.order_id=i.order_id
       WHERE o.order_id=$1 AND (o.user_id=$2 OR $3=TRUE)`,
      [req.params.id, req.user.user_id, req.user.role_id <= 2]
    );
    if (!order.rows.length) return res.status(404).json({ message: 'Order not found' });

    const [items, history, delivery] = await Promise.all([
      query(`SELECT oi.*, p.name, (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
             FROM order_items oi JOIN products p ON oi.product_id=p.product_id WHERE oi.order_id=$1`, [req.params.id]),
      query('SELECT * FROM order_status_history WHERE order_id=$1 ORDER BY changed_at', [req.params.id]),
      query('SELECT * FROM deliveries WHERE order_id=$1', [req.params.id]),
    ]);

    res.json({ ...order.rows[0], items: items.rows, history: history.rows, delivery: delivery.rows[0] });
  } catch (err) { next(err); }
};

const cancelOrder = async (req, res, next) => {
  try {
    let order;
    if (req.user.role_id === 2) {
      // Vendor: can cancel orders that contain their products
      const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
      order = await query(
        `SELECT * FROM orders WHERE order_id=$1
         AND order_id IN (SELECT DISTINCT oi.order_id FROM order_items oi
           JOIN products p ON oi.product_id=p.product_id WHERE p.vendor_id=$2)`,
        [req.params.id, vendor.rows[0].vendor_id]
      );
    } else {
      order = await query('SELECT * FROM orders WHERE order_id=$1 AND user_id=$2', [req.params.id, req.user.user_id]);
    }
    if (!order.rows.length) return res.status(404).json({ message: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.rows[0].status))
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });

    await query("UPDATE orders SET status='cancelled', updated_at=NOW() WHERE order_id=$1", [req.params.id]);
    await query('INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1,$2,$3)', [req.params.id, 'cancelled', req.user.user_id]);

    // Restore stock and reactivate if product was deactivated due to zero stock
    const items = await query('SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id=p.product_id WHERE oi.order_id=$1', [req.params.id]);
    for (const item of items.rows) {
      await query(
        `UPDATE products SET stock_quantity=stock_quantity+$1,
         status=CASE WHEN status='inactive' AND stock_quantity+$1 > 0 THEN 'active' ELSE status END,
         updated_at=NOW() WHERE product_id=$2`,
        [item.quantity, item.product_id]
      );
    }
    res.json({ message: 'Order cancelled' });
  } catch (err) { next(err); }
};

// Admin/Vendor — scoped by role
const getAllOrders = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, payment_status, search } = req.query;
    const params = [];
    const conditions = [];

    // Vendor: only orders that contain their products
    if (req.user.role_id === 2) {
      const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
      if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });
      params.push(vendor.rows[0].vendor_id);
      conditions.push(`o.order_id IN (SELECT DISTINCT oi.order_id FROM order_items oi JOIN products p ON oi.product_id=p.product_id WHERE p.vendor_id=$${params.length})`);
    }

    if (status)         { params.push(status);         conditions.push(`o.status=$${params.length}`); }
    if (payment_status) { params.push(payment_status); conditions.push(`o.payment_status=$${params.length}`); }
    if (search)         { params.push(`%${search}%`);  conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR i.invoice_number ILIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT o.*, u.full_name, u.email, u.phone,
              i.invoice_number,
              pay.status AS payment_status_detail, pay.method_id, pay.payment_id, pay.paid_at,
              pm.method_name,
              a.street, a.city, a.country,
              (SELECT COUNT(*) FROM order_items WHERE order_id=o.order_id) AS item_count
       FROM orders o
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       LEFT JOIN payments pay ON pay.order_id=o.order_id
       LEFT JOIN payment_methods pm ON pay.method_id=pm.method_id
       LEFT JOIN user_addresses a ON o.address_id=a.address_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM orders o
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       ${where}`,
      params.slice(0, -2)
    );

    // Stats summary
    const statsParams = params.slice(0, -2); // strip limit/offset
    const statsWhere  = where;
    const stats = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN o.status='pending'   THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN o.status='confirmed' THEN 1 ELSE 0 END) AS confirmed,
         SUM(CASE WHEN o.status='shipped'   THEN 1 ELSE 0 END) AS shipped,
         SUM(CASE WHEN o.status='delivered' THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN o.status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
         COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total_amount ELSE 0 END),0) AS total_revenue
       FROM orders o
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       ${statsWhere}`,
      statsParams
    );

    res.json({
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
      page, limit,
      stats: stats.rows[0],
    });
  } catch (err) { next(err); }
};

// Get single order with full items (vendor-scoped)
const getVendorOrderItems = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(403).json({ message: 'Vendor profile not found' });

    const order = await query(
      `SELECT o.*, u.full_name, u.email, u.phone,
              i.invoice_number,
              pay.status AS pay_status, pay.payment_id, pay.paid_at, pay.amount AS pay_amount, pay.payment_proof,
              pm.method_name,
              a.street, a.city, a.country
       FROM orders o
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN invoices i ON i.order_id=o.order_id
       LEFT JOIN payments pay ON pay.order_id=o.order_id
       LEFT JOIN payment_methods pm ON pay.method_id=pm.method_id
       LEFT JOIN user_addresses a ON o.address_id=a.address_id
       WHERE o.order_id=$1
         AND o.order_id IN (SELECT DISTINCT oi.order_id FROM order_items oi JOIN products p ON oi.product_id=p.product_id WHERE p.vendor_id=$2)`,
      [req.params.id, vendor.rows[0].vendor_id]
    );
    if (!order.rows.length) return res.status(404).json({ message: 'Order not found' });

    const items = await query(
      `SELECT oi.*, p.name, p.discount_price AS original_discount,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
       FROM order_items oi
       JOIN products p ON oi.product_id=p.product_id
       WHERE oi.order_id=$1 AND p.vendor_id=$2`,
      [req.params.id, vendor.rows[0].vendor_id]
    );

    const history = await query(
      'SELECT * FROM order_status_history WHERE order_id=$1 ORDER BY changed_at',
      [req.params.id]
    );

    res.json({ ...order.rows[0], items: items.rows, history: history.rows });
  } catch (err) { next(err); }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    await query("UPDATE orders SET status=$1, updated_at=NOW() WHERE order_id=$2", [status, req.params.id]);
    await query('INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES ($1,$2,$3,$4)', [req.params.id, status, note, req.user.user_id]);

    // Notify customer
    const order = await query('SELECT user_id FROM orders WHERE order_id=$1', [req.params.id]);
    query('INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
      [order.rows[0].user_id, 'Order Update', `Your order status has been updated to: ${status}`, 'order']).catch(() => {});

    res.json({ message: 'Order status updated' });
  } catch (err) { next(err); }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder, getAllOrders, getVendorOrderItems, updateOrderStatus };
