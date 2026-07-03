const { query } = require('../config/db');

const auditLog = (action, tableName) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400 && req.user) {
      try {
        await query(
          `INSERT INTO audit_logs (user_id, action, table_name, ip_address)
           VALUES ($1, $2, $3, $4)`,
          [req.user.user_id, action, tableName, req.ip]
        );
      } catch (err) {
        console.error('Audit log error:', err.message);
      }
    }
  });
  next();
};

module.exports = { auditLog };
