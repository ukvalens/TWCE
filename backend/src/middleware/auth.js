const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT user_id, full_name, email, role_id, status FROM users WHERE user_id = $1',
      [decoded.user_id]
    );
    if (!result.rows.length || result.rows[0].status === 'banned')
      return res.status(401).json({ message: 'User not found or banned' });

    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roleIds) => (req, res, next) => {
  if (!roleIds.includes(req.user.role_id))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

// Role helpers - role IDs match seed data: 1=admin,2=vendor,3=customer,4=support,5=delivery
const isAdmin = authorize(1);
const isVendor = authorize(2);
const isCustomer = authorize(3);
const isSupport = authorize(4);
const isDelivery = authorize(5);
const isAdminOrSupport = authorize(1, 4);
const isAdminOrVendor = authorize(1, 2);

module.exports = { authenticate, authorize, isAdmin, isVendor, isCustomer, isSupport, isDelivery, isAdminOrSupport, isAdminOrVendor };
