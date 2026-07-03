const { query } = require('../config/db');

// Basic collaborative + content-based recommendation
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    // Get recently viewed categories
    const viewed = await query(
      `SELECT DISTINCT p.category_id FROM product_views pv JOIN products p ON pv.product_id=p.product_id
       WHERE pv.user_id=$1 ORDER BY MAX(pv.viewed_at) DESC LIMIT 5`,
      [userId]
    );

    let products;
    if (viewed.rows.length) {
      const catIds = viewed.rows.map((r) => r.category_id);
      const placeholders = catIds.map((_, i) => `$${i + 1}`).join(',');
      products = await query(
        `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
         FROM products p WHERE p.category_id IN (${placeholders}) AND p.status='active'
         ORDER BY p.created_at DESC LIMIT 12`,
        catIds
      );
    } else {
      // Fallback: newest products
      products = await query(
        `SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
         FROM products p WHERE p.status='active' ORDER BY p.created_at DESC LIMIT 12`
      );
    }

    res.json(products.rows);
  } catch (err) { next(err); }
};

const getRecentlyViewed = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (p.product_id) p.*, MAX(pv.viewed_at) AS last_viewed,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image
       FROM product_views pv JOIN products p ON pv.product_id=p.product_id
       WHERE pv.user_id=$1 GROUP BY p.product_id ORDER BY p.product_id, last_viewed DESC LIMIT 10`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const smartSearch = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query required' });

    const offset = (page - 1) * limit;

    // Log search
    if (req.user) {
      query('INSERT INTO search_history (user_id, query) VALUES ($1,$2)', [req.user.user_id, q]).catch(() => {});
    }

    const result = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name,
              (SELECT image_url FROM product_images WHERE product_id=p.product_id AND is_primary=TRUE LIMIT 1) AS image,
              ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description,'')), plainto_tsquery('english', $1)) AS rank
       FROM products p
       LEFT JOIN categories c ON p.category_id=c.category_id
       LEFT JOIN brands b ON p.brand_id=b.brand_id
       WHERE p.status='active' AND (
         to_tsvector('english', p.name || ' ' || COALESCE(p.description,'')) @@ plainto_tsquery('english', $1)
         OR p.name ILIKE $2
       )
       ORDER BY rank DESC LIMIT $3 OFFSET $4`,
      [q, `%${q}%`, limit, offset]
    );

    res.json({ results: result.rows, query: q });
  } catch (err) { next(err); }
};

const detectFraud = async (req, res, next) => {
  try {
    // Simple rule-based fraud detection
    const { user_id, order_id } = req.body;
    const flags = [];

    // Check multiple orders in short time
    const recentOrders = await query(
      `SELECT COUNT(*) FROM orders WHERE user_id=$1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [user_id]
    );
    if (parseInt(recentOrders.rows[0].count) > 5) flags.push('Multiple orders in 1 hour');

    if (flags.length) {
      await query('INSERT INTO fraud_logs (user_id, reason) VALUES ($1,$2)', [user_id, flags.join('; ')]);
      return res.json({ flagged: true, reasons: flags });
    }
    res.json({ flagged: false });
  } catch (err) { next(err); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [users, orders, revenue, products, topProducts] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM orders'),
      query("SELECT COALESCE(SUM(total_amount),0) AS total FROM orders WHERE payment_status='paid'"),
      query('SELECT COUNT(*) FROM products'),
      query(
        `SELECT p.name, SUM(oi.quantity) AS total_sold, SUM(oi.price*oi.quantity) AS revenue
         FROM order_items oi JOIN products p ON oi.product_id=p.product_id
         JOIN orders o ON oi.order_id=o.order_id WHERE o.payment_status='paid'
         GROUP BY p.product_id ORDER BY total_sold DESC LIMIT 5`
      ),
    ]);

    // Monthly revenue for last 6 months
    const monthlyRevenue = await query(
      `SELECT DATE_TRUNC('month', created_at) AS month, SUM(total_amount) AS revenue
       FROM orders WHERE payment_status='paid' AND created_at > NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month`
    );

    res.json({
      total_users: parseInt(users.rows[0].count),
      total_orders: parseInt(orders.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
      total_products: parseInt(products.rows[0].count),
      top_products: topProducts.rows,
      monthly_revenue: monthlyRevenue.rows,
    });
  } catch (err) { next(err); }
};

const getVendorAnalytics = async (req, res, next) => {
  try {
    const vendor = await query('SELECT vendor_id FROM vendors WHERE user_id=$1', [req.user.user_id]);
    if (!vendor.rows.length) return res.status(404).json({ message: 'Vendor not found' });
    const vid = vendor.rows[0].vendor_id;

    const [orders, revenue, products, topProducts, monthlyRevenue] = await Promise.all([
      query(`SELECT COUNT(*) FROM orders o JOIN order_items oi ON o.order_id=oi.order_id JOIN products p ON oi.product_id=p.product_id WHERE p.vendor_id=$1`, [vid]),
      query(`SELECT COALESCE(SUM(oi.price*oi.quantity),0) AS total FROM order_items oi JOIN products p ON oi.product_id=p.product_id JOIN orders o ON oi.order_id=o.order_id WHERE p.vendor_id=$1 AND o.payment_status='paid'`, [vid]),
      query('SELECT COUNT(*) FROM products WHERE vendor_id=$1', [vid]),
      query(
        `SELECT p.name, SUM(oi.quantity) AS total_sold, SUM(oi.price*oi.quantity) AS revenue
         FROM order_items oi JOIN products p ON oi.product_id=p.product_id
         JOIN orders o ON oi.order_id=o.order_id
         WHERE p.vendor_id=$1 AND o.payment_status='paid'
         GROUP BY p.product_id ORDER BY total_sold DESC LIMIT 5`,
        [vid]
      ),
      query(
        `SELECT DATE_TRUNC('month', o.created_at) AS month, SUM(oi.price*oi.quantity) AS revenue
         FROM order_items oi JOIN products p ON oi.product_id=p.product_id
         JOIN orders o ON oi.order_id=o.order_id
         WHERE p.vendor_id=$1 AND o.payment_status='paid' AND o.created_at > NOW() - INTERVAL '6 months'
         GROUP BY month ORDER BY month`,
        [vid]
      ),
    ]);

    res.json({
      total_orders: parseInt(orders.rows[0].count),
      total_revenue: parseFloat(revenue.rows[0].total),
      total_products: parseInt(products.rows[0].count),
      top_products: topProducts.rows,
      monthly_revenue: monthlyRevenue.rows,
    });
  } catch (err) { next(err); }
};

module.exports = { getRecommendations, getRecentlyViewed, smartSearch, detectFraud, getAnalytics, getVendorAnalytics };
