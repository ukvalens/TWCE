const { query } = require('../config/db');
const { paginate } = require('../utils/helpers');

const assignDelivery = async (req, res, next) => {
  try {
    const { order_id, delivery_person_id, estimated_time } = req.body;
    const existing = await query('SELECT delivery_id FROM deliveries WHERE order_id=$1', [order_id]);
    if (existing.rows.length) return res.status(409).json({ message: 'Delivery already assigned for this order' });

    const result = await query(
      'INSERT INTO deliveries (order_id, delivery_person_id, estimated_time) VALUES ($1,$2,$3) RETURNING *',
      [order_id, delivery_person_id, estimated_time]
    );
    await query("UPDATE orders SET status='shipped', updated_at=NOW() WHERE order_id=$1", [order_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, location } = req.body;
    const delivery = await query(
      'UPDATE deliveries SET status=$1, delivered_at=CASE WHEN $1=$2 THEN NOW() ELSE delivered_at END WHERE delivery_id=$3 RETURNING *',
      [status, 'delivered', req.params.id]
    );
    if (!delivery.rows.length) return res.status(404).json({ message: 'Delivery not found' });

    // Add tracking entry
    await query('INSERT INTO delivery_tracking (delivery_id, location, status) VALUES ($1,$2,$3)', [req.params.id, location, status]);

    if (status === 'delivered') {
      await query("UPDATE orders SET status='delivered', updated_at=NOW() WHERE order_id=$1", [delivery.rows[0].order_id]);
    }
    res.json(delivery.rows[0]);
  } catch (err) { next(err); }
};

const getDeliveryTracking = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM delivery_tracking WHERE delivery_id=$1 ORDER BY timestamp', [req.params.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getMyDeliveries = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const result = await query(
      `SELECT d.*, o.total_amount, u.full_name AS customer_name, ua.street, ua.city, ua.country
       FROM deliveries d JOIN orders o ON d.order_id=o.order_id
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN user_addresses ua ON o.address_id=ua.address_id
       WHERE d.delivery_person_id=$1 ORDER BY d.estimated_time LIMIT $2 OFFSET $3`,
      [req.user.user_id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

const getAllDeliveries = async (req, res, next) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const result = await query(
      `SELECT d.*, o.total_amount, u.full_name AS customer_name, dp.full_name AS delivery_person
       FROM deliveries d JOIN orders o ON d.order_id=o.order_id
       JOIN users u ON o.user_id=u.user_id
       LEFT JOIN users dp ON d.delivery_person_id=dp.user_id
       ORDER BY d.estimated_time LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const count = await query('SELECT COUNT(*) FROM deliveries');
    res.json({ data: result.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { next(err); }
};

module.exports = { assignDelivery, updateDeliveryStatus, getDeliveryTracking, getMyDeliveries, getAllDeliveries };
